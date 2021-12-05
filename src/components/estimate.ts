export type EstimateData = [string, number];

export class Estimate {
  private _memberId: string;
  private _time: number;

  constructor (memberId: string, time: number) {
    this._memberId = memberId;
    this._time = time;
  }

  get memberId () {
    return this._memberId;
  }

  get time () {
    return this._time;
  }

  serialize (): EstimateData {
    return [
      this._memberId,
      this._time
    ];
  }
}