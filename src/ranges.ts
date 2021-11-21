import { Range, RangeData } from './range';
import { Trello } from './types/trello';

export class Ranges {
  private _items: Range[] = [];

  constructor (items?: Range[]) {
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

  async saveByCardId (t: Trello.PowerUp.IFrame, cardId: string) {
    await t.set(cardId, 'shared', 'act-timer-ranges', this.serialize());
  }

  async saveByContext (t: Trello.PowerUp.IFrame) {
    await t.set('card', 'shared', 'act-timer-ranges', this.serialize());
  }

  static async getFromCardId (t: Trello.PowerUp.IFrame, cardId: string) {
    const data = await t.get<RangeData[]>(cardId, 'shared', 'act-timer-ranges', []);

    return new Ranges(
      data.map((item) => {
        return new Range(
          // Member id
          item[0],

          // Start
          item[1],

          // End
          item[2]
        );
      })
    );
  }

  static async getFromContext (t: Trello.PowerUp.IFrame) {
    const data = await t.get<RangeData[]>('card', 'shared', 'act-timer-ranges', []);

    return new Ranges(
      data.map((item) => {
        return new Range(
          // Member id
          item[0],

          // Start
          item[1],

          // End
          item[2]
        );
      })
    );
  }
}