import { Trello } from '../../types/trello';
import ClockImageWhite from '../../assets/images/clock_white.svg';
import { clearToken, getMemberId } from '../../components/trello';
import { isVisible } from '../../utils/visibility';
import { Card } from '../../components/card';

export async function getBoardButtons(): Promise<
  Trello.PowerUp.BoardButtonCallback[]
> {
  const visible = await isVisible();

  if (!visible) {
    return [];
  }

  return [
    {
      icon: {
        light: `${
          !ClockImageWhite.includes('http') ? window.location.origin : ''
        }${ClockImageWhite}`,
        dark: `${
          !ClockImageWhite.includes('http') ? window.location.origin : ''
        }${ClockImageWhite}`
      },
      text: 'Activity timer',
      callback: async (t) => {
        let hasRestApiToken = false;

        try {
          hasRestApiToken = await t.getRestApi().isAuthorized();
        } catch (e) {
          // Ignore RestApi errors. Most likely due to incognito.
        }

        const items: Trello.PowerUp.PopupOptionsItem[] = [
          {
            text: 'Week Calendar',
            callback: async (t) => {
              await t.modal({
                url: t.signUrl('./index.html?page=calendar'),
                title: 'Activity timer - Week Calendar',
                fullscreen: true
              });
            }
          },
          {
            text: 'Export Time Tracking',
            callback: async (t) => {
              await t.modal({
                url: t.signUrl('./index.html?page=time'),
                title: 'Activity timer - Export Time Tracking',
                fullscreen: true
              });
            }
          },
          {
            text: 'Export Estimates',
            callback: async (t) => {
              await t.modal({
                url: t.signUrl('./index.html?page=estimates'),
                title: 'Activity timer - Export Estimates',
                fullscreen: true
              });
            }
          }
        ];

        if (hasRestApiToken) {
          items.push({
            text: 'Reset Connection',
            callback: async (t) => {
              return t.popup({
                type: 'confirm',
                title: 'Are you sure?',
                message:
                  "This will reset your connection. Use this if features aren't working properly. You'll need to reconnect afterwards.",
                confirmText: 'Yes, reset',
                onConfirm: async (t) => {
                  await clearToken(t);
                  await t.closePopup();
                  await t.alert({
                    message: 'Connection reset successfully',
                    display: 'success'
                  });
                },
                confirmStyle: 'danger',
                cancelText: 'Cancel'
              });
            }
          });
        }

        // Check if active timer is running
        let running = false;

        const cards = await t.cards('id');
        const memberId = await getMemberId();

        for (const card of cards) {
          const cardModel = new Card(card.id);
          const cardTimers = await cardModel.getTimers();
          const timer = cardTimers.getByMemberId(memberId);

          if (timer) {
            running = true;

            items.push({
              text: 'Timer: Running. Click to open card',
              callback: async (t) => {
                t.closePopup();

                return t.showCard(card.id);
              }
            });
          }
        }

        if (!running) {
          items.push({
            text: 'Timer: Not running'
          });
        }

        items.push({
          text: 'Version: 2.9.0'
        });

        await t.popup({
          title: 'Activity timer',
          items
        });
      }
    }
  ];
}
