import { Trello } from '../types/trello';

export function getShowSettings (t: Trello.PowerUp.IFrame): PromiseLike<void> {
  return t.popup({
    title: 'Settings',
    url: t.signUrl('./index.html', {
      page: 'show-settings'
    }),
    height: 150
  });
}
