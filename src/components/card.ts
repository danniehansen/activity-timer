import { getMemberId, getTrelloCard, getTrelloInstance } from './trello';
import { Trello } from '../types/trello';
import { Estimate, EstimateData } from './estimate';
import { Estimates } from './estimates';
import { RangeData, Range } from './range';
import { Ranges } from './ranges';
import { getThresholdForTrackings } from './settings';
import { Timer, TimerData } from './timer';
import { Timers } from './timers';
import * as Sentry from '@sentry/vue';

export class Card {
  private _cardId: string;

  constructor(cardId: string) {
    this._cardId = cardId;
  }

  get id() {
    return this._cardId;
  }

  async getRanges(): Promise<Ranges> {
    const data = await getTrelloInstance().get<RangeData[]>(
      this._cardId,
      'shared',
      'act-timer-ranges',
      []
    );

    return new Ranges(
      this._cardId,
      data.map((rangeData) => {
        return new Range(
          // Member id
          rangeData[0],

          // Start
          rangeData[1],

          // End
          rangeData[2]
        );
      })
    );
  }

  async getTimers(): Promise<Timers> {
    const data = await getTrelloInstance().get<TimerData[]>(
      this._cardId,
      'shared',
      'act-timer-running',
      []
    );

    return new Timers(
      this._cardId,
      data.map((timerData) => {
        return new Timer(
          // Member id
          timerData[0],

          // List id
          timerData[1],

          // Start
          timerData[2]
        );
      })
    );
  }

  async getEstimates(): Promise<Estimates> {
    const data = await getTrelloInstance().get<EstimateData[]>(
      this._cardId,
      'shared',
      'act-timer-estimates',
      []
    );

    return new Estimates(
      this._cardId,
      data.map((estimateData) => {
        return new Estimate(
          // Member id
          estimateData[0],

          // Time
          estimateData[1]
        );
      })
    );
  }

  async getTimeSpent(): Promise<number> {
    const timers = await this.getTimers();
    const ranges = await this.getRanges();
    return timers.timeSpent + ranges.timeSpent;
  }

  async isRunning(): Promise<boolean> {
    const timers = await this.getTimers();
    const memberId = await getMemberId();
    return timers.getByMemberId(memberId) !== undefined;
  }

  async startTracking(
    listId: string,
    trelloInstance: Trello.PowerUp.IFrame = getTrelloCard()
  ) {
    const currentCard = new Card(this._cardId);
    const memberId = await getMemberId();
    const timers = await currentCard.getTimers();
    const cards = await trelloInstance.cards('id');

    for (const card of cards) {
      const cardModel = new Card(card.id);
      const cardTimers = await cardModel.getTimers();
      const timer = cardTimers.getByMemberId(memberId);

      if (timer) {
        const ranges = await cardModel.getRanges();

        ranges.add(
          new Range(
            timer.memberId,
            timer.start,
            Math.floor(new Date().getTime() / 1000)
          )
        );

        await ranges.save();

        cardTimers.removeByMemberId(memberId);
        await cardTimers.save();
      }
    }

    timers.startByMember(memberId, listId);
    await timers.save();
  }

  async stopTracking(t: Trello.PowerUp.IFrame) {
    const memberId = await getMemberId();
    const timers = await this.getTimers();
    const timer = timers.getByMemberId(memberId);

    if (timer && timers.removeByMemberId(memberId)) {
      await timers.save();

      const threshold = await getThresholdForTrackings();

      if (
        Math.abs(Math.floor(new Date().getTime() / 1000) - timer.start) <
        threshold
      ) {
        Sentry.captureMessage(
          'Ignored tracking due to it not meeting the threshold'
        );

        t.alert({
          message: `Time tracking ignored. Threshold for registering new trackings is ${threshold} second(s).`,
          duration: 3
        });

        return;
      }

      const ranges = await this.getRanges();

      ranges.add(
        new Range(
          timer.memberId,
          timer.start,
          Math.floor(new Date().getTime() / 1000)
        )
      );

      try {
        await ranges.save();
      } catch (e) {
        Sentry.captureException(e);

        if (
          (e + '').indexOf('PluginData length of 4096 characters exceeded') !==
          -1
        ) {
          t.alert({
            message:
              'Unable to save new time tracking. Too many exists on the same card.',
            duration: 6
          });
        } else {
          t.alert({
            message:
              'Unrecognized error occurred while trying to stop the timer.',
            duration: 3
          });
        }
      }
    }
  }

  static async getFromContext(t?: Trello.PowerUp.IFrame) {
    const card = await (t ?? getTrelloCard()).card('id');
    return new Card(card.id);
  }
}
