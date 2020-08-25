const Range = require('./range.js');

module.exports = class Ranges {
    /**
     * @var Range[]
     */
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
            time += range.diff;
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
     * @returns {*}
     */
    serialize () {
        return this.items.map((range) => {
            return range.serialize();
        });
    }

    /**
     * @param {*} t
     *
     * @returns {Promise<void>}
     */
    async saveForContext (t) {
        await t.set('card', 'shared', 'act-timer-ranges', this.serialize());
    }

    /**
     * @param {*} t
     * @param {string} cardId
     *
     * @returns {Promise<void>}
     */
    async saveByCardId (t, cardId) {
        await t.set(cardId, 'shared', 'act-timer-ranges', this.serialize());
    }

    /**
     * @returns {number}
     */
    get timeSpent () {
        let time = 0;

        this.items.forEach((range) => {
            time += range.diff;
        });

        return time;
    }

    /**
     * @returns {Range[]}
     */
    get items () {
        return this._items;
    }

    /**
     * Unserialize raw data into Ranges instances.
     *
     * @param data
     *
     * @returns {Ranges}
     */
    static unserialize (data) {
        return new Ranges(data);
    }
}