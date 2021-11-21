import { Trello } from '../../types/trello';
import EstimateImage from '../../assets/images/estimate.svg';
import ClockImage from '../../assets/images/clock.svg';

const clockIcon = `${window.location.origin}${ClockImage}`;
const estimateImage = `${window.location.origin}${EstimateImage}`;

export async function getCardBadges (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardBadge[]> {
  return [
    {
      icon: clockIcon,
      text: '0m'
    },
    {
      icon: estimateImage,
      text: 'Estimate: 1h'
    }
  ];
}
