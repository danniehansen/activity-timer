import { Trello } from '../../../types/trello';

export async function settingsCallback(t: Trello.PowerUp.IFrame) {
  return t.popup({
    title: 'Settings',
    url: './index.html?page=member-settings',
    height: 72
  });
}
