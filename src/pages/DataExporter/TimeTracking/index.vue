<template>
  <transition name="fade">
    <UILoader v-if="loading" />
  </transition>

  <UIOptroStatus v-if="!loading" style="border-radius: 0;" />

  <div class="unauthorized" v-if="!loading && !isAuthorized">
    <p>To access tracking data you need to allow Activity timer to read this data. Click the button below to allow this.</p>
    <UIButton @click="authorize()">Authorize</UIButton>

    <p v-if="rejectedAuth">You rejected Activity timer's request for accessing the data. If you change your mind you can always click 'Authorize' again.</p>
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

        <UIDateInput
          v-model="dateFrom"
          label="Date from"
        />

        <UIDateInput
          v-model="dateTo"
          label="Date to"
        />
      </div>

      <UIDropdown
        v-model="groupBy"
        label="Group by"
        help="No grouping = each time tracking is on a separate row"
        placeholder="No grouping"
        :options="groupByOptions"
      />
    </div>

    <div class="requires-pro" v-else>
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

    <p v-else>No cards found with trackings matching your filter</p>

    <div class="footer">
      <UIButton @click="exportData()">Export to CSV</UIButton>

      <div class="footer__info">
        <span>Total time (seconds): {{ totalTimeSeconds }}</span>
        <span>Total time (formatted): {{ totalTimeFormatted }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getAppKey } from '../../../components/settings';
import { clearToken, getPowerupId, getTrelloCard, getTrelloInstance } from '../../../components/trello';
import UIButton from '../../../components/UIButton.vue';
import UIDropdown, { Option } from '../../../components/UIDropdown.vue';
import { Trello } from '../../../types/trello';
import { formatDate, formatMemberName, formatTime } from '../../../utils/formatting';
import { ApiCard, ApiCardRowData } from './ApiCard';
import UIDateInput from '../../../components/UIDateInput.vue';
import { Ranges } from '../../../components/ranges';
import { ExportToCsv } from 'export-to-csv';
import UILoader from '../../../components/UILoader.vue';
import { getSubscriptionStatus } from '../../../components/optro';
import UIOptroStatus from '../../../components/UIOptroStatus.vue';

const isAuthorized = ref(false);
const memberOptions = ref<Option[]>();
const members = ref<string[]>([]);
const labels = ref<string[]>([]);
const columns = ref<string[]>([]);
const dateFrom = ref('');
const dateTo = ref('');
const listOptions = ref<Option[]>([]);
const lists = ref<string[]>([]);
const rejectedAuth = ref(false);
const groupByOptions = ref<Option[]>([
  {
    text: 'Card',
    value: 'card'
  },
  {
    text: 'Card & member',
    value: 'card_and_member'
  }
]);
const groupBy = ref<'card' | 'card_and_member' | undefined>();
const loading = ref(true);
const hasSubscription = ref(false);
const uniqueLabels = ref<Trello.PowerUp.Label[]>([]);
const defaultColumns: (keyof ApiCardRowData)[] = [
  'card.title',
  'card.labels',
  'member.name',
  'start_datetime',
  'end_datetime',
  'time_seconds',
  'time_formatted'
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
  time_seconds: {
    width: '135px'
  },
  time_formatted: {
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
    text: 'Start datetime',
    value: 'start_datetime'
  },
  {
    text: 'End datetime',
    value: 'end_datetime'
  },
  {
    text: 'Time (seconds)',
    value: 'time_seconds'
  },
  {
    text: 'Time (formatted)',
    value: 'time_formatted'
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

  const dateFromUnix = (dateFrom.value ? Math.floor(new Date(dateFrom.value).getTime() / 1000) : 0);
  const dateToUnix = (dateTo.value ? Math.floor(setTimeMidnight(new Date(dateTo.value)).getTime() / 1000) : 0);

  return cards.filter((card) => {
    let ranges = card.ranges;

    if (dateFromUnix) {
      ranges = new Ranges(
        card.data.id,
        card.ranges.items.filter((item) => item.start >= dateFromUnix || item.end >= dateFromUnix)
      );
    }

    if (dateToUnix) {
      ranges = new Ranges(
        card.data.id,
        card.ranges.items.filter((item) => item.start <= dateToUnix || item.end <= dateToUnix)
      );
    }

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

    return ranges.timeSpent > 0;
  });
});

const rowDataList = computed<ApiCardRowData[]>(() => {
  const rowData: ApiCardRowData[] = [];

  filteredCards.value.forEach((card) => {
    const rowDataItem = card.rowData.value;

    const dateFromUnix = (dateFrom.value ? Math.floor(new Date(dateFrom.value).getTime() / 1000) : 0);
    const dateToUnix = (dateTo.value ? Math.floor(setTimeMidnight(new Date(dateTo.value)).getTime() / 1000) : 0);

    let ranges = card.ranges;

    if (dateFromUnix) {
      ranges = new Ranges(
        card.data.id,
        card.ranges.items.filter((item) => item.start >= dateFromUnix || item.end >= dateFromUnix)
      );
    }

    if (dateToUnix) {
      ranges = new Ranges(
        card.data.id,
        card.ranges.items.filter((item) => item.start <= dateToUnix || item.end <= dateToUnix)
      );
    }

    if (members.value.length > 0) {
      ranges = new Ranges(
        card.data.id,
        card.ranges.items.filter((item) => members.value.includes(item.memberId))
      );
    }

    if (ranges.timeSpent > 0) {
      const membersInrange = ranges.items.map((range) => range.memberId).filter((value, index, self) => {
        return self.indexOf(value) === index;
      });

      const timeSpent = ranges.items.reduce((a, b) => a + b.diff, 0);

      let furthestBack = ranges.items.reduce<number | null>((carry, item) => {
        if (carry === null || item.start < carry) {
          carry = item.start;
        }

        return carry;
      }, null);

      let furthestAhead = ranges.items.reduce<number | null>((carry, item) => {
        if (carry === null || item.start > carry) {
          carry = item.end;
        }

        return carry;
      }, null);

      switch (groupBy.value) {
      case 'card':
        if (timeSpent > 0) {
          rowData.push({
            ...rowDataItem,
            'member.id': membersInrange.join(', '),
            'member.name': membersInrange.map((memberId) => formatMemberName(memberById[memberId])).join(', '),
            start_datetime: (furthestBack ? formatDate(new Date(furthestBack * 1000)) : 'N/A'),
            end_datetime: (furthestAhead ? formatDate(new Date(furthestAhead * 1000)) : 'N/A'),
            time_seconds: timeSpent,
            time_formatted: formatTime(timeSpent, true)
          });
        }
        break;

      case 'card_and_member':
        ranges.items.map((range) => range.memberId).filter((value, index, self) => {
          return self.indexOf(value) === index;
        }).forEach((memberId) => {
          let ranges = card.ranges;

          if (dateFromUnix) {
            ranges = new Ranges(
              card.data.id,
              card.ranges.items.filter((item) => item.start >= dateFromUnix || item.end >= dateFromUnix)
            );
          }

          if (dateToUnix) {
            ranges = new Ranges(
              card.data.id,
              card.ranges.items.filter((item) => item.start <= dateToUnix || item.end <= dateToUnix)
            );
          }

          furthestBack = ranges.items.reduce<number | null>((carry, item) => {
            if (carry === null || item.start < carry) {
              carry = item.start;
            }

            return carry;
          }, null);

          furthestAhead = ranges.items.reduce<number | null>((carry, item) => {
            if (carry === null || item.start > carry) {
              carry = item.end;
            }

            return carry;
          }, null);

          const timeSpent = ranges.items.filter((item) => item.memberId === memberId).reduce((a, b) => a + b.diff, 0);

          if (timeSpent > 0) {
            rowData.push({
              ...rowDataItem,
              'member.id': memberId,
              'member.name': formatMemberName(memberById[memberId]),
              start_datetime: (furthestBack ? formatDate(new Date(furthestBack * 1000)) : 'N/A'),
              end_datetime: (furthestAhead ? formatDate(new Date(furthestAhead * 1000)) : 'N/A'),
              time_seconds: timeSpent,
              time_formatted: formatTime(timeSpent, true)
            });
          }
        });
        break;

      default:
        ranges.items.forEach((range) => {
          if (range.diff > 0) {
            rowData.push({
              ...rowDataItem,
              'member.id': range.memberId,
              'member.name': formatMemberName(memberById[range.memberId]),
              start_datetime: (furthestBack ? formatDate(new Date(range.start * 1000)) : 'N/A'),
              end_datetime: (furthestAhead ? formatDate(new Date(range.end * 1000)) : 'N/A'),
              time_seconds: range.diff,
              time_formatted: formatTime(range.diff, true)
            });
          }
        });
      }
    }
  });

  return rowData;
});

const totalTimeSeconds = computed(() => {
  return rowDataList.value.reduce((a, b) => a + b.time_seconds, 0);
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

function setTimeMidnight (date: Date) {
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(59);
  return date;
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

    cards = data.map<ApiCard>((card) => {
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

async function authorize () {
  rejectedAuth.value = false;

  try {
    await getTrelloCard().getRestApi().authorize({
      scope: 'read',
      expiration: 'never'
    });

    await trelloTick();
    await getData();
  } catch (e) {
    if (e instanceof Error && e.name === 'restApi::AuthDeniedError') {
      rejectedAuth.value = true;
      return;
    }

    await clearToken();
    throw e;
  }
};

const exportData = () => {
  const data: Array<Array<string>> = [];

  const csvExporter = new ExportToCsv({
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true,
    useTextFile: false,
    filename: 'activity-timer-trackings',
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
.requires-pro {
  text-align: center;

  p {
    margin-top: 0;
  }
}

.unauthorized {
  max-width: 475px;
  text-align: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
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