import { Range } from '../../components/range';
import { Ranges } from '../../components/ranges';
import { Trello } from '../../types/trello';
import { formatMemberName, formatTime } from '../../utils/formatting';

interface PluginRawData {
  'act-timer-ranges': [string, number, number][];
}

interface RowData {
  [key: string]: string | string[] | number;
  'card.id': string;
  'card.title': string;
  'card.description': string;
  'member.id': string | string[];
  'member.name': string | string[];
  'time_spent': number;
  'time_spent_formatted': string;
}

export class ApiCard {
  private _data: Trello.PowerUp.Card;
  private _ranges: Ranges;
  private _rowData: RowData;

  constructor (data: Trello.PowerUp.Card) {
    this._data = data;

    const pluginData = data.pluginData.find((pluginData) => {
      return (
        pluginData.value &&
        pluginData.value.includes('act-timer-ranges')
      );
    });

    if (pluginData) {
      const parsedPluginData = JSON.parse(pluginData.value) as PluginRawData;

      if (parsedPluginData['act-timer-ranges'] && parsedPluginData['act-timer-ranges'].length > 0) {
        this._ranges = new Ranges(this._data.id, parsedPluginData['act-timer-ranges'].map((rangeData) => {
          return new Range(
            // Member id
            rangeData[0],

            // Start
            rangeData[1],

            // End
            rangeData[2]
          );
        }));
      } else {
        this._ranges = new Ranges(this._data.id);
      }
    } else {
      this._ranges = new Ranges(this._data.id);
    }

    const timeSpent = this._ranges.timeSpent;

    this._rowData = {
      'card.id': this._data.id,
      'card.title': this._data.name,
      'card.description': this._data.desc,
      'member.id': this._ranges.items.map((item) => item.memberId).filter((value, index, self) => {
        return self.indexOf(value) === index;
      }),
      'member.name': 'name',
      time_spent: timeSpent,
      time_spent_formatted: formatTime(timeSpent, true)
    };
  }

  get data () {
    return this._data;
  }

  get ranges () {
    return this._ranges;
  }

  get rowData () {
    return this._rowData;
  }
}