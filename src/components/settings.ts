import { getTrelloInstance } from './trello';

export async function getThresholdForTrackings () {
  return (await getTrelloInstance().get('board', 'shared', 'act-timer-auto-timer-threshold-trackings', 30));
}

export async function setThresholdForTrackings (threshold: number) {
  await getTrelloInstance().set('board', 'shared', 'act-timer-auto-timer-threshold-trackings', threshold);
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

export async function hasSettingStopOnMove () {
  return (await getTrelloInstance().get('member', 'private', 'act-timer-personal-settings', 1)) === 1;
}

export async function setSettingStopOnMove (value: boolean) {
  await getTrelloInstance().set('member', 'private', 'act-timer-personal-settings', value ? 1 : 0);
}

export function getAppName () {
  if (typeof import.meta.env.VITE_APP_NAME !== 'string') {
    throw new Error('VITE_APP_NAME unavailable');
  }

  return import.meta.env.VITE_APP_NAME;
}

export function getAppKey () {
  if (typeof import.meta.env.VITE_APP_KEY !== 'string') {
    throw new Error('VITE_APP_KEY unavailable');
  }

  return import.meta.env.VITE_APP_KEY;
}

export function getApiHost () {
  if (typeof import.meta.env.VITE_API_HOST !== 'string') {
    return undefined;
  }

  return import.meta.env.VITE_API_HOST;
}

export function getWebsocket () {
  if (typeof import.meta.env.VITE_WEBSOCKET !== 'string') {
    return undefined;
  }

  return import.meta.env.VITE_WEBSOCKET;
}