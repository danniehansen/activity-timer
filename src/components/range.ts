export type RangeData = [string, number, number];

let rangeId = 0;

export class Range {
  private _memberId: string;
  private _start: number;
  private _end: number;
  private _rangeId: number;

  constructor (memberId: string, start: number, end: number) {
    this._memberId = memberId;
    this._start = start;
    this._end = end;

    rangeId++;

    this._rangeId = rangeId;
  }

  get memberId () {
    return this._memberId;
  }

  get start () {
    return this._start;
  }

  set start (value: number) {
    this._start = value;
  }

  get end () {
    return this._end;
  }

  set end (value: number) {
    this._end = value;
  }

  get diff () {
    return this._end - this._start;
  }

  get rangeId () {
    return this._rangeId;
  }

  serialize (): RangeData {
    return [
      this._memberId,
      this._start,
      this._end
    ];
  }
}