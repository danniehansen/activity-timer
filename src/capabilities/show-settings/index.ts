import { Trello } from '../../types/trello';

export function getShowSettings (t: Trello.PowerUp.IFrame): PromiseLike<void> {
  return t.popup({
    title: 'Settings',
    url: './index.html?page=settings',
    height: 150
  });
}
