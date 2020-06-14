const t = window.TrelloPowerUp.iframe();

t.render(async function() {
    const cards = await t.card('all');
    console.log('cards:', cards);
    t.sizeTo('body');
});