import { Trello } from '../../types/trello';
import EstimateImage from '../../assets/images/estimate.svg?url';
import ClockImageBlack from '../../assets/images/clock_black.svg?url';
import { Card } from '../../components/card';
import { formatTime } from '../../utils/formatting';
import {
  hasEstimateFeature,
  hasSettingStopOnMove
} from '../../components/settings';
import { getMemberId } from '../../components/trello';
import {
  canTriggerNotification,
  triggerNotification
} from '../../utils/notifications';
import {
  clearRequestedTimerStart,
  getRequestedTimerStart
} from '../../components/websocket';
import { isVisible } from '../../utils/visibility';
import { hasAutoTimer } from '../../utils/auto-timer';

const clockIcon = `${window.location.origin}${ClockImageBlack}`;
const estimateImage = `${window.location.origin}${EstimateImage}`;

export async function getCardBadges(
  t: Trello.PowerUp.IFrame
): Promise<(Trello.PowerUp.CardBadge | Trello.PowerUp.CardBadgeDynamic)[]> {
  const visible = await isVisible();

  if (!visible) {
    return [];
  }

  const badges: Array<
    Trello.PowerUp.CardBadge | Trello.PowerUp.CardBadgeDynamic
  > = [];

  const memberId = await getMemberId();
  const card = await t.card('id');
  const cardModel = new Card(card.id);

  // Time badge
  badges.push({
    dynamic: async function () {
      const isRunning = await cardModel.isRunning();
      const timers = await cardModel.getTimers();
      const ranges = await cardModel.getRanges();
      const timeSpent = timers.timeSpent + ranges.timeSpent;

      const badge: Trello.PowerUp.CardBadge = {
        // Refresh once a minute so we can see the timer increment
        refresh: 60
      };

      if (timeSpent || isRunning) {
        badge.text = formatTime(timeSpent);
        badge.icon = clockIcon;

        const hasStopOnMove = await hasSettingStopOnMove();

        if (hasStopOnMove) {
          const freshCard = await t.card('idList');
          const listId = freshCard.idList;
          const timer = timers.getByMemberId(memberId);

          if (timer?.listId && timer.listId !== listId) {
            await cardModel.stopTracking(t);
          }
        }

        if (isRunning) {
          badge.color = 'red';

          const shouldTriggerNotification = await canTriggerNotification(t);

          if (shouldTriggerNotification) {
            await triggerNotification(t);
          }
        }
      }

      return badge;
    }
  });

  // Other people tracking badge
  badges.push({
    dynamic: async function () {
      const timers = await cardModel.getTimers();
      const othersTracking =
        timers.items.filter((item) => item.memberId !== memberId).length > 0;

      const badge: Trello.PowerUp.CardBadge = {
        // Only refresh every 5 minutes. This should be enough since updates are otherwise streamed to the other clients when they start
        refresh: 300
      };

      if (othersTracking) {
        badge.icon = clockIcon;
        badge.color = 'blue';
      }

      return badge;
    }
  });

  const hasEstimation = await hasEstimateFeature();

  // Estimation badge
  if (hasEstimation) {
    const estimate = (await cardModel.getEstimates()).totalEstimate;

    if (estimate) {
      badges.push({
        icon: estimateImage,
        text: `Estimate: ${formatTime(estimate)}`
      });
    }
  }

  // Auto-start request detection. Here we utilize refreshing to get the card context
  // & check up against if card is requested to be started.
  const hasAutoTimerFeature = await hasAutoTimer();

  if (hasAutoTimerFeature) {
    badges.push({
      dynamic: async function () {
        if (card.id === getRequestedTimerStart()) {
          clearRequestedTimerStart();

          await cardModel.startTracking((await t.card('idList')).idList, t);
        }

        return {
          refresh: 1
        };
      }
    });
  }

  return badges;
}
