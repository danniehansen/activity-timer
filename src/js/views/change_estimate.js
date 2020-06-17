require('../../sass/main.scss');

const { getOwnEstimate, createEstimate } = require('../shared.js');
const t = window.TrelloPowerUp.iframe();

t.render(async function() {
    t.sizeTo('body');
});