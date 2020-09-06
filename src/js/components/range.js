module.exports = class Range {
    _memberId;
    _start;
    _end;

    /**
     * Range constructor.
     *
     * @param {string} memberId
     * @param {number} start
     * @param {number} end
     */
    constructor(memberId, start, end) {
        this._memberId = memberId;
        this._start = start;
        this._end = end;
    }

    /**
     * @returns {string}
     */
    get memberId () {
        return this._memberId;
    }

    /**
     * @returns {number}
     */
    get diff () {
        return this.end - this.start;
    }

    /**
     * @returns {number}
     */
    get start () {
        return parseInt(this._start, 10);
    }

    /**
     * @returns {number}
     */
    get end () {
        return parseInt(this._end, 10);
    }

    /**
     * @returns {string}
     */
    get memberId () {
        return this._memberId;
    }

    set start (value) {
        this._start = value;
    }

    set end (value) {
        this._end = value;
    }

    serialize () {
        return [
            this._memberId,
            this._start,
            this._end
        ];
    }
}