require('../../sass/main.scss');
require('../sentry.js');

const {
    isRunning, getTotalSeconds, formatTime,
    startTimer, stopTimer, getOwnEstimate,
    getTotalEstimate, getEstimates,
    hasEstimateFeature, clearEstimates,
    deleteEstimate, deleteEstimateByIndex
} = require('../shared.js');

const t = window.TrelloPowerUp.iframe();

const startTimerBtn = document.querySelector('.btn-start-timer');
const stopTimerBtn = document.querySelector('.btn-stop-timer');
const trackedTimeEl = document.querySelector('.tracked-time');
const cardEl = document.querySelector('.card');
const totalEstimateEl = document.querySelector('.total-estimate');
const estimateEl = document.querySelector('.estimate');

setInterval(async () => {
    const totalTime = await getTotalSeconds(t);
    trackedTimeEl.innerHTML = formatTime(totalTime);
}, 1000 * 10);

startTimerBtn.addEventListener('click', () => {
    startTimer(t);
});

stopTimerBtn.addEventListener('click', () => {
    stopTimer(t);
});

estimateEl.addEventListener('click', (e) => {
    t.popup({
        mouseEvent: e,
        title: 'Change estimate',
        url: './change_estimate.html',
        height: 120
    })
});

totalEstimateEl.addEventListener('click', (e) => {
    t.popup({
        mouseEvent: e,
        title: 'Estimates',
        items: async function (t) {
            const items = [];
            const estimates = await getEstimates(t);
            let board = await t.board('members');

            const membersFound = board.members.map((member) => member.id);

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
                const memberEstimates = estimates.filter((estimate) => {
                    return estimate[0] == member.id;
                });

                let memberEstimate = 0;

                memberEstimates.forEach((estimate) => {
                    memberEstimate += estimate[1];
                });

                if (memberEstimate > 0) {
                    items.push({
                        'text': member.fullName + (member.fullName != member.username ? ' (' + member.username + ')' : '') + ': ' + formatTime(memberEstimate),
                        callback: async (t) => {
                            return t.popup({
                                type: 'confirm',
                                title: 'Delete estimate?',
                                message: 'Are you sure you wish to delete this estimate?',
                                confirmText: 'Yes, delete',
                                onConfirm: async (t) => {
                                    await deleteEstimate(t, member.id);
                                    return t.closePopup();
                                },
                                confirmStyle: 'danger',
                                cancelText: 'No, cancel'
                            });
                        }
                    });
                }
            });

            estimates.forEach((estimate, estimateIndex) => {
                if (!membersFound.includes(estimate[0])) {
                    items.push({
                        'text': 'N/A: ' + formatTime(estimate[1]),
                        callback: async (t) => {
                            return t.popup({
                                type: 'confirm',
                                title: 'Delete estimate?',
                                message: 'Are you sure you wish to delete this estimate?',
                                confirmText: 'Yes, delete',
                                onConfirm: async (t) => {
                                    await deleteEstimateByIndex(t, estimateIndex);
                                    return t.closePopup();
                                },
                                confirmStyle: 'danger',
                                cancelText: 'No, cancel'
                            });
                        }
                    });
                }
            });

            items.push({
                text: 'Clear estimates',
                callback: async (t) => {
                    return t.popup({
                        type: 'confirm',
                        title: 'Are you sure?',
                        message: '',
                        confirmText: 'Yes, clear estimates',
                        onConfirm: async (t) => {
                            await clearEstimates(t);
                            return t.closePopup();
                        },
                        confirmStyle: 'danger',
                        cancelText: 'No, cancel'
                    });
                }
            });

            return items;
        }
    });
});

t.render(async function() {
    const running = await isRunning(t);
    const totalTime = await getTotalSeconds(t);
    const ownEstimate = await getOwnEstimate(t);
    const totalEstimate = await getTotalEstimate(t);

    if (running) {
        startTimerBtn.style.display = 'none';
        stopTimerBtn.style.display = 'inline-block';
    } else {
        startTimerBtn.style.display = 'inline-block';
        stopTimerBtn.style.display = 'none';
    }

    const hasEstimateFeatureVar = await hasEstimateFeature(t);

    if (hasEstimateFeatureVar) {
        estimateEl.innerHTML = formatTime(ownEstimate);
        estimateEl.style.display = 'block';

        if (ownEstimate !== totalEstimate) {
            totalEstimateEl.innerHTML = formatTime(totalEstimate);
            totalEstimateEl.style.display = 'block';
        } else {
            totalEstimateEl.style.display = 'none';
        }
    } else {
        estimateEl.style.display = 'none';
        totalEstimateEl.style.display = 'none';
    }

    trackedTimeEl.innerHTML = formatTime(totalTime);
    cardEl.style.display = 'block';

    try {
        t.sizeTo('body');
    } catch (e) {
        // Sometimes body has a height of 0 - wait a little while and try again
        setTimeout(() => {
            try {
                t.sizeTo('body');
            } catch (e) {
                // If error persist. Ignore it.
            }
        }, 500);
    }
});
