import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';

const icon = `${window.location.origin}${ClockImage}`;

export async function getCardButtons (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardButton[]> {
  return [
    {
      icon,
      text: 'Manage time',
      callback: async () => {
        console.log('Manage time');
      }
    },
    {
      icon,
      text: 'Notifications',
      callback: async () => {
        console.log('Notifications');
      }
    },
    {
      icon,
      text: 'Settings',
      callback: async () => {
        console.log('Settings');
      }
    },
    {
      icon,
      text: 'Time spent',
      callback: async () => {
        console.log('Time spent');
      }
    }
  ];
}