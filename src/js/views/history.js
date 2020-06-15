require('../../sass/main.scss');

const { apiKey, appName } = require('../shared.js');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

const membersEl = document.querySelector('.members');
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
        let labels = [];
        const labelsById = {};

        cards.forEach((card) => {
            card.ranges.forEach((range) => {
                if (members.indexOf(range.memberId) === -1) {
                    members.push(range.memberId);
                }
            });

            card.labels.forEach((label) => {
                if (labels.indexOf(label.id) === -1) {
                    labels.push(label.id);
                    labelsById[label.id] = label;
                }
            });
        });

        labels = labels.map((labelId) => {
            return labelsById[labelId];
        });

        const memberData = await fetch('https://api.trello.com/1/boards/' + board.id + '/members?fields=id,username,avatarUrl&key=' + apiKey + '&token=' + token);
        const memberJson = await memberData.json();

        dataCache = {
            cards,
            'members': memberJson.filter((member) => {
                return members.indexOf(member.id) !== -1;
            }),
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
    const membersFragment = document.createDocumentFragment();
    const labelsFragment = document.createDocumentFragment();

    processedData.members.forEach((member) => {
        const memberEl = document.createElement('div');
        memberEl.className = 'members__item';
        memberEl.innerText = member.username;

        const checkboxEl = document.createElement('input');
        checkboxEl.type = 'checkbox';
        checkboxEl.className = 'members__item-input';
        checkboxEl.id = 'member-' + member.id;

        const labelEl = document.createElement('label');
        labelEl.for = 'member-' + member.id;
        labelEl.className = 'members__item-label';

        memberEl.appendChild(checkboxEl);
        memberEl.appendChild(labelEl);

        membersFragment.appendChild(memberEl);
    });

    membersEl.childNodes.forEach((node) => {
        membersEl.removeChild(node);
    });

    membersEl.appendChild(membersFragment);

    processedData.labels.forEach((label) => {
        let labelWrapEl = document.createElement('div');
        labelWrapEl.className = 'labels__item';
        labelWrapEl.innerText = label.name;

        let checkboxEl = document.createElement('input');
        checkboxEl.type = 'checkbox';
        checkboxEl.className = 'labels__item-input';
        checkboxEl.id = 'label-' + label.id;

        let labelEl = document.createElement('label');
        labelEl.for = 'label-' + label.id;
        labelEl.className = 'labels__item-label';

        labelEl.appendChild(checkboxEl);
        labelEl.appendChild(labelEl);

        membersFragment.appendChild(labelWrapEl);
    });

    labelsEl.childNodes.forEach((node) => {
        labelsEl.removeChild(node);
    });

    labelsEl.appendChild(labelsFragment);

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