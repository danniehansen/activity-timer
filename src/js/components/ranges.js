const Range = require('./range.js');

module.exports = class Ranges {
    _items = [];

    /**
     * Ranges constructor.
     *
     * @param ranges
     */
    constructor(ranges) {
        if (ranges) {
            ranges.forEach((range) => {
                this.addRange(range[0], range[1], range[2]);
            });
        }
    }

    /**
     * Add time range.
     *
     * @param {string} memberId
     * @param {number} start
     * @param {number} end
     */
    addRange (memberId, start, end) {
        this._items.push(new Range(memberId, start, end));
    }

    /**
     * Get time spent by member ID.
     *
     * @param {string} memberId
     *
     * @returns {number}
     */
    getTimeSpentByMemberId (memberId) {
        let time = 0;

        this.items.filter((range) => {
            return range.memberId === memberId;
        }).forEach((range) => {
            time += range.time;
        });

        return time;
    }

    /**
     * Delete range by index.
     *
     * @param index
     */
    deleteRangeByIndex (index) {
        this.items.splice(index, 1);
    }

    /**
     * Serialize items into a JSON string.
     *
     * @returns {string}
     */
    serialize () {
        return JSON.stringify(this.items);
    }

    /**
     * @param t
     *
     * @returns {Promise<void>}
     */
    async saveForContext (t) {
        await t.set('card', 'shared', 'act-timer-ranges', this.serialize());
    }

    get timeSpent () {
        let time = 0;

        this.items.forEach((range) => {
            time += range.time;
        });

        return time;
    }

    get items () {
        return this._items;
    }

    /**
     * Unserialize raw data into Ranges instances.
     *
     * @param {string} data
     *
     * @returns {Ranges}
     */
    static unserialize (data) {
        return new Ranges(JSON.parse(data));
    }
}