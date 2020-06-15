require('../../sass/main.scss');

const { apiKey, appName } = require('../shared.js');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

const usersEl = document.querySelector('.users');
const labelsEl = document.querySelector('.labels');
const resultsEl = document.querySelector('.results');

let dataCache = null;

class Range {
    memberId = null;
    startTime = null;
    endTime = null;

    constructor(data) {
        this.memberId = data[0];
        this.startTime = data[1];
        this.endTime = data[2];
    }
}

class Card {
    id = null;
    ranges = null;
    labels = null;

    constructor(data) {
        this.id = data.id;
        this.ranges = [];
        this.labels = [];

        if (typeof data.labels !== 'undefined') {
            this.labels = data.labels.map((label) => {
                return label.name;
            });
        }

        if (typeof data.pluginData !== 'undefined') {
            data.pluginData.forEach((pluginData) => {
                if (pluginData.scope === 'card' && pluginData.access === 'shared') {
                    pluginData.value = JSON.parse(pluginData.value);

                    if (
                        typeof pluginData.value['act-timer-ranges'] !== 'undefined' &&
                        pluginData.value['act-timer-ranges'].length > 0
                    ) {
                        pluginData.value['act-timer-ranges'].forEach((range) => {
                            this.ranges.push(new Range(range));
                        });
                    }
                }
            });
        }
    }
}

/**
 * Fetch data & process it.
 *
 * @returns {Promise<{cards: *, members: [], labels: []}>}
 */
async function fetchData () {
    if (dataCache == null) {
        const token = await t.getRestApi().getToken();
        const board = await t.board('id');

        const data = await fetch('https://api.trello.com/1/boards/' + board.id + '/cards/all?pluginData=true&fields=id,labels,pluginData,closed&key=' + apiKey + '&token=' + token);
        const json = await data.json();

        const cards = json.map((item) => {
            return new Card(item);
        });

        const members = [];
        const labels = [];

        cards.forEach((card) => {
            card.ranges.forEach((range) => {
                if (members.indexOf(range.memberId) === -1) {
                    members.push(range.memberId);
                }
            });

            card.labels.forEach((label) => {
                if (labels.indexOf(label) === -1) {
                    labels.push(label);
                }
            });
        });

        const memberData = await fetch('https://api.trello.com/1/boards/' + board.id + '/members?fields=id,username,avatarUrl&key=' + apiKey + '&token=' + token);
        const memberJson = await memberData.json();

        console.log('memberJson:', memberJson);

        dataCache = {
            cards,
            members,
            labels,
        };
    }

    return dataCache;
}

/**
 * Analytics renderer.
 *
 * @returns {Promise<void>}
 */
async function analyticsRenderer () {
    const processedData = await fetchData();
    const usersFragment = document.createDocumentFragment();

    console.log('processedData:', processedData);

    document.querySelector('.wrapper').style.display = 'block';
}

;(async () => {
    const isAuthorized = await t.getRestApi().isAuthorized();
    const authorizeEl = document.querySelector('.authorize');
    const authorizeBtnEl = document.querySelector('.authorize-btn');

    if (isAuthorized) {
        await analyticsRenderer();
    } else {
        authorizeEl.style.display = 'block';
        authorizeBtnEl.addEventListener('click', async () => {
            if (!isAuthorized) {
                await t.getRestApi().authorize({
                    scope: 'read',
                    expiration: '30days'
                });

                authorizeEl.style.display = 'block';

                await analyticsRenderer();
            }
        });
    }

    t.render(async () => {
        t.sizeTo('body');
    });
})();