const Ranges = require('./components/ranges.js');
const Timers = require('./components/timers.js');

const clockImage = 'https://' + window.powerupHost + '/images/clock.svg';
const estimateImage = 'https://' + window.powerupHost + '/images/estimate.svg';
const clockImageWhite = 'https://' + window.powerupHost + '/images/clock.svg';
const dataPrefix = 'act-timer';
const apiKey = '2de5d228d2ca7b7bc4c9decc4ee3cbac';
const appName = 'Activity timer';
const apiHost = '7jlqay8fc2.execute-api.eu-west-1.amazonaws.com';
const websocket = 'wss://0afjsqn407.execute-api.eu-west-1.amazonaws.com/production';

var requestTimerStartId;
var memberIdCache = null;

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
 * Clear estimates.
 *
 * @returns {Promise<void>}
 */
async function clearEstimates (t) {
    return await t.remove('card', 'shared', dataPrefix + '-estimates');
}

/**
 * Delete an estimate.
 *
 * @param t
 * @param {string} memberId
 *
 * @returns {Promise<void>}
 */
async function deleteEstimate (t, memberId) {
    const estimates = (await getEstimates(t)).filter((estimate) => {
        return Array.isArray(estimate) && estimate[0] !== memberId;
    });

    await t.set('card', 'shared', dataPrefix + '-estimates', estimates);
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
    const member = await getMemberId(t);
    let time = 0;

    estimates.forEach((estimate) => {
        if (estimate[0] === member.id) {
            time += estimate[1];
        }
    });

    return time;
}

/**
 * Checks if user have stop on move enabled.
 *
 * @param t
 *
 * @returns {boolean}
 */
async function hasSettingStopOnMove (t) {
    return (await t.get('member', 'private', dataPrefix + '-personal-settings', 1)) === 1;
}

/**
 * @param t
 * @param {boolean} value
 */
async function setSettingStopOnMove (t, value) {
    await t.set('member', 'private', dataPrefix + '-personal-settings', value === true ? 1 : 0);
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
 * @param {number} seconds
 *
 * @returns {Promise<void>}
 */
async function createEstimate (t, seconds) {
    const member = await getMemberId(t);

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
 * @param {boolean|undefined} [noCurrent]
 * @param {boolean|undefined} [includeAll]
 *
 * @returns {Promise<Ranges>}
 */
async function getRanges (t, noCurrent, includeAll) {
    noCurrent = noCurrent || false;
    includeAll = includeAll || false;

    const rangesData = await t.get('card', 'shared', dataPrefix + '-ranges', []);
    const ranges = Ranges.unserialize(rangesData || []);

    if (!noCurrent) {
        const timer = (await Timers.getFromContext(t)).getByMember(
            (await getMemberId(t))
        );

        if (timer !== null) {
            ranges.addRange(
                timer.memberId,
                timer.start,
                Math.floor(new Date().getTime() / 1000),
                true
            );
        }
    } else if (includeAll) {
        const timers = await Timers.getFromContext(t);

        timers.items.forEach((timer) => {
            ranges.addRange(
                timer.memberId,
                timer.start,
                Math.floor(new Date().getTime() / 1000),
                true
            );
        });
    }

    return ranges;
}

/**
 * Getter for member id. Avoid extra calls for just getting the id.
 *
 * @param t
 *
 * @returns {Promise<*>}
 */
async function getMemberId (t) {
    if (memberIdCache === null) {
        memberIdCache = (await t.member('id')).id;
    }

    return memberIdCache;
}

/**
 * Whether or not tracker is running
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function isRunning (t) {
    return (await Timers.getFromContext(t)).getByMember(
        (await getMemberId(t))
    ) !== null;
}

/**
 * Get total seconds tracked
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getTotalSeconds (t) {
    return (await getRanges(t, true, true)).timeSpent;
}

/**
 * Get own total seconds tracked
 *
 * @param t
 *
 * @returns {Promise<number>}
 */
async function getOwnTotalSeconds (t) {
    const ranges = await getRanges(t);
    const member = await getMemberId(t);

    return ranges.getTimeSpentByMemberId(member.id);
}

/**
 * Start timer
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function startTimer (t) {
    const listId = (await t.card('idList')).idList;
    const memberId = await getMemberId(t);
    const timers = await Timers.getFromContext(t);

    (await t.cards('all')).forEach(async (card) => {
        const cardTimers = await Timers.getFromCardId(t, card.id);
        const timer = cardTimers.getByMember(memberId);

        if (timer !== null) {
            const rangesData = await t.get(card.id, 'shared', dataPrefix + '-ranges', []);
            const ranges = Ranges.unserialize(rangesData || []);

            ranges.addRange(
                timer.memberId,
                timer.start,
                Math.floor(new Date().getTime() / 1000)
            );

            await ranges.saveByCardId(t, card.id)

            cardTimers.removeByMember(memberId);
            await cardTimers.saveByCardId(t, card.id);
        }

        if (cardTimers.removeByMember(memberId)) {
            cardTimers.saveByCardId(t, card.id);
        }
    });

    timers.startByMember(memberId, listId);

    await timers.saveForContext(t);
}

/**
 * Stop timer
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function stopTimer (t) {
    const memberId = await getMemberId(t);
    const timers = await Timers.getFromContext(t);
    const timer = timers.getByMember(memberId);
    timers.removeByMember(memberId);
    await timers.saveForContext(t);

    if (timer !== null) {
        const threshold = await getThresholdForTrackings(t);

        if (Math.abs(Math.floor(new Date().getTime() / 1000) - timer.start) < threshold) {
            t.alert({
                message: `Time tracking ignored. Threshold for registering new trackings is ${threshold} second(s).`,
                duration: 3,
            });

            return;
        }

        const ranges = await getRanges(t, true);

        ranges.addRange(
            timer.memberId,
            timer.start,
            Math.floor(new Date().getTime() / 1000)
        );

        try {
            await ranges.saveForContext(t);
        } catch (e) {
            if ((e + '').indexOf('PluginData length of 4096 characters exceeded') !== -1) {
                const currentTrackings = await getRanges(t, true);

                try {
                    await currentTrackings.saveForContext(t);

                    t.alert({
                        message: 'Unable to save new time tracking. Too many exists on the same card.',
                        duration: 6,
                    });
                } catch (e) {
                    t.alert({
                        message: 'Unable to save new time tracking. Too many exists on the same card.',
                        duration: 3,
                    });

                    throw e;
                }
            } else {
                t.alert({
                    message: 'Unrecognized error occurred while trying to stop the timer. Post issue on Github for assistance.',
                    duration: 3,
                });

                throw e;
            }
        }
    }
}

/**
 * @param {number} secondsToFormat
 * @param {boolean} [allowSeconds]
 *
 * @returns {string}
 */
function formatTime (secondsToFormat, allowSeconds) {
    allowSeconds = allowSeconds || false;

    const hours = Math.floor(secondsToFormat / 3600);
    const minutes = Math.floor((secondsToFormat % 3600) / 60);
    const seconds = secondsToFormat % 60;
    const timeFormat = [];

    if (hours > 0) {
        timeFormat.push(hours + 'h');
    }

    if (minutes > 0) {
        timeFormat.push(minutes + 'm');
    }

    if (allowSeconds && seconds > 0) {
        timeFormat.push(seconds + 's');
    }

    return (timeFormat.length > 0 ? timeFormat.join(' ') : '0m');
}

/**
 * @param {Date} date
 * @param {boolean} [returnOnlyTimeString]
 *
 * @returns {string}
 */
function formatDate (date, returnOnlyTimeString) {
    returnOnlyTimeString = returnOnlyTimeString || false;

    const dateStr = [
        date.getFullYear(),
        ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1),
        (date.getDate() < 10 ? '0' : '') + date.getDate()
    ];

    const timeStr = [
        (date.getHours() < 10 ? '0' : '') + date.getHours(),
        (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
    ];

    return (returnOnlyTimeString ? '' : dateStr.join('-') + ' ') + timeStr.join(':');
}

/**
 * Is estimate feature enabled?
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function hasNotificationsFeature (t) {
    return !(await t.get('member', 'private', dataPrefix + '-disable-notifications')) && Notification.permission === 'granted';
}

/**
 * Disable estimate feature.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function disableNotificationsFeature (t) {
    await t.set('member', 'private', dataPrefix + '-disable-notifications', 1);
}

/**
 * Enable estimate feature
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function enableNotificationsFeature (t) {
    await t.remove('member', 'private', dataPrefix + '-disable-notifications');
}

/**
 * @param t
 *
 * @param percentage
 *
 * @returns {Promise<void>}
 */
async function setNotificationPercentage (t, percentage) {
    await t.set('member', 'private', dataPrefix + '-notifications-percentage', parseInt(percentage, 10));
}


/**
 * @param t
 *
 * @returns {Promise<null|number>}
 */
async function getNotificationPercentage (t) {
    const percentage = await t.get('member', 'private', dataPrefix + '-notifications-percentage');

    if (percentage) {
        return parseInt(percentage, 10);
    }

    return 80;
}

/**
 * Check if a members notification have already been fired.
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function hasTriggeredNotification (t) {
    return !!(await t.get('card', 'private', dataPrefix + '-notifications-triggered'));
}

/**
 * Trigger notification.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function triggerNotification (t) {
    const notificationsPercentage = await getNotificationPercentage(t);
    await t.set('card', 'private', dataPrefix + '-notifications-triggered', 1);
    new Notification("You've passed " + notificationsPercentage + "% of your estimated time");
}

/**
 * Whether or not notification can trigger.
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function canTriggerNotification (t) {
    const isNotificationsEnabled = await hasNotificationsFeature(t);

    if (!isNotificationsEnabled) {
        return false;
    }

    const timeSpent = await getOwnTotalSeconds(t);

    if (timeSpent === 0) {
        return false;
    }

    const notificationsPercentage = await getNotificationPercentage(t);

    if (notificationsPercentage === 0) {
        return false;
    }

    const notificationTriggered = await hasTriggeredNotification(t);

    if (notificationTriggered) {
        return false;
    }

    const estimate = await getOwnEstimate(t);

    if (estimate === 0) {
        return false;
    }

    return timeSpent >= ((estimate / 100) * notificationsPercentage);
}

/**
 * Is estimate feature enabled?
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function hasEstimateFeature (t) {
    return !(await t.get('board', 'shared', dataPrefix + '-disable-estimate'));
}

/**
 * Disable estimate feature.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function disableEstimateFeature (t) {
    await t.set('board', 'shared', dataPrefix + '-disable-estimate', 1);
}

/**
 * Enable estimate feature
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function enableEstimateFeature (t) {
    await t.remove('board', 'shared', dataPrefix + '-disable-estimate');
}

/**
 * Is auto-timer enabled?
 *
 * @param t
 *
 * @returns {Promise<boolean>}
 */
async function hasAutoTimer (t) {
    return !!(await t.get('board', 'shared', dataPrefix + '-auto-timer'));
}

/**
 * Disable auto-timer feature.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function disableAutoTimer (t) {
    await t.set('board', 'shared', dataPrefix + '-auto-timer', 0);
}

/**
 * Enable auto-timer feature.
 *
 * @param t
 *
 * @returns {Promise<void>}
 */
async function enableAutoTimer (t) {
    await t.set('board', 'shared', dataPrefix + '-auto-timer', 1);
}

/**
 * Set list id of the list that should trigger auto-timer tracking.
 *
 * @param t
 * @param {string} listId
 *
 * @returns {Promise<void>}
 */
async function setAutoTimerListId (t, listId) {
    await t.set('board', 'shared', dataPrefix + '-auto-timer-list-id', listId);
}

/**
 * Get list id of the list that should trigger auto-timer tracking.
 *
 * @param t
 *
 * @returns {Promise<*>}
 */
async function getAutoTimerListId (t) {
    return await t.get('board', 'shared', dataPrefix + '-auto-timer-list-id', '');
}

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

/**
 * Get list id of the list that should trigger auto-timer tracking.
 *
 * @param t
 *
 * @returns {Promise<*>}
 */
async function getThresholdForTrackings (t) {
    return parseInt((await t.get('board', 'shared', dataPrefix + '-auto-timer-threshold-trackings', 30)), 10);
}

/**
 * @param t
 * @param {number} threshold
 *
 * @returns {Promise<void>}
 */
async function setThresholdForTrackings (t, threshold) {
    await t.set('board', 'shared', dataPrefix + '-auto-timer-threshold-trackings', threshold);
}

/**
 * Because we don't have the card context we need to utilize card badges with a interval to get card context.
 *
 * @param {string} cardId
 */
function requestTimerStart (cardId) {
    requestTimerStartId = cardId;
}

/**
 * Card badges capability handler.
 *
 * @param t
 *
 * @returns {Promise<Array>}
 */
async function cardBadges (t) {
    const items = [
        // Current time tracked badge
        {
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
                        let didChangeList = false;
                        const hasStopOnMove = await hasSettingStopOnMove(t);

                        if (hasStopOnMove) {
                            const listId = (await t.card('idList')).idList;
                            const timers = await Timers.getFromContext(t);

                            timers.items.forEach((timer) => {
                                if (timer.listId !== listId) {
                                    didChangeList = true;
                                }
                            });
                        }

                        if (hasStopOnMove && didChangeList) {
                            await stopTimer(t);
                        } else {
                            const shouldTriggerNotification = await canTriggerNotification(t);

                            if (shouldTriggerNotification) {
                                await triggerNotification(t);
                            }

                            object.color = 'red';
                        }
                    }
                }

                return object;
            }
        },
        // Others tracking badge
        {
            dynamic: async function () {
                const memberId = await getMemberId(t);
                const running = (await Timers.getFromContext(t)).items.filter((item) => {
                    return item.memberId !== memberId;
                }).length > 0;


                const object = {
                    refresh: 60
                };

                if (running) {
                    object.icon = clockImage;
                    object.color = 'blue';
                }

                return object;
            }
        }
    ];

    const hasAutoTimerFeature = await hasAutoTimer(t);
    const autoTimerListId = await getAutoTimerListId(t);

    if (hasAutoTimerFeature && autoTimerListId) {
        items.push(
            /**
             * This requires some explaining. Because t.set() for cards require us to have an active card context -
             * & there being no other way of getting one through the SDK. Then i came up with this "hack" where we
             * use an empty badge that has a refresh timer of 2 seconds. The badge in it-self doesn't display.
             * It's just there for allowing us to detect if we need to start the timer for this card.
             */
            {
                dynamic: async function () {
                    if (requestTimerStartId === t.getContext().card) {
                        requestTimerStartId = null;

                        const listId = (await t.card('idList')).idList;
                        const autoTimerListId = await getAutoTimerListId(t);

                        // Sometimes websocket events come in a bit late & card might have changed list.
                        // So we need to validate that it still exists in the list that should auto-trigger the timer.
                        if (listId !== autoTimerListId) {
                            return;
                        }

                        await startTimer(t);
                    }

                    return {
                        refresh: 2
                    };
                }
            }
        );
    }

    const hasEstimateVar = await hasEstimateFeature(t);

    if (hasEstimateVar) {
        const totalEstimate = await getTotalEstimate(t);

        if (totalEstimate > 0) {
            items.push({
                icon: estimateImage,
                text: 'Estimate: ' + formatTime(totalEstimate)
            });
        }
    }

    return items;
}

/**
 * @param t
 * @param {Date} [_start]
 * @param {Date} [_end]
 */
function openManuallyAdd(t, _start, _end) {
    _start = _start || new Date();
    _end = _end || new Date();

    return t.popup({
        title: 'Manually add time tracking',
        items: function (t) {
            return [
                {
                    text: 'Edit start (' + formatDate(_start) + ')',
                    callback: (t) => {
                        return t.popup({
                            type: 'datetime',
                            title: 'Change start (' + formatDate(_start) + ')',
                            callback: async function(t, opts) {
                                openManuallyAdd(t, new Date(opts.date), _end);
                            },
                            date: _start
                        });
                    }
                },
                {
                    text: 'Edit end (' + formatDate(_end) + ')',
                    callback: (t) => {
                        return t.popup({
                            type: 'datetime',
                            title: 'Change end (' + formatDate(_start) + ')',
                            callback: async function(t, opts) {
                                openManuallyAdd(t, _start, new Date(opts.date));
                            },
                            date: _end
                        });
                    }
                },
                {
                    text: 'Add',
                    callback: async (t) => {
                        // Only save new time tracking if they're different
                        if (_start.getTime() !== _end.getTime()) {
                            const member = await getMemberId(t);
                            const ranges = await getRanges(t, true);

                            ranges.addRange(
                                member.id,
                                Math.floor(new Date(_start).getTime() / 1000),
                                Math.floor(new Date(_end).getTime() / 1000)
                            );

                            await ranges.saveForContext(t);
                        } else {
                            t.alert({
                                message: 'Unable to add time tracking. Start & end was the same.',
                                duration: 3,
                            });
                        }

                        return t.closePopup();
                    }
                }
            ];
        }
    });
}

/**
 * Card buttons capability handler.
 *
 * @param t
 *
 * @returns {Array}
 */
function cardButtons (t) {
    const items = [
        {
            icon: clockImage,
            text: 'Manage time',
            callback: function (t) {
                return t.popup({
                    title: 'Manage time',
                    items: async function (t) {
                        const ranges = await getRanges(t, true, true);
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
                        }).forEach((member) => {
                            const memberRanges = ranges.items.map((range, rangeIndex) => {
                                range.rangeIndex = rangeIndex;
                                return {
                                    rangeIndex,
                                    item: range
                                };
                            }).filter((range) => {
                                return range.item.memberId === member.id;
                            });

                            if (memberRanges.length > 0) {
                                items.push({
                                    'text': member.fullName + (member.fullName !== member.username ? ' (' + member.username + ')' : '') + ':'
                                });

                                memberRanges.forEach((range) => {
                                    const start = new Date(range.item.start * 1000);
                                    const end = new Date(range.item.end * 1000);
                                    const rangeOnTheSameDay = start.toDateString() === end.toDateString();
                                    const rangeLengthInSeconds = range.item.end - range.item.start;

                                    const _rangeIndex = range.rangeIndex;
                                    const _range = range;

                                    items.push({
                                        text: `${formatDate(start)} - ${formatDate(end, rangeOnTheSameDay)} (${formatTime(rangeLengthInSeconds, false)})${_range.item.isTracking ? ' (tracking)' : ''}`,
                                        callback: function (t) {
                                            if (_range.item.isTracking) {
                                                return;
                                            }

                                            return t.popup({
                                                title: 'Edit time range',
                                                items: function (t) {
                                                    const _start = new Date(_range.item.start * 1000);
                                                    const _end = new Date(_range.item.end * 1000);

                                                    return [
                                                        {
                                                            text: 'Edit start (' + formatDate(start) + ')',
                                                            callback: (t) => {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change start from (' + formatDate(_start) + ')',
                                                                    callback: async function(t, opts) {
                                                                        const ranges = await getRanges(t, true);
                                                                        ranges.items[_rangeIndex].start = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        await ranges.saveForContext(t);
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
                                                                        const ranges = await getRanges(t, true);
                                                                        ranges.items[_rangeIndex].end = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        await ranges.saveForContext(t);
                                                                        return t.closePopup();
                                                                    },
                                                                    date: _end
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Delete',
                                                            callback: async (t) => {
                                                                const ranges = await getRanges(t, true);
                                                                ranges.deleteRangeByIndex(_rangeIndex);
                                                                await ranges.saveForContext(t);
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
                                'text': 'Add manually',
                                callback: (t) => openManuallyAdd(t)
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
                                            await t.remove('card', 'shared', dataPrefix + '-running');
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
                        const ranges = await getRanges(t, true, true);
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
                            const timeSpent = ranges.getTimeSpentByMemberId(member.id);

                            if (timeSpent !== 0) {
                                items.push({
                                    'text': member.fullName + (member.fullName !== member.username ? ' (' + member.username + ')' : '') + ': ' +  formatTime(timeSpent)
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

    if ('Notification' in window) {
        items.push({
            icon: clockImage,
            text: 'Notifications',
            callback: (t) => {
                return t.popup({
                    title: 'Activity timer notifications',
                    url: t.signUrl('./notifications.html'),
                    height: 85
                });
            }
        });
    }

    if (window.location.href.indexOf('gitpod.io') !== -1) {
        items.push({
            icon: clockImage,
            text: 'Clear data',
            callback: async (t) => {
                await t.remove('card', 'shared', dataPrefix + '-estimates');
                await t.remove('card', 'shared', dataPrefix + '-ranges');
                await t.remove('card', 'private', dataPrefix + '-notifications-triggered');
                await t.remove('member', 'private', dataPrefix + '-disable-notifications');
                await t.remove('member', 'private', dataPrefix + '-notifications-percentage')
                await t.remove('card', 'shared', dataPrefix + '-running');
            }
        });
    }

    items.push({
        icon: clockImage,
        text: 'Settings',
        callback: async (t) => {
            return t.popup({
                title: 'Settings',
                url: t.signUrl('./personal_settings.html'),
                height: 85
            });
        }
    });

    return items;
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
 * @returns {Array}
 */
function boardButtons () {
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
    isRunning,
    getTotalSeconds,
    startTimer,
    stopTimer,
    formatTime,
    clockImage,
    cardBackSection,
    boardButtons,
    apiKey,
    appName,
    apiHost,
    websocket,
    getOwnEstimate,
    getTotalEstimate,
    createEstimate,
    getEstimates,
    showSettings,
    hasEstimateFeature,
    disableEstimateFeature,
    enableEstimateFeature,
    enableNotificationsFeature,
    disableNotificationsFeature,
    hasNotificationsFeature,
    setNotificationPercentage,
    getNotificationPercentage,
    clearEstimates,
    deleteEstimate,
    hasSettingStopOnMove,
    setSettingStopOnMove,
    requestTimerStart,
    hasAutoTimer,
    enableAutoTimer,
    disableAutoTimer,
    setAutoTimerListId,
    getAutoTimerListId,
    getThresholdForTrackings,
    setThresholdForTrackings,
    debounce
};
