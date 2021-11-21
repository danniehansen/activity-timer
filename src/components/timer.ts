export type TimerData = [string, string, number];

export class Timer {
  private _memberId: string;
  private _start: number;
  private _listId: string;

  constructor (memberId: string, listId: string, start: number) {
    this._memberId = memberId;
    this._listId = listId;
    this._start = start;
  }

  get memberId () {
    return this._memberId;
  }

  get listId () {
    return this._listId;
  }

  get start () {
    return this._start;
  }

  get timeInSecond () {
    return Math.floor(new Date().getTime() / 1000) - this._start;
  }

  serialize (): TimerData {
    return [
      this._memberId,
      this._listId,
      this._start
    ];
  }
}