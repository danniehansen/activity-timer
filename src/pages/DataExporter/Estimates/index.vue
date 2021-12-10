<template>
  <transition name="fade">
    <UILoader v-if="loading" />
  </transition>

  <UIOptroStatus v-if="!loading" style="border-radius: 0;" />

  <div class="unauthorized" v-if="!loading && !isAuthorized">
    <p>To access estimates data you need to allow Activity timer to read this data. Click the button below to allow this.</p>
    <UIButton @click="authorize()">Authorize</UIButton>
  </div>

  <div class="authorized" v-else-if="!loading && isAuthorized">
    <div class="header" v-if="hasSubscription">
      <div class="header__filters">
        <UIDropdown
          v-model="members"
          label="Members"
          placeholder="All"
          :multiple="true"
          :options="memberOptions"
        />

        <UIDropdown
          v-model="lists"
          label="Lists"
          placeholder="All"
          :multiple="true"
          :options="listOptions"
        />

        <UIDropdown
          v-model="labels"
          label="Labels"
          placeholder="All"
          :multiple="true"
          :options="labelOptions"
        />

        <UIDropdown
          v-model="columns"
          label="Columns"
          placeholder="Default"
          :multiple="true"
          :options="columnOptions"
        />
      </div>

      <UICheckbox
        id="group-by-card"
        v-model="groupByCard"
        label="Group by card"
      />
    </div>

    <div class="unauthorized" v-else>
      <p>Filtering in data export is restricted to Pro users only. Free plan can only do full exports. <a :href="`https://www.optro.cloud/app/${powerupId}`" target="_blank" rel="noreferrer">Read more about the Pro plan here.</a></p>
    </div>

    <table class="body" v-if="tableBody.length > 0">
      <thead>
        <tr>
          <th v-for="headItem in tableHead" :key="headItem.value">{{ headItem.text }}</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="tableRow in tableBody" :key="tableRow['card.id']">
          <td v-for="columnItem in tableHead" :key="columnItem.value" :style="columnStyle[columnItem.value] ?? {}">
            {{ tableRow[columnItem.value] ?? '' }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>No cards found with estimates matching your filter</p>

    <div class="footer">
      <UIButton @click="exportData()">Export to CSV</UIButton>

      <div class="footer__info">
        <span>Total estimate (seconds): {{ totalTimeSeconds }}</span>
        <span>Total estimate (formatted): {{ totalTimeFormatted }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getAppKey } from '../../../components/settings';
import { getPowerupId, getTrelloCard, getTrelloInstance } from '../../../components/trello';
import UIButton from '../../../components/UIButton.vue';
import UIDropdown, { Option } from '../../../components/UIDropdown.vue';
import { Trello } from '../../../types/trello';
import { formatMemberName, formatTime } from '../../../utils/formatting';
import { ApiCard, ApiCardRowData } from '../TimeTracking/ApiCard';
import { ExportToCsv } from 'export-to-csv';
import UILoader from '../../../components/UILoader.vue';
import { getSubscriptionStatus } from '../../../components/optro';
import UIOptroStatus from '../../../components/UIOptroStatus.vue';
import { Estimates } from '../../../components/estimates';
import UICheckbox from '../../../components/UICheckbox.vue';

const isAuthorized = ref(false);
const memberOptions = ref<Option[]>();
const members = ref<string[]>([]);
const labels = ref<string[]>([]);
const columns = ref<string[]>([]);
const listOptions = ref<Option[]>([]);
const lists = ref<string[]>([]);
const groupByCard = ref(false);
const loading = ref(true);
const hasSubscription = ref(false);
const uniqueLabels = ref<Trello.PowerUp.Label[]>([]);
const defaultColumns: (keyof ApiCardRowData)[] = [
  'card.title',
  'card.labels',
  'member.name',
  'estimate_seconds',
  'estimate_formatted'
];

const powerupId = getPowerupId();

const memberById: {
  [key: string]: Trello.PowerUp.Member;
} = {};

const listById: {
  [key: string]: Trello.PowerUp.List;
} = {};

// TODO: Find CSS.Properties types package
const columnStyle: { [key: keyof ApiCardRowData]: any } = {
  'card.description': {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  estimate_seconds: {
    width: '135px'
  },
  estimate_formatted: {
    width: '135px'
  }
};

const columnOptions = ref<Option[]>([
  {
    text: 'Card id',
    value: 'card.id'
  },
  {
    text: 'Card title',
    value: 'card.title'
  },
  {
    text: 'Card description',
    value: 'card.description'
  },
  {
    text: 'Card labels',
    value: 'card.labels'
  },
  {
    text: 'List id',
    value: 'list.id'
  },
  {
    text: 'List name',
    value: 'list.name'
  },
  {
    text: 'Member id(s)',
    value: 'member.id'
  },
  {
    text: 'Member name(s)',
    value: 'member.name'
  },
  {
    text: 'Estimate (seconds)',
    value: 'estimate_seconds'
  },
  {
    text: 'Estimate (formatted)',
    value: 'estimate_formatted'
  }
]);

let cards: ApiCard[] = [];
const cardsLength = ref(0);

const tableHead = computed<Option[]>(() => {
  const selectedColumns = (columns.value.length > 0 ? columns.value : defaultColumns);
  return columnOptions.value.filter((column) => {
    return selectedColumns.includes(column.value);
  });
});

const filteredCards = computed<ApiCard[]>(() => {
  if (cardsLength.value === 0) {
    return [];
  }

  return cards.filter((card) => {
    const estimates = card.estimates;

    if (labels.value.length > 0) {
      let labelFound = false;

      labels.value.forEach((selectedLabel) => {
        if (card.data.labels.find((label) => label.id === selectedLabel)) {
          labelFound = true;
        }
      });

      if (!labelFound) {
        return false;
      }
    }

    if (lists.value.length > 0) {
      let listFound = false;

      lists.value.forEach((selectedList) => {
        if (card.data.idList === selectedList) {
          listFound = true;
        }
      });

      if (!listFound) {
        return false;
      }
    }

    return estimates.totalEstimate > 0;
  });
});

const rowDataList = computed<ApiCardRowData[]>(() => {
  const rowData: ApiCardRowData[] = [];

  filteredCards.value.forEach((card) => {
    const rowDataItem = card.rowData.value;

    let estimates = card.estimates;

    if (members.value.length > 0) {
      estimates = new Estimates(
        card.data.id,
        card.estimates.items.filter((item) => members.value.includes(item.memberId))
      );
    }

    const totalEstimate = estimates.totalEstimate;

    if (totalEstimate > 0) {
      const membersInEstimates = estimates.items.map((item) => item.memberId).filter((value, index, self) => {
        return self.indexOf(value) === index;
      });

      if (groupByCard.value) {
        rowData.push({
          ...rowDataItem,
          'member.id': membersInEstimates.join(', '),
          'member.name': membersInEstimates.map((memberId) => formatMemberName(memberById[memberId])).join(', '),
          time_seconds: totalEstimate,
          time_formatted: formatTime(totalEstimate, true)
        });
      } else {
        estimates.items.forEach((item) => {
          if (item.time > 0) {
            rowData.push({
              ...rowDataItem,
              'member.id': item.memberId,
              'member.name': formatMemberName(memberById[item.memberId]),
              estimate_seconds: item.time,
              estimate_formatted: formatTime(item.time, true)
            });
          }
        });
      }
    }
  });

  return rowData;
});

const totalTimeSeconds = computed(() => {
  return rowDataList.value.reduce((a, b) => a + b.estimate_seconds, 0);
});

const totalTimeFormatted = computed(() => {
  return formatTime(totalTimeSeconds.value, true);
});

const tableBody = computed<ApiCardRowData[]>(() => {
  return rowDataList.value.slice(0, 100);
});

const labelOptions = computed<Option[]>(() => {
  return uniqueLabels.value.map<Option>((label) => {
    return {
      text: label.name,
      value: label.id
    };
  });
});

async function trelloTick () {
  isAuthorized.value = await getTrelloCard().getRestApi().isAuthorized();
}

function getUniqueLabels () {
  const newLabels: Trello.PowerUp.Label[] = [];

  cards.forEach((card) => {
    if (card.data.labels.length > 0) {
      card.data.labels.forEach((label) => {
        if (!newLabels.find((labelItem) => labelItem.id === label.id)) {
          newLabels.push(label);
        }
      });
    }
  });

  uniqueLabels.value = newLabels;
}

async function getData () {
  const getDataStart = Date.now();

  loading.value = true;

  const token = await getTrelloCard().getRestApi().getToken();
  const board = await getTrelloInstance().board('id');

  try {
    const data = await fetch(`https://api.trello.com/1/boards/${board.id}/cards/all?pluginData=true&fields=id,idList,name,desc,labels,pluginData,closed&key=${getAppKey()}&token=${token}&r=${new Date().getTime()}`)
      .then<Trello.PowerUp.Card[]>((res) => res.json());

    cards = data
      // Remove cards which has been archived
      .filter((card) => !card.closed)
      .map<ApiCard>((card) => {
        return new ApiCard(card, listById, memberById, members);
      });

    cardsLength.value = cards.length;

    getUniqueLabels();
  } catch (e) {
    try {
      await clearToken();
    } catch (e) {
      // Ignore exceptions in case no token exists
    }

    await trelloTick();
  }

  await new Promise((resolve) => setTimeout(resolve, Math.min(1500, Date.now() - getDataStart)));

  loading.value = false;
};

async function initialize () {
  const board = await getTrelloInstance().board('members');

  // Get the initial subscription status
  hasSubscription.value = await getSubscriptionStatus();

  // Re-fresh subscription status every 5 minute
  setInterval(async () => {
    hasSubscription.value = await getSubscriptionStatus();
  }, 60 * 1000 * 5);

  board.members.forEach((member) => {
    memberById[member.id] = member;
  });

  listOptions.value = (await getTrelloInstance().lists('id', 'name')).map<Option>((list) => {
    listById[list.id] = list;

    return {
      text: list.name,
      value: list.id
    };
  });

  memberOptions.value = board.members.sort((a, b) => {
    const nameA = (a.fullName ?? '').toUpperCase();
    const nameB = (b.fullName ?? '').toUpperCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    return 0;
  }).map<Option>((member) => {
    return {
      value: member.id,
      text: formatMemberName(member)
    };
  });

  if (isAuthorized.value) {
    await getData();
  } else {
    loading.value = false;
  }
};

async function clearToken () {
  try {
    await getTrelloCard().getRestApi().clearToken();
  } catch (e) {
    // Ignore exceptions in case no token exists
  }
};

const authorize = async () => {
  await clearToken();

  await getTrelloCard().getRestApi().authorize({
    scope: 'read,write,account',
    expiration: 'never'
  });

  await trelloTick();

  await getData();
};

const exportData = () => {
  const data: Array<Array<string>> = [];

  const csvExporter = new ExportToCsv({
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true,
    useTextFile: false,
    filename: 'activity-timer-estimates',
    useBom: true
  });

  data.push(
    tableHead.value.map((headItem) => {
      return headItem.text;
    })
  );

  rowDataList.value.forEach((rowData) => {
    const row: Array<string> = [];

    tableHead.value.forEach((headItem) => {
      row.push((rowData[headItem.value] ?? '').toString());
    });

    data.push(row);
  });

  csvExporter.generateCsv(data);
};

trelloTick().then(() => {
  initialize();
  getTrelloCard().render(trelloTick);
});
</script>

<style lang="scss" scoped>
.unauthorized {
  text-align: center;

  p {
    margin-top: 0;
  }
}

.authorized {
  padding: 25px;
  padding-bottom: 62px;
}

.header {
  &__filters {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    label:first-child {
      margin-top: 0;
    }

    .form-element {
      margin: 0 15px 0 0;

      &:last-child {
        margin-right: 0;
      }
    }
  }

  .form-element {
    width: 200px;
    flex-grow: 0;
    flex-shrink: 1;
    min-width: 200px;
  }
}

table {
  margin-top: 25px;
}

.footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  border-top: 2px solid #dfe1e6;
  padding: 14px;
  background-color: #fff;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;

  button {
    margin: 0;
  }

  span {
    margin-left: 15px;

    &:first-child {
      margin-left: 0;
    }
  }
}

p {
  margin: 25px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>