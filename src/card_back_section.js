const { isRunning, getTotalSeconds } = require('./shared.js');

;(async function () {
    const isRunning = await isRunning();
    const seconds = await getTotalSeconds();

    console.log('isRunning:', isRunning);
    console.log('seconds:', seconds);
})();