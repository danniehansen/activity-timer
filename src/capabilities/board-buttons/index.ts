import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';

const icon = `${window.location.origin}${ClockImage}`;

export async function getBoardButtons (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.BoardButtonCallback[]> {
  return [
    {
      icon: {
        light: icon,
        dark: icon
      },
      text: 'Activity timer',
      callback: async (t) => {
        await t.modal({
          url: t.signUrl('./index.html?page=history'),
          title: 'Activity timer',
          fullscreen: true
        });
      }
    }
  ];
}
