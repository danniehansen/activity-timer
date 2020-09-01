require('../../sass/main.scss');
require('../../sass/history.scss');

const { apiKey, appName, formatTime } = require('../shared.js');
const { ExportToCsv } = require('export-to-csv');

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
const authorizeEl = document.querySelector('.authorize');
const authorizeBtnEl = document.querySelector('.authorize-btn');

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
    name = null;
    closed = null;

    constructor(data) {
        this.id = data.id;
        this.ranges = [];
        this.labels = data.labels || [];
        this.name = data.name;
        this.closed = data.closed;

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

async function authorizeClickHandler () {
    await t.getRestApi().authorize({
        scope: 'read',
        expiration: '30days'
    });

    authorizeEl.style.display = 'none';
    loaderEl.style.display = 'block';

    await analyticsRenderer();
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
        let json;

        try {
            const data = await fetch('https://api.trello.com/1/boards/' + board.id + '/cards/all?pluginData=true&fields=id,name,labels,pluginData,closed&key=' + apiKey + '&token=' + token + '&r=' + new Date().getTime());
            json = await data.json();
        } catch (e) {
            loaderEl.style.display = 'none';
            authorizeEl.style.display = 'block';
            authorizeBtnEl.addEventListener('click', authorizeClickHandler);

            return;
        }

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

let lastResultRenderCards = [];

function processRow (row) {
    var finalVal = '';
    for (var j = 0; j < row.length; j++) {
        var innerValue = row[j] === null ? '' : row[j].toString();
        if (row[j] instanceof Date) {
            innerValue = row[j].toLocaleString();
        };
        var result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
        if (j > 0)
            finalVal += ';';
        finalVal += result;
    }
    return finalVal;
};

async function exportCsv () {
    const rows = [
        ['Card name', 'Card labels (comma separated)', 'Member name', 'Time (formatted)', 'Time (in seconds)'],
    ];


    if (lastResultRenderCards.length > 0 && typeof dataCache.membersById !== 'undefined') {
        lastResultRenderCards.forEach((item) => {
            const rangesByMember = {};

            item.ranges.forEach((range) => {
                rangesByMember[range.memberId] = rangesByMember[range.memberId] || 0;
                rangesByMember[range.memberId] += range.getTimeSpend();
            });

            if (Object.keys(rangesByMember).length > 0) {
                for (let memberId in rangesByMember) {
                    if (typeof dataCache.membersById[memberId] !== 'undefined') {
                        let name = dataCache.membersById[memberId].fullName || dataCache.membersById[memberId].username;

                        if (name !== dataCache.membersById[memberId].username) {
                            name += ' (' + dataCache.membersById[memberId].username + ')';
                        }

                        rows.push([
                            item.card.name,
                            item.card.labels.map((label) => label.name).join(', '),
                            name,
                            formatTime(rangesByMember[memberId], true),
                            rangesByMember[memberId]
                        ]);
                    }
                }
            }
        });
    }

    const options = { 
        fieldSeparator: ',',
        quoteStrings: '"',
        decimalSeparator: '.',
        showLabels: true,
        useTextFile: false,
        filename: 'activity-timer',
        useBom: true
      };
     
    const csvExporter = new ExportToCsv(options);
    csvExporter.generateCsv(rows);
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
        paragraphMembersEl.innerText = 'No members found';

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
    lastResultRenderCards = [];

    processedData.cards.forEach((card) => {
        if (selectedLabels.length === 0 || card.hasEitherLabels(selectedLabels)) {
            const resultItem = {
                card,
                ranges: []
            };

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

                    resultItem.ranges.push(range);

                    if (typeof timeSpentByMember[range.memberId] === 'undefined') {
                        timeSpentByMember[range.memberId] = 0;
                    }

                    timeSpentByMember[range.memberId] += range.getTimeSpend();
                }
            });

            if (resultItem.ranges.length > 0) {
                lastResultRenderCards.push(resultItem);
            }
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

    if (lastResultRenderCards.length > 0) {
        const button = document.createElement('button');
        button.className = 'mod-primary';
        button.textContent = 'Export to CSV';
        button.addEventListener('click', exportCsv);
        resultsEl.appendChild(button);
    }

    wrapperEl.style.display = 'block';
    loaderEl.style.display = 'none';

    t.sizeTo('body');
}

;(async () => {
    const isAuthorized = await t.getRestApi().isAuthorized();

    dateFrom.addEventListener('change', analyticsRenderer);
    dateTo.addEventListener('change', analyticsRenderer);

    if (isAuthorized) {
        loaderEl.style.display = 'block';
        await analyticsRenderer();
    } else {
        authorizeEl.style.display = 'block';
        authorizeBtnEl.addEventListener('click', authorizeClickHandler);
    }

    t.render(async () => {
        t.sizeTo('body');
    });
})();