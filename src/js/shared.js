const clockImage = 'https://' + window.powerupHost + '/images/clock.svg';
const estimateImage = 'https://' + window.powerupHost + '/images/estimate.svg';
const clockImageWhite = 'https://' + window.powerupHost + '/images/clock.svg';
const dataPrefix = 'act-timer';
const apiKey = '2de5d228d2ca7b7bc4c9decc4ee3cbac';
const appName = 'Activity timer';

/**
 * Get estimates for card.
 *
 * @param t
 *
 * @returns {Promise<*>}
 */
async function getEstimates (t) {
    return await t.get('card', 'shared', dataPrefix + '-estimates', []);
}

/**
 * Get own estimate in seconds.
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getOwnEstimate (t) {
    const estimates = await getEstimates(t);
    const member = await t.member('id');
    let time = 0;

    estimates.forEach((estimate) => {
        if (estimate[0] === member.id) {
            time += estimate[1];
        }
    });

    return time;
}

/**
 * Get total estimate time in seconds.
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getTotalEstimate (t) {
    const estimates = await getEstimates(t);
    let time = 0;

    estimates.forEach((estimate) => {
        time += estimate[1];
    });

    return time;
}

/**
 * Create estimate for current member. This will delete past
 * estimates made by same user.
 *
 * @param t
 * @param seconds
 *
 * @returns {Promise<void>}
 */
async function createEstimate (t, seconds) {
    const member = await t.member('id');

    const estimates = (await getEstimates(t)).filter((estimate) => {
        return Array.isArray(estimate) && estimate[0] !== member.id;
    });

    estimates.push([member.id, seconds]);

    await t.set('card', 'shared', dataPrefix + '-estimates', estimates);
}

/**
 * Get all tracked ranges.
 *
 * @param t
 * @param noCurrent
 *
 * @returns {Promise<*>}
 */
async function getRanges (t, noCurrent) {
    noCurrent = noCurrent || false;

    const ranges = await t.get('card', 'shared', dataPrefix + '-ranges', []);

    if (noCurrent) {
        return ranges;
    }

    const startTime = await t.get('card', 'private', dataPrefix + '-start');
    const member = await t.member('id');

    if (startTime) {
        ranges.push([
            member.id,
            startTime[0],
            Math.floor((new Date().getTime() / 1000))
        ]);
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
async function isRunning (t) {
    return !!(await t.get('card', 'private', dataPrefix + '-start'));
}

/**
 * Get total seconds tracked
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getTotalSeconds (t) {
    const ranges = await getRanges(t);

    let totalSeconds = 0;

    ranges.forEach((range) => {
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
async function startTimer (t) {
    const data = await t.card('idList');

    await t.set('card', 'private', dataPrefix + '-start', [
        Math.floor((new Date().getTime() / 1000)),
        data.idList
    ]);
}

/**
 * Stop timer
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function stopTimer (t) {
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
function formatTime (secondsToFormat) {
    const hours = Math.floor(secondsToFormat / 3600);
    const minutes = Math.floor((secondsToFormat % 3600) / 60);
    const timeFormat = [];

    if (hours > 0) {
        timeFormat.push(hours + 'h');
    }

    if (minutes > 0) {
        timeFormat.push(minutes + 'm');
    }

    return (timeFormat.length > 0 ? timeFormat.join(' ') : '0m');
}

/**
 * @param date
 *
 * @returns {string}
 */
function formatDate (date) {
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

/**
 * Is estimate feature enabled?
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function hasEstimateFeature (t) {
    return !(await t.get('board', 'shared', 'act-timer-disable-estimate'));
}

/**
 * Disable estimate feature.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function disableEstimateFeature (t) {
    await t.set('board', 'shared', 'act-timer-disable-estimate', 1);
}

/**
 * Enable estimate feature
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function enableEstimateFeature (t) {
    await t.remove('board', 'shared', 'act-timer-disable-estimate');
}

/**
 * Card badges capability handler.
 *
 * @param t
 *
 * @returns {{dynamic: (function(): {refresh: number})}[]}
 */
async function cardBadges (t) {
    const items = [{
        dynamic: async function () {
            const running = await isRunning(t);
            const time = await getTotalSeconds(t);

            const object = {
                refresh: 60
            };

            if (time !== 0 || running) {
                object.text = formatTime(time);
                object.icon = clockImage;

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

    const totalEstimate = await getTotalEstimate(t);

    if (totalEstimate > 0) {
        items.push({
            icon: estimateImage,
            text: 'Estimate: ' + formatTime(totalEstimate)
        });
    }

    return items;
}

/**
 * Card buttons capability handler.
 *
 * @param t
 *
 * @returns {({condition: string, icon: string, callback: (function(*): *), text: string}|{icon: string, callback: (function(*): *), text: string})[]}
 */
function cardButtons (t) {
    return [
        {
            icon: clockImage,
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
                                    'text': member.fullName + (member.fullName != member.username ? ' (' + member.username + ')' : '') + ':'
                                });

                                memberRanges.forEach((range, rangeIndex) => {
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
                                                            callback: (t) => {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change start from (' + formatDate(_start) + ')',
                                                                    callback: async function(t, opts) {
                                                                        _range[1] = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        ranges[_rangeIndex] = _range;
                                                                        await t.set('card', 'shared', dataPrefix + '-ranges', ranges);
                                                                        return t.closePopup();
                                                                    },
                                                                    date: _start
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Edit end (' + formatDate(end) + ')',
                                                            callback: (t) => {
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
                                                            callback: async (t) => {
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
                            items.splice(items.length - 1, 1);
                        }

                        if (items.length > 0) {
                            items.push({
                                'text': '--------'
                            });

                            items.push({
                                'text': 'Clear',
                                callback: async (t) => {
                                    return t.popup({
                                        type: 'confirm',
                                        title: 'Clear time',
                                        message: 'Do you wish to clear tracked time?',
                                        confirmText: 'Yes, clear tracked time',
                                        onConfirm: async (t) => {
                                            await t.remove('card', 'shared', dataPrefix + '-ranges');
                                            await t.remove('card', 'private', dataPrefix + '-start');
                                            await t.closePopup();
                                        },
                                        confirmStyle: 'danger',
                                        cancelText: 'No, cancel'
                                    });
                                }
                            });
                        } else {
                            items.push({ 'text': 'No activity yet' });
                        }

                        return items;
                    }
                });
            },
            condition: 'edit'
        },
        {
            icon: clockImage,
            text: 'Time spent',
            callback: function (t) {
                return t.popup({
                    title: 'Time spent',
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
                                let totalTime = 0;

                                memberRanges.forEach(function (range, rangeIndex) {
                                    totalTime += range[2] - range[1];
                                });

                                items.push({
                                    'text': member.fullName + (member.fullName != member.username ? ' (' + member.username + ')' : '') + ': ' +  formatTime(totalTime)
                                });
                            }
                        });

                        if (items.length === 0) {
                            items.push({ 'text': 'No activity yet' });
                        }

                        return items;
                    }
                });
            }
        }
    ];
}

/**
 * Card back section capability handler.
 *
 * @param t
 *
 * @returns {{title: string, content: {type: string, url: *, height: number}}}
 */
function cardBackSection (t) {
    return {
        title: 'Activity timer',
        icon: clockImage,
        content: {
            type: 'iframe',
            url: t.signUrl('./card_back_section.html'),
            height: 40
        }
    };
}

/**
 * Click handler for board button.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function onBoardButtonClick (t) {
    await t.modal({
        url: t.signUrl('./history.html'),
        title: 'Activity timer history',
        fullscreen: false
    });
}

/**
 * Board button capability handler.
 *
 * @param t
 *
 * @returns {{condition: string, icon: {light: *, dark: *}, callback: onBoardButtonClick, text: string}[]}
 */
function boardButtons (t) {
    return [{
        icon: {
            dark: clockImage,
            light: clockImageWhite
        },
        text: 'Activity timer history',
        callback: onBoardButtonClick,
        condition: 'always'
    }];
}

/**
 * Show settings capability handler.
 *
 * @param t
 *
 * @returns {*}
 */
function showSettings (t) {
    return t.popup({
        title: 'Activity timer settings',
        url: t.signUrl('./settings.html'),
        height: 85
    });
}

module.exports = {
    cardBadges,
    cardButtons,
    getRanges,
    isRunning,
    getTotalSeconds,
    startTimer,
    stopTimer,
    formatTime,
    formatDate,
    clockImage,
    cardBackSection,
    boardButtons,
    apiKey,
    appName,
    getOwnEstimate,
    getTotalEstimate,
    createEstimate,
    getEstimates,
    showSettings,
    hasEstimateFeature,
    disableEstimateFeature,
    enableEstimateFeature
};