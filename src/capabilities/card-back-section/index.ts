import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';

export async function getCardBackSection (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardBackSection> {
  return {
    title: 'Activity timer',
    icon: `${window.location.origin}${ClockImage}`,
    content: {
      type: 'iframe',
      url: t.signUrl('./index.html', {
        page: 'card-back-section'
      }),
      height: 50
    }
  };
}
