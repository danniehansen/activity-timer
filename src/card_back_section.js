const { isRunning, getTotalSeconds } = require('./shared.js');

console.log('back side');

var t = window.TrelloPowerUp.iframe();

t.render(function() {
    t.sizeTo('body');
});