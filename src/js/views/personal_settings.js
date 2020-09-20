require('../../sass/main.scss');

const { setSettingStopOnMove, hasSettingStopOnMove } = require('../shared.js');
const t = window.TrelloPowerUp.iframe();

const stopOnMoveCheckbox = document.getElementById('stop-on-move');

stopOnMoveCheckbox.addEventListener('change', async () => {
    await setSettingStopOnMove(t, stopOnMoveCheckbox.checked);
});

t.render(async () => {
    stopOnMoveCheckbox.checked = (await hasSettingStopOnMove(t));
});