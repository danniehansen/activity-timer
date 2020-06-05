const clockImg = require('../images/clock.svg');
const dataPrefix = 'act-timer';

console.log('clockImg:', clockImg);

/**
 * Get all tracked ranges.
 *
 * @param t
 * @param noCurrent
 *
 * @returns {Promise<*>}
 */
async function getRanges(t, noCurrent) {
    noCurrent = noCurrent || false;

    const ranges = await t.get('card', 'shared', dataPrefix + '-ranges', []);

    if (noCurrent) {
        return ranges;
    }

    const startTime = await t.get('card', 'private', dataPrefix + '-start');
    const member = await t.member('id');

    if (startTime) {
        ranges.push([member.id, startTime[0], Math.floor((new Date().getTime() / 1000))]);
    }

    return ranges;
}

/**
 * Whether or not tracker is running
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function isRunning(t) {
    const data = await t.get('card', 'private', dataPrefix + '-start');
    return !!data;
}

/**
 * Get total seconds tracked
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getTotalSeconds(t) {
    const ranges = await getRanges(t);

    let totalSeconds = 0;

    ranges.forEach(function (range) {
        if (typeof range[1] !== 'undefined' && typeof range[2] !== 'undefined') {
            totalSeconds += (range[2] - range[1]);
        }
    });

    return totalSeconds;
}

/**
 * Start timer
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function startTimer(t) {
    const data = await t.card('idList');
    await t.set('card', 'private', dataPrefix + '-start', [Math.floor((new Date().getTime() / 1000)), data.idList]);
}

/**
 * Stop timer
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function stopTimer(t) {
    const data = await t.get('card', 'private', dataPrefix + '-start');

    if (data) {
        const ranges = await getRanges(t);
        await t.set('card', 'shared', dataPrefix + '-ranges', ranges);
        await t.remove('card', 'private', dataPrefix + '-start');
    }
}

/**
 * @param secondsToFormat
 *
 * @returns {string}
 */
function formatTime(secondsToFormat) {
    const hours = Math.floor(secondsToFormat / 3600);
    const minutes = Math.floor((secondsToFormat % 3600) / 60);
    const seconds = Math.floor(secondsToFormat % 60);

    return [(hours < 10 ? '0' : '') + hours, (minutes < 10 ? '0' : '') + minutes, (seconds < 10 ? '0' : '') + seconds].join(':');
}

/**
 * @param date
 *
 * @returns {string}
 */
function formatDate(date) {
    const dateStr = [
        date.getFullYear(),
        ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1),
        (date.getDate() < 10 ? '0' : '') + date.getDate()
    ];

    const timeStr = [
        (date.getHours() < 10 ? '0' : '') + date.getHours(),
        (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
    ];

    return dateStr.join('-') + ' ' + timeStr.join(':');
}

window.TrelloPowerUp.initialize({
    'card-badges': function (t) {
        return [{
            dynamic: async function() {
                const running = await isRunning(t);
                const time = await getTotalSeconds(t);

                const object = {
                    refresh: 10
                };

                if (time !== 0) {
                    object.text = 'Time: ' + formatTime(time);

                    if (running) {
                        const startTime = await t.get('card', 'private', dataPrefix + '-start');
                        const data = await t.card('idList');

                        if (startTime[1] !== data.idList) {
                            await stopTimer(t);
                        } else {
                            object.color = 'red';
                        }
                    }
                }

                return object;
            }
        }];
    },
    'card-buttons': function (t) {
        return [{
            icon: clockImg,
            text: 'Clear data',
            callback: async function () {
                await t.remove('card', 'private', dataPrefix + '-start');
                await t.remove('card', 'shared', dataPrefix + '-ranges');
            },
            condition: 'edit'
        }, {
            icon: clockImg,
            text: 'Manage time',
            callback: function (t) {
                return t.popup({
                    title: 'Manage time',
                    items: async function (t) {
                        const ranges = await getRanges(t, true);
                        const items = [];

                        let board = await t.board('members');

                        board.members.sort((a, b) => {
                            const nameA = a.fullName.toUpperCase();
                            const nameB = b.fullName.toUpperCase();

                            if (nameA < nameB) {
                                return -1;
                            }
                            if (nameA > nameB) {
                                return 1;
                            }

                            return 0;
                        }).forEach((member, memberIndex) => {
                            const memberRanges = ranges.filter((range) => {
                                return range[0] == member.id;
                            });

                            if (memberRanges.length > 0) {
                                items.push({
                                    'text': member.fullName + ':'
                                });

                                memberRanges.forEach(function (range, rangeIndex) {
                                    const start = new Date(range[1] * 1000);
                                    const end = new Date(range[2] * 1000);
                                    const _rangeIndex = rangeIndex;
                                    const _range = range;

                                    items.push({
                                        text: formatDate(start) + ' - ' + formatDate(end),
                                        callback: function (t) {
                                            return t.popup({
                                                title: 'Edit time range',
                                                items: function (t) {
                                                    const _start = new Date(_range[1] * 1000);
                                                    const _end = new Date(_range[2] * 1000);

                                                    return [
                                                        {
                                                            text: 'Edit start (' + formatDate(start) + ')',
                                                            callback: function (t) {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change start from (' + formatDate(_start) + ')',
                                                                    callback: async function(t, opts) {
                                                                        _range[1] = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        ranges[_rangeIndex] = _range;
                                                                        await t.set('card', 'shared', dataPrefix + '-ranges', ranges);
                                                                        return t.closePopup();
                                                                    }
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Edit end (' + formatDate(end) + ')',
                                                            callback: function (t) {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change end from (' + formatDate(_end) + ')',
                                                                    callback: async function(t, opts) {
                                                                        _range[2] = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        ranges[_rangeIndex] = _range;
                                                                        await t.set('card', 'shared', dataPrefix + '-ranges', ranges);
                                                                        return t.closePopup();
                                                                    },
                                                                    date: _end
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Delete',
                                                            callback: async function (t) {
                                                                ranges.splice(_rangeIndex, 1);
                                                                await t.set('card', 'shared', dataPrefix + '-ranges', ranges);
                                                                return t.closePopup();
                                                            }
                                                        }
                                                    ];
                                                }
                                            });
                                        },
                                    });
                                });

                                items.push({
                                    'text': '--------'
                                });
                            }
                        });

                        if (items.length > 0) {
                            delete items[items.length - 1];
                        }

                        return items;
                    }
                });
            },
            condition: 'edit'
        }];
    },
    'card-detail-badges': function (t) {
        return [{
            dynamic: async function () {
                const running = await isRunning(t);
                const object = {
                    refresh: 10
                };

                if (running) {
                    object.text = 'Stop timer';
                    object.color = 'red';
                    object.callback = stopTimer;
                } else {
                    object.text = 'Start timer';
                    object.color = 'green';
                    object.callback = startTimer;
                }

                return object;
            }
        }, {
            dynamic: async function() {
                const time = await getTotalSeconds(t);
                const object = {
                    refresh: 10
                };

                if (time !== 0) {
                    object.text = 'Time: ' + formatTime(time);
                }

                return object;
            }
        }];
    }
});