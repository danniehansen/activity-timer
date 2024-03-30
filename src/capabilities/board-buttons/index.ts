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
            text: 'Data exporter - Time tracking',
            callback: async (t) => {
              await t.modal({
                url: t.signUrl('./index.html?page=time'),
                title: 'Activity timer - Data exporter - Time tracking',
                fullscreen: true
              });
            }
          },
          {
            text: 'Data exporter - Estimates',
            callback: async (t) => {
              await t.modal({
                url: t.signUrl('./index.html?page=estimates'),
                title: 'Activity timer - Data exporter - Estimates',
                fullscreen: true
              });
            }
          }
        ];

        if (hasRestApiToken) {
          items.push({
            text: 'Clear RestApi access',
            callback: async (t) => {
              return t.popup({
                type: 'confirm',
                title: 'Are you sure?',
                message:
                  'This will disrupt the auto tracking start feature if you have it enabled.',
                confirmText: 'Yes, clear RestApi access',
                onConfirm: async (t) => {
                  await clearToken(t);
                  await t.closePopup();
                  await t.alert({
                    message: 'Successfully cleared RestApi access',
                    display: 'success'
                  });
                },
                confirmStyle: 'danger',
                cancelText: 'No, cancel'
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
          text: 'Version: 2.8.0'
        });

        await t.popup({
          title: 'Activity timer',
          items
        });
      }
    }
  ];
}
