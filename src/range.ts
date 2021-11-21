export type RangeData = [string, number, number];

export class Range {
  private _memberId: string;
  private _start: number;
  private _end: number;
  private _isTracking?: boolean;

  constructor (memberId: string, start: number, end: number, isTracking?: boolean) {
    this._memberId = memberId;
    this._start = start;
    this._end = end;
    this._isTracking = isTracking;
  }

  get memberId () {
    return this._memberId;
  }

  get start () {
    return this._start;
  }

  get end () {
    return this._end;
  }

  get isTracking () {
    return this._isTracking ?? false;
  }

  get diff () {
    return this._end - this._start;
  }

  serialize (): RangeData {
    return [
      this._memberId,
      this._start,
      this._end
    ];
  }
}