import { getTrelloInstance } from '../trello';

export async function getThresholdForTrackings () {
  return (await getTrelloInstance().get('board', 'shared', 'act-timer-auto-timer-threshold-trackings', 30));
}

export async function hasEstimateFeature () {
  return !(await getTrelloInstance().get('board', 'shared', 'act-timer-disable-estimate'));
}

export async function disableEstimateFeature () {
  await getTrelloInstance().set('board', 'shared', 'act-timer-disable-estimate', 1);
}

export async function enableEstimateFeature () {
  await getTrelloInstance().remove('board', 'shared', 'act-timer-disable-estimate');
}