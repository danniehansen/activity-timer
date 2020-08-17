module.exports = class Timer {
    _memberId;
    _start;
    _listId;

    constructor (memberId, listId, start) {
        this._memberId = memberId;
        this._listId = listId;
        this._start = start;
    }

    get timeInSeconds () {
        return Math.floor(new Date().getTime() / 1000) - this._start;
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

    serialize () {
        return [
            this.memberId,
            this.listId,
            this.start
        ];
    }
}