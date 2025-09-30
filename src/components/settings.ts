import { getTrelloInstance } from './trello';

export async function getThresholdForTrackings() {
  return await getTrelloInstance().get(
    'board',
    'shared',
    'act-timer-auto-timer-threshold-trackings',
    30
  );
}

export async function setThresholdForTrackings(threshold: number) {
  await getTrelloInstance().set(
    'board',
    'shared',
    'act-timer-auto-timer-threshold-trackings',
    threshold
  );
}

export async function hasEstimateFeature() {
  return !(await getTrelloInstance().get(
    'board',
    'shared',
    'act-timer-disable-estimate'
  ));
}

export async function disableEstimateFeature() {
  await getTrelloInstance().set(
    'board',
    'shared',
    'act-timer-disable-estimate',
    1
  );
}

export async function enableEstimateFeature() {
  await getTrelloInstance().remove(
    'board',
    'shared',
    'act-timer-disable-estimate'
  );
}

export async function hasSettingStopOnMove() {
  return (
    (await getTrelloInstance().get(
      'member',
      'private',
      'act-timer-personal-settings',
      1
    )) === 1
  );
}

export async function setSettingStopOnMove(value: boolean) {
  await getTrelloInstance().set(
    'member',
    'private',
    'act-timer-personal-settings',
    value ? 1 : 0
  );
}

export function getAppName() {
  if (typeof import.meta.env.VITE_APP_NAME !== 'string') {
    throw new Error('VITE_APP_NAME unavailable');
  }

  return import.meta.env.VITE_APP_NAME;
}

export function getAppKey() {
  if (typeof import.meta.env.VITE_APP_KEY !== 'string') {
    throw new Error('VITE_APP_KEY unavailable');
  }

  return import.meta.env.VITE_APP_KEY;
}

export function getApiHost() {
  if (typeof import.meta.env.VITE_API_HOST !== 'string') {
    return undefined;
  }

  return import.meta.env.VITE_API_HOST;
}

export function getWebsocket() {
  if (typeof import.meta.env.VITE_WEBSOCKET !== 'string') {
    return undefined;
  }

  return import.meta.env.VITE_WEBSOCKET;
}

// Calendar settings
export interface CalendarSettings {
  weekStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
  businessHoursStart: number; // 0-23
  businessHoursEnd: number; // 0-23
}

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const settings = await getTrelloInstance().get<CalendarSettings>(
    'member',
    'private',
    'act-timer-calendar-settings'
  );

  return {
    weekStartDay: settings?.weekStartDay ?? 1,
    businessHoursStart: settings?.businessHoursStart ?? 8,
    businessHoursEnd: settings?.businessHoursEnd ?? 18
  };
}

export async function setCalendarSettings(
  settings: CalendarSettings
): Promise<void> {
  await getTrelloInstance().set(
    'member',
    'private',
    'act-timer-calendar-settings',
    settings
  );
}
