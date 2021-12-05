import { computed, ComputedRef, Ref } from 'vue';
import { Range } from '../../components/range';
import { Ranges } from '../../components/ranges';
import { Trello } from '../../types/trello';
import { formatMemberName, formatTime } from '../../utils/formatting';

interface PluginRawData {
  'act-timer-ranges': [string, number, number][];
}

interface MemberById {
  [key: string]: Trello.PowerUp.Member;
}

export interface ApiCardRowData {
  [key: string]: string | string[] | number;
  'card.id': string;
  'card.title': string;
  'card.description': string;
  'card.labels': string;
  'member.id': string;
  'member.name': string;
  'time_spent_seconds': number;
  'time_spent_formatted': string;
}

export class ApiCard {
  private _data: Trello.PowerUp.Card;
  private _ranges: Ranges;
  private _rowData: ComputedRef<ApiCardRowData>;
  private _memberById: MemberById;

  constructor (data: Trello.PowerUp.Card, memberById: MemberById, selectedMembers: Ref<string[]>) {
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

    this._memberById = memberById;
    this._rowData = computed<ApiCardRowData>(() => {
      const ranges = (selectedMembers.value.length > 0
        ? new Ranges(
          this._data.id,
          this._ranges.items.filter((item) => selectedMembers.value.includes(item.memberId))
        )
        : this._ranges);

      const timeSpent = ranges.timeSpent;

      const members = ranges.items.map((item) => item.memberId).filter((value, index, self) => {
        return self.indexOf(value) === index;
      });

      return {
        'card.id': this._data.id,
        'card.title': this._data.name,
        'card.description': this._data.desc,
        'card.labels': this._data.labels.map((label) => label.name).join(', '),
        'member.id': members.join(', '),
        'member.name': members.filter((member) => {
          return this._memberById[member] !== undefined;
        }).map((member) => {
          return formatMemberName(this._memberById[member]);
        }).join(', '),
        time_spent_seconds: timeSpent,
        time_spent_formatted: formatTime(timeSpent, true)
      };
    });
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