async function getRanges(t, noCurrent) {
    noCurrent = noCurrent || false;

    const ranges = await t.get('card', 'shared', 'act-timer-ranges', []);

    if (noCurrent) {
        return ranges;
    }

    const startTime = await t.get('card', 'private', 'act-timer-start');
    const member = await t.member('id');

    if (startTime) {
        ranges.push([member.id, startTime[0], Math.floor((new Date().getTime() / 1000))]);
    }

    return ranges;
}

async function isRunning(t) {
    const data = await t.get('card', 'private', 'act-timer-start');
    return !!data;
}

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

async function startTimer(t) {
    const data = await t.card('idList');
    await t.set('card', 'private', 'act-timer-start', [Math.floor((new Date().getTime() / 1000)), data.idList]);
}

async function stopTimer(t) {
    const data = await t.get('card', 'private', 'act-timer-start');

    if (data) {
        const ranges = await getRanges(t);
        await t.set('card', 'shared', 'act-timer-ranges', ranges);
        await t.remove('card', 'private', 'act-timer-start');
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
                        const startTime = await t.get('card', 'private', 'act-timer-start');
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
            icon: require('../images/clock.svg'),
            text: 'Clear data',
            callback: async function () {
                await t.remove('card', 'private', 'act-timer-start');
                await t.remove('card', 'shared', 'act-timer-ranges');
            },
            condition: 'edit'
        }, {
            icon: require('../images/clock.svg'),
            text: 'Manage time',
            callback: function (t) {
                return t.popup({
                    title: 'Manage time',
                    items: async function (t) {
                        const ranges = await getRanges(t, true);
                        const items = [];

                        ranges.forEach(function (range, rangeIndex) {
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
                                                                await t.set('card', 'shared', 'act-timer-ranges', ranges);
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
                                                                await t.set('card', 'shared', 'act-timer-ranges', ranges);
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
                                                        await t.set('card', 'shared', 'act-timer-ranges', ranges);
                                                        return t.closePopup();
                                                    }
                                                }
                                            ];
                                        }
                                    });
                                },
                            });
                        });

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