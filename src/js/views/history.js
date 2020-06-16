require('../../sass/main.scss');
require('../../sass/history.scss');

const { apiKey, appName, formatTime } = require('../shared.js');
const gravatar = require('gravatar');

const t = window.TrelloPowerUp.iframe({
    appKey: apiKey,
    appName: appName
});

const membersEl = document.querySelector('.members');
const labelsEl = document.querySelector('.labels');
const resultsEl = document.querySelector('.result-items');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const loaderEl = document.querySelector('.loader');
const wrapperEl = document.querySelector('.wrapper');

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

    getTimeSpend () {
        return this.endTime - this.startTime;
    }
}

class Card {
    id = null;
    ranges = null;
    labels = null;

    constructor(data) {
        this.id = data.id;
        this.ranges = [];
        this.labels = data.labels || [];

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

    hasEitherLabels (labels) {
        if (this.labels === null || this.labels.length === 0) {
            return false;
        }

        let match = false;

        this.labels.forEach((label) => {
            if (labels.indexOf(label.id) !== -1) {
                match = true;
            }
        });

        return match;
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

        const memberData = await fetch('https://api.trello.com/1/boards/' + board.id + '/members?fields=id,username,fullName,avatarUrl&key=' + apiKey + '&token=' + token);
        const memberJson = await memberData.json();

        const cardMembers = memberJson.filter((member) => {
            return members.indexOf(member.id) !== -1;
        });

        const membersById = {};

        cardMembers.forEach((member) => {
            membersById[member.id] = member;
        });

        dataCache = {
            cards,
            members: cardMembers,
            membersById,
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
    // Fetch processed trello data
    const processedData = await fetchData();

    // Construct fragments
    const membersFragment = document.createDocumentFragment();
    const labelsFragment = document.createDocumentFragment();
    const resultsFragment = document.createDocumentFragment();

    const selectedMembers = [];
    const selectedLabels = [];

    // Date filter
    const dateFromFilter = (dateFrom.value ? Math.floor(new Date(dateFrom.value).getTime() / 1000) : null);
    let dateToFilter = null;

    if (dateTo.value) {
        let dateToObj = new Date(dateTo.value);
        dateToFilter = Math.floor(new Date(dateToObj.getFullYear(), dateToObj.getMonth(), dateToObj.getDate(), 23, 59, 59).getTime() / 1000);
    }

    // Fetch selected members
    document.querySelectorAll('.members__item-input:checked').forEach((el) => {
        selectedMembers.push(el.getAttribute('data-id'));
    });

    // Fetch selected labels
    document.querySelectorAll('.labels__item-input:checked').forEach((el) => {
        selectedLabels.push(el.getAttribute('data-id'));
    });

    // Process members
    if (processedData.members.length > 0) {
        processedData.members.forEach((member) => {
            const memberEl = document.createElement('div');
            memberEl.className = 'members__item checkbox';

            const checkboxEl = document.createElement('input');
            checkboxEl.type = 'checkbox';
            checkboxEl.className = 'members__item-input';
            checkboxEl.id = 'member-' + member.id;
            checkboxEl.setAttribute('data-id', member.id);
            checkboxEl.addEventListener('change', analyticsRenderer);
            checkboxEl.checked = selectedMembers.indexOf(member.id) !== -1;

            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', 'member-' + member.id);
            labelEl.className = 'members__item-label';
            labelEl.innerText = member.fullName || member.username;

            memberEl.appendChild(checkboxEl);
            memberEl.appendChild(labelEl);

            membersFragment.appendChild(memberEl);
        });
    } else {
        const paragraphMembersEl = document.createElement('p');
        paragraphMembersEl.innerText = 'No labels found';

        membersFragment.appendChild(paragraphMembersEl);
    }

    // Cleanup existing member DOM nodes
    while (membersEl.firstChild) {
        membersEl.removeChild(membersEl.lastChild);
    }

    membersEl.appendChild(membersFragment);

    // Process labels
    if (processedData.labels.length > 0) {
        processedData.labels.forEach((label) => {
            let labelWrapEl = document.createElement('div');
            labelWrapEl.className = 'labels__item checkbox';

            let checkboxEl = document.createElement('input');
            checkboxEl.type = 'checkbox';
            checkboxEl.className = 'labels__item-input';
            checkboxEl.id = 'label-' + label.id;
            checkboxEl.setAttribute('data-id', label.id);
            checkboxEl.addEventListener('change', analyticsRenderer);
            checkboxEl.checked = selectedLabels.indexOf(label.id) !== -1;

            let labelEl = document.createElement('label');
            labelEl.setAttribute('for', 'label-' + label.id)
            labelEl.className = 'labels__item-label';
            labelEl.innerText = label.name;

            labelWrapEl.appendChild(checkboxEl);
            labelWrapEl.appendChild(labelEl);

            labelsFragment.appendChild(labelWrapEl);
        });
    } else {
        const paragraphLabelsEl = document.createElement('p');
        paragraphLabelsEl.innerText = 'No labels found';

        labelsFragment.appendChild(paragraphLabelsEl);
    }

    // Cleanup existing label DOM nodes
    while (labelsEl.firstChild) {
        labelsEl.removeChild(labelsEl.lastChild);
    }

    labelsEl.appendChild(labelsFragment);

    const timeSpentByMember = {};

    processedData.cards.forEach((card) => {
        if (selectedLabels.length === 0 || card.hasEitherLabels(selectedLabels)) {
            card.ranges.forEach((range) => {
                if (selectedMembers.length === 0 || selectedMembers.indexOf(range.memberId) !== -1) {
                    if (
                        dateFromFilter !== null &&
                        !(
                            dateFromFilter <= range.startTime ||
                            dateFromFilter <= range.endTime
                        )
                    ) {
                        return;
                    }

                    if (
                        dateToFilter !== null &&
                        !(
                            dateToFilter >= range.startTime ||
                            dateToFilter >= range.endTime
                        )
                    ) {
                        return;
                    }

                    if (typeof timeSpentByMember[range.memberId] === 'undefined') {
                        timeSpentByMember[range.memberId] = 0;
                    }

                    timeSpentByMember[range.memberId] += range.getTimeSpend();
                }
            });
        }
    });

    if (Object.keys(timeSpentByMember).length > 0) {
        for (const memberId in timeSpentByMember) {
            const resultEl = document.createElement('div');
            resultEl.className = 'result-item';

            const usernameEl = document.createElement('div');
            usernameEl.className = 'result-item__username';
            usernameEl.innerText = (dataCache.membersById[memberId].fullName != dataCache.membersById[memberId].username ? dataCache.membersById[memberId].fullName + ' (' + dataCache.membersById[memberId].username + ')' : dataCache.membersById[memberId].username) + ': ' + formatTime(timeSpentByMember[memberId]);
            resultEl.appendChild(usernameEl);

            resultsFragment.appendChild(resultEl);
        }
    } else {
        const paragraphEl = document.createElement('p');
        paragraphEl.innerText = 'No results found';

        resultsFragment.appendChild(paragraphEl);
    }

    while (resultsEl.firstChild) {
        resultsEl.removeChild(resultsEl.lastChild);
    }

    resultsEl.appendChild(resultsFragment);

    wrapperEl.style.display = 'block';
    loaderEl.style.display = 'none';

    t.sizeTo('body');
}

;(async () => {
    const isAuthorized = await t.getRestApi().isAuthorized();
    const authorizeEl = document.querySelector('.authorize');
    const authorizeBtnEl = document.querySelector('.authorize-btn');

    dateFrom.addEventListener('change', analyticsRenderer);
    dateTo.addEventListener('change', analyticsRenderer);

    if (isAuthorized) {
        loaderEl.style.display = 'block';
        await analyticsRenderer();
    } else {
        authorizeEl.style.display = 'block';
        authorizeBtnEl.addEventListener('click', async () => {
            if (!isAuthorized) {
                await t.getRestApi().authorize({
                    scope: 'read',
                    expiration: '30days'
                });

                authorizeEl.style.display = 'none';
                loaderEl.style.display = 'block';

                await analyticsRenderer();
            }
        });
    }

    t.render(async () => {
        t.sizeTo('body');
    });
})();