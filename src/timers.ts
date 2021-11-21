import { Timer, TimerData } from './timer';
import { Trello } from './types/trello';

export class Timers {
  private _items: Timer[] = [];

  constructor (timers?: Timer[]) {
    if (timers) {
      this._items = timers;
    }
  }

  get items () {
    return this._items;
  }

  add (timer: Timer) {
    this._items.push(timer);
  }

  getByMemberId (memberId: string): Timer | undefined {
    return this._items.reduce<Timer | undefined>((carry, item) => {
      if (item.memberId === memberId) {
        carry = item;
      }
      return carry;
    }, undefined);
  }

  removeByMemberId (memberId: string): boolean {
    const lengthBefore = this._items.length;

    this._items = this._items.filter((item) => {
      return item.memberId !== memberId;
    });

    return this._items.length !== lengthBefore;
  }

  serialize (): TimerData[] {
    return this._items.map((item) => {
      return item.serialize();
    });
  }

  startByMember (memberId: string, listId: string) {
    this._items = this._items.filter((item) => {
      return item.memberId !== memberId;
    });

    this.add(
      new Timer(
        memberId,
        listId,
        Math.floor(new Date().getTime() / 1000)
      )
    );
  }

  async saveByContext (t: Trello.PowerUp.IFrame) {
    await t.set('card', 'shared', 'act-timer-running', this.serialize());
  }

  async saveByCardId (t: Trello.PowerUp.IFrame, cardId: string) {
    await t.set(cardId, 'shared', 'act-timer-running', this.serialize());
  }

  static async getFromContext (t: Trello.PowerUp.IFrame) {
    const data = await t.get<TimerData[]>('card', 'shared', 'act-timer-running', []);

    return new Timers(
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

  static async getFromCardId (t: Trello.PowerUp.IFrame, cardId: string) {
    const data = await t.get(cardId, 'shared', 'act-timer-running', []);

    return new Timers(
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
}