import { Ranges } from './ranges';
import { Range } from './range';
import { Timers } from './timers';
import { Trello } from './types/trello';
import { getThresholdForTrackings } from './settings';

type TrelloInstance = Trello.PowerUp.Plugin | Trello.PowerUp.IFrame;

let trelloInstance: TrelloInstance | null = null;
let memberIdCache: string | null = null;

export function setTrelloInstance (t: TrelloInstance) {
  trelloInstance = t;
}

export function getTrelloInstance (): TrelloInstance {
  return trelloInstance as TrelloInstance;
}

export function resizeTrelloFrame (): void {
  if (trelloInstance && 'sizeTo' in trelloInstance) {
    trelloInstance.sizeTo('body');
  }
}

export async function getCardRanges (t: TrelloInstance): Promise<Ranges> {
  const rangeData = await t.get('card', 'shared', 'act-timer-running', []);

  return new Ranges(rangeData);
}

/**
 * Get the member id from the current trello context.
 */
export async function getMemberId () {
  if (memberIdCache === null) {
    memberIdCache = (await getTrelloInstance().member('id')).id;
  }

  return memberIdCache;
}

export async function startTimeTracking (t: Trello.PowerUp.IFrame): Promise<void> {
  const listId = (await t.card('idList')).idList;
  const memberId = await getMemberId();
  const timers = await Timers.getFromContext(t);

  const cards = await t.cards('all');

  for (const card of cards) {
    const cardTimers = await Timers.getFromCardId(t, card.id);
    const timer = cardTimers.getByMemberId(memberId);

    if (timer) {
      const ranges = await Ranges.getFromCardId(t, card.id);

      ranges.add(
        new Range(
          timer.memberId,
          timer.start,
          Math.floor(new Date().getTime() / 1000)
        )
      );

      await ranges.saveByCardId(t, card.id);

      cardTimers.removeByMemberId(memberId);
      await cardTimers.saveByCardId(t, card.id);
    }

    if (cardTimers.removeByMemberId(memberId)) {
      cardTimers.saveByCardId(t, card.id);
    }
  }

  timers.startByMember(memberId, listId);

  await timers.saveByContext(t);
}

export async function stopTimeTracking (t: Trello.PowerUp.IFrame): Promise<void> {
  const memberId = await getMemberId();
  const timers = await Timers.getFromContext(t);
  const timer = timers.getByMemberId(memberId);

  timers.removeByMemberId(memberId);
  await timers.saveByContext(t);

  if (timer) {
    const threshold = await getThresholdForTrackings();

    if (Math.abs(Math.floor(new Date().getTime() / 1000) - timer.start) < threshold) {
      t.alert({
        message: `Time tracking ignored. Threshold for registering new trackings is ${threshold} second(s).`,
        duration: 3
      });

      return;
    }

    const ranges = await Ranges.getFromContext(t);

    ranges.add(
      new Range(
        timer.memberId,
        timer.start,
        Math.floor(new Date().getTime() / 1000)
      )
    );

    try {
      await ranges.saveByContext(t);
    } catch (e) {
      if ((e + '').indexOf('PluginData length of 4096 characters exceeded') !== -1) {
        const currentTrackings = await Ranges.getFromContext(t);

        try {
          await currentTrackings.saveByContext(t);

          t.alert({
            message: 'Unable to save new time tracking. Too many exists on the same card.',
            duration: 6
          });
        } catch (e) {
          t.alert({
            message: 'Unable to save new time tracking. Too many exists on the same card.',
            duration: 3
          });

          throw e;
        }
      } else {
        t.alert({
          message: 'Unrecognized error occurred while trying to stop the timer.',
          duration: 3
        });

        throw e;
      }
    }
  }
}