import { getTrelloInstance } from '../trello';

export async function getThresholdForTrackings () {
  return (await getTrelloInstance().get('board', 'shared', 'act-timer-auto-timer-threshold-trackings', 30));
}