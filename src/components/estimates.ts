import { Timer, TimerData } from './timer';
import { getTrelloInstance } from '../trello';
import { Estimate, EstimateData } from './estimate';

export class Estimates {
  private _cardId: string;
  private _items: Estimate[] = [];

  constructor (cardId: string, items?: Estimate[]) {
    this._cardId = cardId;

    if (items) {
      this._items = items;
    }
  }

  get items () {
    return this._items;
  }

  get totalEstimate (): number {
    return this._items.reduce((a, b) => a + b.time, 0);
  }

  add (item: Estimate) {
    this._items.push(item);
  }

  getByMemberId (memberId: string): Estimate | undefined {
    return this._items.reduce<Estimate | undefined>((carry, item) => {
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

  serialize (): EstimateData[] {
    return this._items.map((item) => {
      return item.serialize();
    });
  }

  async save () {
    await getTrelloInstance().set(this._cardId, 'shared', 'act-timer-estimates', this.serialize());
  }
}