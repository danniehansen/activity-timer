import { Trello } from '../../../types/trello';

export async function notificationsCallback (t: Trello.PowerUp.IFrame) {
  return t.popup({
    title: 'Settings',
    url: './index.html?page=notification-settings',
    height: 72
  });
}