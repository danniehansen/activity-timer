import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';
import { Card } from '../../components/card';
import { formatDate, formatMemberName, formatTime } from '../../utils/formatting';
import { Ranges } from '../../components/ranges';
import { Range } from '../../components/range';
import { manageTimeCallback } from './callbacks/ManageTime';
import { notificationsCallback } from './callbacks/Notifications';
import { settingsCallback } from './callbacks/Settings';
import { timeSpentCallback } from './callbacks/TimeSpent';

const icon = `${window.location.origin}${ClockImage}`;

export async function getCardButtons (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardButton[]> {
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