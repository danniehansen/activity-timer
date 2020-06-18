require('../../sass/main.scss');

const { getOwnEstimate, createEstimate } = require('../shared.js');
const t = window.TrelloPowerUp.iframe();

const saveEstimateBtn = document.querySelector('.btn-save-estimate');
const input = document.querySelector('input');

getOwnEstimate(t).then((currentEstimate) => {
    if (currentEstimate > 0) {
        input.value = currentEstimate / 3600;
    }
});

saveEstimateBtn.addEventListener('click', async () => {
    await createEstimate(t, parseFloat(input.value) * 3600);
    await t.closePopup();
});

t.render(async function() {
    t.sizeTo('.estimate-wrapper');
});