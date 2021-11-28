<template>
  <div class="unauthorized" v-if="!isAuthorized">
    <p>To access history data you need to allow Activity timer to read this data. Click the button below to allow this.</p>
    <UIButton @click="authorize()">Authorize</UIButton>
  </div>

  <div class="authorized" v-else>
    <div class="header">
      <UIDropdown
        v-model="members"
        label="Members"
        placeholder="All"
        :multiple="true"
        :options="memberOptions"
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

    <table>
      <thead>
        <tr>
          <th v-for="headItem in tableHead" :key="headItem.value">{{ headItem.text }}</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="tableRow in tableBody" :key="tableRow.data.id">
          <td v-for="columnItem in tableHead" :key="columnItem.value">{{ tableRow.rowData[columnItem.value] ?? '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getAppKey } from '../../components/settings';
import { getTrelloCard } from '../../components/trello';
import UIButton from '../../components/UIButton.vue';
import UIDropdown, { Option } from '../../components/UIDropdown.vue';
import { Trello } from '../../types/trello';
import { formatMemberName } from '../../utils/formatting';
import { ApiCard } from './ApiCard';

const isAuthorized = ref(false);
const memberOptions = ref<Option[]>();
const members = ref<string[]>([]);
const labels = ref<string[]>([]);
const columns = ref<string[]>([]);
const uniqueLabels = ref<Trello.PowerUp.Label[]>([]);
const defaultColumns = [
  'card.title',
  'card.labels',
  'member.name',
  'time_spent',
  'time_spent_formatted'
];

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
    text: 'Member id',
    value: 'member.id'
  },
  {
    text: 'Member name',
    value: 'member.name'
  },
  {
    text: 'Time spent',
    value: 'time_spent'
  },
  {
    text: 'Time spent - formatted',
    value: 'time_spent_formatted'
  }
]);

let cards: ApiCard[] = [];
const cardsLength = ref(0);

const tableHead = computed<Option[]>(() => {
  return (columns.value.length > 0 ? columns.value : defaultColumns).map<Option>((column) => {
    const columnItem = columnOptions.value.find((col) => col.value === column);

    if (!columnItem) {
      throw new Error('Unrecognized column');
    }

    return columnItem;
  });
});

const filteredCards = computed<ApiCard[]>(() => {
  if (cardsLength.value === 0) {
    return [];
  }

  return cards.filter((card) => {
    if (members.value.length > 0) {
      let memberFound = false;

      members.value.forEach((selectedMember) => {
        if (card.rowData['member.id'].includes(selectedMember)) {
          memberFound = true;
        }
      });

      if (!memberFound) {
        return false;
      }
    }

    return true;
  });
});

const tableBody = computed<ApiCard[]>(() => {
  return filteredCards.value.slice(0, 100);
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
  const token = await getTrelloCard().getRestApi().getToken();
  const board = await getTrelloCard().board('id');

  try {
    const data = await fetch(`https://api.trello.com/1/boards/${board.id}/cards/all?pluginData=true&fields=id,name,desc,labels,pluginData,closed&key=${getAppKey()}&token=${token}&r=${new Date().getTime()}`)
      .then<Trello.PowerUp.Card[]>((res) => res.json());

    cards = data.map<ApiCard>((card) => {
      return new ApiCard(card);
    });

    cardsLength.value = cards.length;

    getUniqueLabels();
  } catch (e) {
    console.log('e:', e);
    try {
      await clearToken();
    } catch (e) {
      // Ignore exceptions in case no token exists
    }

    await trelloTick();
  }
};

const initialize = async () => {
  const board = await getTrelloCard().board('members');

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
  }
};

const clearToken = async () => {
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

const labelOptions = computed<Option[]>(() => {
  return uniqueLabels.value.map<Option>((label) => {
    return {
      text: label.name,
      value: label.id
    };
  });
});

trelloTick().then(() => {
  initialize();
  getTrelloCard().render(trelloTick);
});
</script>

<style lang="scss">
.unauthorized {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.authorized {
  padding: 25px;
}

.header {
  label:first-child {
    margin-top: 0;
  }
}
</style>

<style lang="scss" scoped>
table {
  margin-top: 25px;
}
</style>