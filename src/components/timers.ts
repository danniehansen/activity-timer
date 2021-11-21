import { Timer, TimerData } from './timer';
import { getTrelloInstance } from '../trello';

export class Timers {
  private _cardId: string;
  private _items: Timer[] = [];

  constructor (cardId: string, timers?: Timer[]) {
    this._cardId = cardId;

    if (timers) {
      this._items = timers;
    }
  }

  get items () {
    return this._items;
  }

  get timeSpent (): number {
    return this._items.reduce((a, b) => a + b.timeInSecond, 0);
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

  async save () {
    await getTrelloInstance().set(this._cardId, 'shared', 'act-timer-running', this.serialize());
  }
}