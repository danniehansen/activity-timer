import { Trello } from '../../types/trello';
import ClockImageBlack from '../../assets/images/clock_black.svg';

export async function getCardBackSection(
  t: Trello.PowerUp.IFrame
): Promise<Trello.PowerUp.CardBackSection> {
  return {
    title: 'Activity timer',
    icon: ClockImageBlack,
    content: {
      type: 'iframe',
      url: t.signUrl('./index.html', {
        page: 'card-back-section'
      }),
      height: 40
    }
  };
}
