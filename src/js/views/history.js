const t = window.TrelloPowerUp.iframe();

t.render(async function() {
    console.log('history render');

    t.sizeTo('body');
});