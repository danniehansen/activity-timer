import { getTrelloInstance } from '../trello';

export async function hasAutoTimer () {
  return !!(await getTrelloInstance().get('board', 'shared', 'act-timer-auto-timer'));
}

export async function disableAutoTimer () {
  await getTrelloInstance().set('board', 'shared', 'act-timer-auto-timer', 0);
}

export async function enableAutoTimer () {
  await getTrelloInstance().set('board', 'shared', 'act-timer-auto-timer', 1);
}

export async function setAutoTimerListId (listId: string) {
  await getTrelloInstance().set('board', 'shared', 'act-timer-auto-timer-list-id', listId);
}

export async function getAutoTimerListId () {
  return await getTrelloInstance().get('board', 'shared', 'act-timer-auto-timer-list-id', '');
}