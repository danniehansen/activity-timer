require('../sentry.js');

const {
    cardBadges,
    cardButtons,
    cardBackSection,
    boardButtons,
    showSettings,
    websocket,
    requestTimerStart,
    hasAutoTimer,
    getAutoTimerListId
} = require('../shared.js');

// Sometimes window.TrelloPowerUp isn't available.
// I suppose it can be due to network errors. But
// adding this check to avoid undefined sentry logs.
if (typeof window.TrelloPowerUp !== 'undefined') {
    const t = window.TrelloPowerUp.initialize({
        'card-badges': cardBadges,
        'card-buttons': cardButtons,
        'card-back-section': cardBackSection,
        'board-buttons': boardButtons,
        'show-settings': showSettings
    });

    let lastWebsocketConnection = null;

    /**
     * @param {string} memberId
     */
    function initiateWebsocket(memberId) {
        // Security measures to avoid spamming new connections
        if (lastWebsocketConnection !== null && Math.abs(new Date().getTime() - lastWebsocketConnection) < 5000) {
            t.alert({
                message: 'Attempted to establish too many connections. Auto-timer will be de-activated for this session.',
                duration: 6,
            });

            return;
        }

        lastWebsocketConnection = new Date().getTime();

        const socket = new WebSocket(websocket);

        socket.onopen = (e) => {
            socket.send(JSON.stringify({'listen_member_id': memberId}));
        };

        socket.onerror = (e) => {
            socket.close();
        };

        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);

                if (data.type && data.type === 'startTimer' && data.cardId) {
                    requestTimerStart(data.cardId);
                }
            } catch (e) {
            }
        };

        socket.onclose = (e) => {
            // API Gateway websockets auto-close after 10 minutes. So we just initiate a new connection.
            initiateWebsocket(memberId);
        };
    }

    (async () => {
        const hasAutoTimerFeature = await hasAutoTimer(t);
        const autoTimerListId = await getAutoTimerListId(t);

        if (hasAutoTimerFeature && autoTimerListId) {
            const member = await t.member('id');
            initiateWebsocket(member.id);
        }
    })();
}
