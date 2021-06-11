module.exports = class Range {
    _memberId;
    _start;
    _end;
    _tracking;

    /**
     * Range constructor.
     *
     * @param {string} memberId
     * @param {number} start
     * @param {number} end
     * @param {boolean|undefined} [isTracking]
     */
    constructor(memberId, start, end, isTracking) {
        this._memberId = memberId;
        this._start = start;
        this._end = end;
        this._tracking = isTracking;
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

    get isTracking () {
        return (typeof this._tracking !== 'undefined' ? this._tracking : false);
    }

    serialize () {
        return [
            this._memberId,
            this._start,
            this._end
        ];
    }
}
