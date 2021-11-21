import { Range, RangeData } from './range';
import { getTrelloInstance } from '../trello';

export class Ranges {
  private _cardId: string;
  private _items: Range[] = [];

  constructor (cardId: string, items?: Range[]) {
    this._cardId = cardId;

    if (items) {
      this._items = items;
    }
  }

  get items () {
    return this._items ?? [];
  }

  add (range: Range) {
    this._items.push(range);
  }

  serialize (): RangeData[] {
    return this._items.map((item) => {
      return item.serialize();
    });
  }

  async save () {
    await getTrelloInstance().set(this._cardId, 'shared', 'act-timer-ranges', this.serialize());
  }
}