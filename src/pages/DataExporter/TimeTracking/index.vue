<template>
  <transition name="fade">
    <UILoader v-if="loading" />
  </transition>

  <UIOptroStatus v-if="ready" style="border-radius: 0" />

  <div v-if="isIncognito" class="unauthorized">
    <p>
      It appears that you might be using incognito mode in your browser.
      Unfortunately some internal functionality does not work in Trello that is
      required for this page to work. If you wan't to use the data exporter tool
      you will have to jump out of incognito.
    </p>
  </div>

  <div v-else-if="unrecognizedError" class="unauthorized">
    <p>
      Woops. An unrecognized error occurred. Our system have automatically
      logged it & will be looking into the matter. Please try again later or
      with a different browser.
    </p>
  </div>

  <div v-else-if="!isAuthorized" class="unauthorized">
    <p>
      To access tracking data you need to allow Activity timer to read this
      data. Click the button below to allow this.
    </p>
    <UIButton @click="authorize()">Authorize</UIButton>

    <p v-if="rejectedAuth">
      You rejected Activity timer's request for accessing the data. If you
      change your mind you can always click 'Authorize' again.
    </p>
  </div>

  <div v-else-if="ready && isAuthorized" class="authorized">
    <div v-if="hasSubscription" class="header">
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

        <UIDateInput v-model="dateFrom" label="Date from" />

        <UIDateInput v-model="dateTo" label="Date to" />
      </div>

      <UIDropdown
        v-model="groupBy"
        label="Group by"
        help="No grouping = each time tracking is on a separate row"
        placeholder="No grouping"
        :options="groupByOptions"
      />
    </div>

    <div v-else class="requires-pro">
      <p>
        Filtering in data export is restricted to Pro users only. Free plan can
        only do full exports.
        <a
          :href="`https://www.optro.cloud/app/${powerupId}`"
          target="_blank"
          rel="noreferrer"
          >Read more about the Pro plan here.</a
        >
      </p>
    </div>

    <table v-if="tableBody.length > 0" class="body">
      <thead>
        <tr>
          <th v-for="headItem in tableHead" :key="headItem.value">
            {{ headItem.text }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="tableRow in tableBody" :key="tableRow.id">
          <td
            v-for="columnItem in tableHead"
            :key="columnItem.value"
            :style="columnStyle[columnItem.value] ?? {}"
          >
            {{ tableRow[columnItem.value] ?? '' }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>No cards found with trackings matching your filter</p>

    <div class="footer">
      <div>
        <UIButton @click="exportData()">Export to CSV</UIButton>
        <UIButton @click="getData()">Refresh</UIButton>
      </div>

      <div class="footer__info">
        <span>Total time (seconds): {{ totalTimeSeconds }}</span>
        <span>Total time (formatted): {{ totalTimeFormatted }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, CSSProperties, ref, watch } from 'vue';
import { getAppKey } from '../../../components/settings';
import {
  clearToken,
  getPowerupId,
  getTrelloCard,
  getTrelloInstance
} from '../../../components/trello';
import UIButton from '../../../components/UIButton.vue';
import UIDropdown, { Option } from '../../../components/UIDropdown.vue';
import { Trello } from '../../../types/trello';
import {
  formatDate,
  formatMemberName,
  formatTime
} from '../../../utils/formatting';
import { ApiCard, ApiCardRowData } from './ApiCard';
import UIDateInput from '../../../components/UIDateInput.vue';
import { Ranges } from '../../../components/ranges';
import { ExportToCsv } from 'export-to-csv';
import UILoader from '../../../components/UILoader.vue';
import { getSubscriptionStatus } from '../../../components/optro';
import UIOptroStatus from '../../../components/UIOptroStatus.vue';
import { setStorage, getStorage } from '../../../utils/local-storage';

interface Settings {
  columns: string[];
}

const isAuthorized = ref(false);
const memberOptions = ref<Option[]>();
const members = ref<string[]>([]);
const labels = ref<string[]>([]);
const columns = ref<string[]>([]);
const dateFrom = ref('');
const dateTo = ref('');
const listOptions = ref<Option[]>([]);
const lists = ref<string[]>([]);
const isIncognito = ref(false);
const unrecognizedError = ref(false);
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
const ready = ref(false);
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

const settings = computed<Settings>(() => {
  return {
    columns: columns.value
  };
});

watch(settings, () => {
  setStorage('export-time-tracking', settings.value);
});

const currentSettings = getStorage<Settings>('export-time-tracking');

if (currentSettings?.columns) {
  columns.value = currentSettings.columns;
}

const columnStyle: { [key: keyof ApiCardRowData]: CSSProperties } = {
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
    text: 'Board name',
    value: 'board.name'
  },
  {
    text: 'Board id',
    value: 'board.id'
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
const lastDataFetch = ref(0);

const tableHead = computed<Option[]>(() => {
  const selectedColumns =
    columns.value.length > 0 ? columns.value : defaultColumns;
  return columnOptions.value.filter((column) => {
    return selectedColumns.includes(column.value);
  });
});

const filteredCards = computed<ApiCard[]>(() => {
  if (lastDataFetch.value === 0) {
    return [];
  }

  const dateFromUnix = dateFrom.value
    ? Math.floor(new Date(dateFrom.value + '00:00:00').getTime() / 1000)
    : 0;

  const dateToUnix = dateTo.value
    ? Math.floor(new Date(dateTo.value + ' 23:59:59').getTime() / 1000)
    : 0;

  return cards.filter((card) => {
    let ranges = card.ranges;

    if (dateFromUnix) {
      ranges = ranges.filter(
        (item) => item.start >= dateFromUnix || item.end >= dateFromUnix
      );
    }

    if (dateToUnix) {
      ranges = ranges.filter(
        (item) => item.start <= dateToUnix || item.end <= dateToUnix
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

let rowCounter = 0;
const rowDataList = computed<ApiCardRowData[]>(() => {
  const rowData: ApiCardRowData[] = [];

  const dateFromUnix = dateFrom.value
    ? Math.floor(new Date(dateFrom.value + ' 00:00:00').getTime() / 1000)
    : 0;

  const dateToUnix = dateTo.value
    ? Math.floor(new Date(dateTo.value + ' 23:59:59').getTime() / 1000)
    : 0;

  filteredCards.value.forEach((card) => {
    const rowDataItem = card.rowData.value;
    let ranges = card.ranges;

    if (dateFromUnix) {
      ranges = ranges.filter(
        (item) => item.start >= dateFromUnix || item.end >= dateFromUnix
      );
    }

    if (dateToUnix) {
      ranges = ranges.filter(
        (item) => item.start <= dateToUnix || item.end <= dateToUnix
      );
    }

    if (members.value.length > 0) {
      ranges = ranges.filter((item) => members.value.includes(item.memberId));
    }

    if (ranges.timeSpent > 0) {
      const membersInrange = ranges.items
        .map((range) => range.memberId)
        .filter((value, index, self) => {
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
        if (carry === null || item.end > carry) {
          carry = item.end;
        }

        return carry;
      }, null);

      switch (groupBy.value) {
        case 'card':
          if (timeSpent > 0) {
            rowCounter++;
            rowData.push({
              ...rowDataItem,
              id: rowCounter,
              'member.id': membersInrange.join(', '),
              'member.name': membersInrange
                .map((memberId) => formatMemberName(memberById[memberId]))
                .join(', '),
              start_datetime: furthestBack
                ? formatDate(new Date(furthestBack * 1000))
                : 'N/A',
              end_datetime: furthestAhead
                ? formatDate(new Date(furthestAhead * 1000))
                : 'N/A',
              time_seconds: timeSpent,
              time_formatted: formatTime(timeSpent, true)
            });
          }
          break;

        case 'card_and_member':
          ranges.items
            .map((range) => range.memberId)
            .filter((value, index, self) => {
              return self.indexOf(value) === index;
            })
            .forEach((memberId) => {
              let ranges = card.ranges;

              if (dateFromUnix) {
                ranges = new Ranges(
                  card.data.id,
                  ranges.items.filter(
                    (item) =>
                      item.start >= dateFromUnix || item.end >= dateFromUnix
                  )
                );
              }

              if (dateToUnix) {
                ranges = new Ranges(
                  card.data.id,
                  ranges.items.filter(
                    (item) => item.start <= dateToUnix || item.end <= dateToUnix
                  )
                );
              }

              furthestBack = ranges.items.reduce<number | null>(
                (carry, item) => {
                  if (carry === null || item.start < carry) {
                    carry = item.start;
                  }

                  return carry;
                },
                null
              );

              furthestAhead = ranges.items.reduce<number | null>(
                (carry, item) => {
                  if (carry === null || item.end > carry) {
                    carry = item.end;
                  }

                  return carry;
                },
                null
              );

              const timeSpent = ranges.items
                .filter((item) => item.memberId === memberId)
                .reduce((a, b) => a + b.diff, 0);

              if (timeSpent > 0) {
                rowCounter++;
                rowData.push({
                  ...rowDataItem,
                  id: rowCounter,
                  'member.id': memberId,
                  'member.name': formatMemberName(memberById[memberId]),
                  start_datetime: furthestBack
                    ? formatDate(new Date(furthestBack * 1000))
                    : 'N/A',
                  end_datetime: furthestAhead
                    ? formatDate(new Date(furthestAhead * 1000))
                    : 'N/A',
                  time_seconds: timeSpent,
                  time_formatted: formatTime(timeSpent, true)
                });
              }
            });
          break;

        default:
          ranges.items.forEach((range) => {
            if (range.diff > 0) {
              rowCounter++;
              rowData.push({
                ...rowDataItem,
                id: rowCounter,
                'member.id': range.memberId,
                'member.name': formatMemberName(memberById[range.memberId]),
                start_datetime: furthestBack
                  ? formatDate(new Date(range.start * 1000))
                  : 'N/A',
                end_datetime: furthestAhead
                  ? formatDate(new Date(range.end * 1000))
                  : 'N/A',
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

async function trelloTick() {
  try {
    isAuthorized.value = await getTrelloCard().getRestApi().isAuthorized();
  } catch (e) {
    if (e instanceof Error && e.name === 'restApi::ApiNotConfiguredError') {
      isIncognito.value = true;
    } else {
      unrecognizedError.value = true;
      throw e;
    }
  }
}

function getUniqueLabels() {
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

async function getData() {
  const getDataStart = Date.now();

  loading.value = true;

  const token = await getTrelloCard().getRestApi().getToken();
  const board = await getTrelloInstance().board('id');

  try {
    const data = await fetch(
      `https://api.trello.com/1/boards/${
        board.id
      }/cards/all?pluginData=true&fields=id,idList,name,desc,labels,idBoard,pluginData,closed&key=${getAppKey()}&token=${token}&r=${new Date().getTime()}`
    ).then<Trello.PowerUp.Card[]>((res) => res.json());

    const boardData = await fetch(
      `https://api.trello.com/1/boards/${
        board.id
      }?fields=name&key=${getAppKey()}&token=${token}&r=${new Date().getTime()}`
    ).then<Trello.PowerUp.Board>((res) => res.json());

    cards = data.map<ApiCard>((card) => {
      return new ApiCard(boardData, card, listById, memberById, members);
    });

    lastDataFetch.value = Date.now();

    getUniqueLabels();
  } catch (e) {
    try {
      await clearToken();
    } catch (e) {
      // Ignore exceptions in case no token exists
    }

    await getTrelloCard().getRestApi().clearToken();

    await trelloTick();
  }

  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(1500, Date.now() - getDataStart))
  );

  loading.value = false;
  ready.value = true;
}

async function initialize() {
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

  listOptions.value = (
    await getTrelloInstance().lists('id', 'name')
  ).map<Option>((list) => {
    listById[list.id] = list;

    return {
      text: list.name,
      value: list.id
    };
  });

  memberOptions.value = board.members
    .sort((a, b) => {
      const nameA = (a.fullName ?? '').toUpperCase();
      const nameB = (b.fullName ?? '').toUpperCase();

      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      return 0;
    })
    .map<Option>((member) => {
      return {
        value: member.id,
        text: formatMemberName(member)
      };
    });

  if (isAuthorized.value) {
    await getData();
  } else {
    ready.value = true;
    loading.value = false;
  }
}

async function authorize() {
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
}

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
    margin: 0 0 0 15px;

    &:first-child {
      margin-left: 0;
    }
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
