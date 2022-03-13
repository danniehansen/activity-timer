import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';
import { clearToken } from '../../components/trello';
import { isVisible } from '../../utils/visibility';

const icon = `${window.location.origin}${ClockImage}`;

export async function getBoardButtons (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.BoardButtonCallback[]> {
  const visible = await isVisible();

  if (!visible) {
    return [];
  }

  return [
    {
      icon: {
        light: icon,
        dark: icon
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
                message: 'This will disrupt the auto tracking start feature if you have it enabled.',
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

        await t.popup({
          title: 'Activity timer',
          items
        });
      }
    }
  ];
}
