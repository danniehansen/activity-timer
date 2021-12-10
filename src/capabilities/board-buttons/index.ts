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
        await t.popup({
          title: 'Activity timer',
          items: [
            {
              text: 'Data exporter - Time tracking',
              callback: async (t) => {
                await t.modal({
                  url: t.signUrl('./index.html?page=time'),
                  title: 'Activity timer - Data exporter - Time tracking',
                  fullscreen: true
                });
              }
            },
            {
              text: 'Data exporter - Estimates',
              callback: async (t) => {
                await t.modal({
                  url: t.signUrl('./index.html?page=estimates'),
                  title: 'Activity timer - Data exporter - Estimates',
                  fullscreen: true
                });
              }
            }
          ]
        });
      }
    }
  ];
}
