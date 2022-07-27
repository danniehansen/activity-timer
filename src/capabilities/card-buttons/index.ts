import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';
import { manageTimeCallback } from './callbacks/ManageTime';
import { notificationsCallback } from './callbacks/Notifications';
import { settingsCallback } from './callbacks/Settings';
import { timeSpentCallback } from './callbacks/TimeSpent';
import { isVisible } from '../../utils/visibility';

const icon = `${window.location.origin}${ClockImage}`;

export async function getCardButtons(): Promise<Trello.PowerUp.CardButton[]> {
  const visible = await isVisible();

  if (!visible) {
    return [];
  }

  return [
    {
      icon,
      text: 'Manage time',
      condition: 'edit',
      callback: manageTimeCallback
    },
    {
      icon,
      text: 'Notifications',
      callback: notificationsCallback
    },
    {
      icon,
      text: 'Settings',
      condition: 'edit',
      callback: settingsCallback
    },
    {
      icon,
      text: 'Time spent',
      callback: timeSpentCallback
    }
  ];
}
