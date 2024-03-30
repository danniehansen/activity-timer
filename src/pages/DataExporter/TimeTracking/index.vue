<template>
  <transition name="fade">
    <UILoader v-if="loading" />
  </transition>

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

    <Button label="Authorize" @click="authorize()" />

    <p v-if="rejectedAuth">
      You rejected Activity timer's request for accessing the data. If you
      change your mind you can always click 'Authorize' again.
    </p>
  </div>

  <div
    v-else-if="ready && isAuthorized"
    class="authorized flex flex-column gap-3"
  >
    <div class="flex flex-wrap column-gap-3 row-gap-4">
      <div class="p-float-label">
        <MultiSelect
          v-model="members"
          input-id="f-members"
          :options="memberOptions"
          option-label="text"
          option-value="value"
          placeholder="All"
          class="w-full md:w-14rem"
          :filter="memberOptions.length > 10"
        />
        <label for="f-members">Members</label>
      </div>

      <div class="p-float-label">
        <MultiSelect
          v-model="lists"
          input-id="f-members"
          :options="listOptions"
          option-label="text"
          option-value="value"
          placeholder="All"
          class="w-full md:w-14rem"
          :filter="listOptions.length > 10"
        />
        <label for="f-members">Lists</label>
      </div>

      <div class="p-float-label">
        <MultiSelect
          v-model="labels"
          input-id="f-members"
          :options="labelOptions"
          option-label="text"
          option-value="value"
          placeholder="All"
          class="w-full md:w-14rem"
          :filter="labelOptions.length > 10"
        />
        <label for="f-members">Labels</label>
      </div>

      <div class="p-float-label">
        <MultiSelect
          v-model="columns"
          input-id="f-members"
          :options="columnOptions"
          option-label="text"
          option-value="value"
          placeholder="Default"
          class="w-full md:w-14rem"
          :filter="columnOptions.length > 10"
        />
        <label for="f-members">Columns</label>
      </div>

      <span class="p-float-label">
        <InputText
          id="f-date-from"
          v-model="dateFrom"
          type="date"
          class="p-filled"
        />
        <label for="f-date-from">Date from</label>
      </span>

      <span class="p-float-label">
        <InputText
          id="f-date-to"
          v-model="dateTo"
          type="date"
          class="p-filled"
        />
        <label for="f-date-to">Date to</label>
      </span>

      <div class="p-float-label">
        <Dropdown
          v-model="groupBy"
          input-id="f-group-by"
          :options="groupByOptions"
          option-label="text"
          option-value="value"
          placeholder="No grouping"
          class="w-full md:w-14rem"
          :filter="groupByOptions.length > 10"
          show-clear
        />
        <label for="f-group-by">Group by</label>
      </div>
    </div>

    <DataTable
      v-if="rowDataList.length > 0"
      :value="rowDataList"
      paginator
      :rows="10"
      :rows-per-page-options="[10, 20, 30, 50, 100]"
    >
      <Column
        v-for="column in tableHead"
        :key="column.value"
        :field="column.value"
        :header="column.text"
        :style="columnStyle[column.value]"
        sortable
      />

      <ColumnGroup type="footer">
        <Row v-if="tableHead.length > 1">
          <Column v-if="tableHead.length > 2" :colspan="tableHead.length - 2" />
          <Column :footer="`Total seconds: ${totalTimeSeconds}`" />
          <Column :footer="`Total time: ${totalTimeFormatted}`" />
        </Row>
        <Row v-else>
          <Column
            :footer="`Total time (seconds): ${totalTimeSeconds}. Total time (formatted): ${totalTimeFormatted}`"
          />
        </Row>
      </ColumnGroup>

      <template #paginatorstart>
        <Button type="button" icon="pi pi-refresh" text @click="getData()" />
      </template>

      <template #paginatorend>
        <Button
          type="button"
          :icon="exported ? 'pi pi-check' : 'pi pi-download'"
          text
          @click="exportData()"
        />
      </template>
    </DataTable>

    <p v-else>No cards found with trackings matching your filter</p>
  </div>
</template>

<script setup lang="ts">
import { computed, CSSProperties, ref, watch } from 'vue';
import { getAppKey } from '../../../components/settings';
import {
  clearToken,
  getTrelloCard,
  getTrelloInstance
} from '../../../components/trello';
import { Trello } from '../../../types/trello';
import {
  formatDate,
  formatMemberName,
  formatTime
} from '../../../utils/formatting';
import { ApiCard, ApiCardRowData } from './ApiCard';
import { Ranges } from '../../../components/ranges';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import UILoader from '../../../components/UILoader.vue';
import { setStorage, getStorage } from '../../../utils/local-storage';
import { Option } from '../../../types/dropdown';

interface Settings {
  columns: string[];
}

const isAuthorized = ref(false);
const memberOptions = ref<Option[]>([]);
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
const exported = ref(false);
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
    width: '200px'
  },
  time_formatted: {
    width: '200px'
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

const labelOptions = computed<Option[]>(() => {
  return uniqueLabels.value
    .map<Option>((label) => {
      return {
        text: label.name,
        value: label.id
      };
    })
    .sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
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
  if (exported.value) {
    return;
  }

  const csvConfig = mkConfig({
    fieldSeparator: ',',
    quoteStrings: true,
    decimalSeparator: '.',
    useTextFile: false,
    filename: 'activity-timer-estimates',
    useBom: true,
    columnHeaders: tableHead.value.map((headItem) => {
      return {
        key: headItem.value,
        displayLabel: headItem.text
      };
    }),
    replaceUndefinedWith: ''
  });

  exported.value = true;

  setTimeout(() => {
    exported.value = false;
  }, 1500);

  const csv = generateCsv(csvConfig)(rowDataList.value);
  download(csvConfig)(csv);
};

trelloTick().then(() => {
  initialize();
  getTrelloCard().render(trelloTick);
});
</script>

<style lang="scss" scoped>
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
