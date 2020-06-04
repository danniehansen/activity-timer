function getRanges(t, noCurrent) {
    noCurrent = noCurrent || false;

    return new Promise(function (resolve) {
        t.get('card', 'shared', 'act-timer-ranges', []).then(function (ranges) {
            if (noCurrent) {
                resolve(ranges);
            }

            t.get('card', 'private', 'act-timer-start').then(function (startTime) {
                t.member('id')
                    .then(function (member) {
                        if (startTime) {
                            ranges.push([member.id, startTime[0], Math.floor((new Date().getTime() / 1000))]);
                        }

                        resolve(ranges);
                    });
            });
        });
    });
}

function isRunning(t) {
    return new Promise(function (resolve) {
        t.get('card', 'private', 'act-timer-start').then(function (data) {
            resolve(data ? true : false);
        }).catch(function () {
            resolve(false);
        });
    });
}

function getTotalSeconds(t) {
    return new Promise(function (resolve) {
        getRanges(t).then(function (ranges) {
            var totalSeconds = 0;

            ranges.forEach(function (range) {
                if (typeof range[1] !== 'undefined' && typeof range[2] !== 'undefined') {
                    totalSeconds += (range[2] - range[1]);
                }
            });

            resolve(totalSeconds);
        });
    });
}

function startTimer(t) {
    t.card('idList').then(function (data) {
        t.set('card', 'private', 'act-timer-start', [Math.floor((new Date().getTime() / 1000)), data.idList]);
    });
}

function stopTimer(t) {
    t.get('card', 'private', 'act-timer-start').then(function (data) {
        if (data) {
            getRanges(t).then(function (ranges) {
                t.set('card', 'shared', 'act-timer-ranges', ranges);
                t.remove('card', 'private', 'act-timer-start');
            });
        }
    });
}

function formatTime(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var seconds = Math.floor(seconds % 60);

    return [(hours < 10 ? '0' : '') + hours, (minutes < 10 ? '0' : '') + minutes, (seconds < 10 ? '0' : '') + seconds].join(':');
}

function formatDate(date) {
    var dateStr = [
        date.getFullYear(),
        ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1),
        (date.getDate() < 10 ? '0' : '') + date.getDate()
    ];

    var timeStr = [
        (date.getHours() < 10 ? '0' : '') + date.getHours(),
        (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
    ];

    return dateStr.join('-') + ' ' + timeStr.join(':');
}

window.TrelloPowerUp.initialize({
    'card-badges': function (t, opts) {
        return [{
            // Dynamic badges can have their function rerun
            // after a set number of seconds defined by refresh.
            // Minimum of 10 seconds.
            dynamic: function(){
                return new Promise(function (resolve) {
                    isRunning(t).then(function (running) {
                        getTotalSeconds(t).then(function (time) {
                            const object = {
                                refresh: 10
                            };

                            if (time !== 0) {
                                object.text = 'Time: ' + formatTime(time);

                                if (running) {
                                    object.color = 'red';

                                    t.get('card', 'private', 'act-timer-start').then(function (startTime) {
                                        t.card('idList').then(function (data) {
                                            if (startTime[1] != data.idList) {
                                                stopTimer(t);
                                            }
                                        });
                                    });
                                }/* else {
                  t.list('name').then(function (data) {
                    if (data.name.toLowerCase() === 'in progress') {
                      startTimer(t);
                    }
                  });
                }*/
                            }/* else if (!running) {
                t.list('name').then(function (data) {
                  if (data.name.toLowerCase() === 'in progress') {
                    startTimer(t);
                  }
                });
              }*/

                            resolve(object);
                        });
                    });
                });
            }
        }];
    },
    'card-buttons': function (t, opts) {
        return [{
            icon: 'https://cdn.glitch.com/51518f99-3edd-4720-8127-ece0d1460d98%2Fclock.svg?v=1590086620772',
            text: 'Clear data',
            callback: function () {
                t.remove('card', 'private', 'act-timer-start');
                t.remove('card', 'shared', 'act-timer-ranges');
            },
            condition: 'edit'
        }, {
            icon: 'https://cdn.glitch.com/51518f99-3edd-4720-8127-ece0d1460d98%2Fclock.svg?v=1590086620772',
            text: 'Manage time',
            callback: function (t, opts) {
                return t.popup({
                    title: 'Manage time',
                    items: function (t, options) {
                        return new Promise(function (resolve) {
                            getRanges(t, true).then(function (ranges) {
                                var items = [];

                                ranges.forEach(function (range, rangeIndex) {
                                    var start = new Date(range[1] * 1000);
                                    var end = new Date(range[2] * 1000);
                                    var _rangeIndex = rangeIndex;
                                    var _range = range;

                                    items.push({
                                        text: formatDate(start) + ' - ' + formatDate(end),
                                        callback: function (t, opts) {
                                            return t.popup({
                                                title: 'Edit time range',
                                                items: function (t, options) {
                                                    var _start = new Date(_range[1] * 1000);
                                                    var _end = new Date(_range[2] * 1000);

                                                    return [
                                                        {
                                                            text: 'Edit start (' + formatDate(start) + ')',
                                                            callback: function (t, opts) {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change start',
                                                                    callback: function(t, opts) {
                                                                        _range[1] = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        ranges[_rangeIndex] = _range;
                                                                        t.set('card', 'shared', 'act-timer-ranges', ranges);
                                                                        return t.closePopup();
                                                                    }
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Edit end (' + formatDate(end) + ')',
                                                            callback: function (t, opts) {
                                                                return t.popup({
                                                                    type: 'datetime',
                                                                    title: 'Change end from (' + formatDate(_end) + ')',
                                                                    callback: function(t, opts) {
                                                                        _range[2] = Math.floor(new Date(opts.date).getTime() / 1000);
                                                                        ranges[_rangeIndex] = _range;
                                                                        t.set('card', 'shared', 'act-timer-ranges', ranges);
                                                                        return t.closePopup();
                                                                    },
                                                                    date: _end
                                                                });
                                                            }
                                                        },
                                                        {
                                                            text: 'Delete',
                                                            callback: function (t, opts) {
                                                                ranges.splice(_rangeIndex, 1);
                                                                t.set('card', 'shared', 'act-timer-ranges', ranges);
                                                                t.closePopup();
                                                            }
                                                        }
                                                    ];
                                                }
                                            });
                                        },
                                    });
                                });

                                resolve(items);
                            });
                        });
                    }
                });
            },
            condition: 'edit'
        }];
    },
    'card-detail-badges': function (t, opts) {
        return [{
            dynamic: function(){
                return new Promise(function (resolve) {
                    isRunning(t).then(function (running) {
                        getTotalSeconds(t).then(function (time) {
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

                            resolve(object);
                        });
                    });
                });
            }
        }, {
            dynamic: function(){
                return new Promise(function (resolve) {
                    getTotalSeconds(t).then(function (time) {
                        const object = {
                            refresh: 10
                        };

                        if (time !== 0) {
                            object.text = 'Time: ' + formatTime(time);
                        }

                        resolve(object);
                    });
                });
            }
        }];
    }
});