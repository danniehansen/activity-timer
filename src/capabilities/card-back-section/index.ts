import { Trello } from '../../types/trello';

export async function getCardBackSection (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardBackSection> {
  return {
    title: 'Activity timer',
    icon: '',
    content: {
      type: 'iframe',
      url: t.signUrl('./index.html', {
        page: 'card-back-section'
      }),
      height: 50
    }
  };
}
