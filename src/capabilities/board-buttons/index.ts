import { Trello } from '../../types/trello';
import ClockImageWhite from '../../assets/images/clock_white.svg';
import CalendarImageWhite from '../../assets/images/calendar_white.svg';
import { clearToken, getMemberId, isAuthorized } from '../../components/trello';
import { isVisible } from '../../utils/visibility';
import { Card } from '../../components/card';
import * as Sentry from '@sentry/vue';
import {
  getConnectionState,
  reconnectWebsocket,
  ConnectionState
} from '../../components/websocket';
import { hasAutoTimer } from '../../utils/auto-timer';

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
          !CalendarImageWhite.includes('http') ? window.location.origin : ''
        }${CalendarImageWhite}`,
        dark: `${
          !CalendarImageWhite.includes('http') ? window.location.origin : ''
        }${CalendarImageWhite}`
      },
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
          },
          {
            text: 'Reset Connection',
            callback: async (t) => {
              let hasRestApiToken = false;

              try {
                hasRestApiToken = await isAuthorized(t);
              } catch (e) {
                // Ignore RestApi errors. Most likely due to incognito.
              }

              if (!hasRestApiToken) {
                return t.alert({
                  message:
                    'No connection to reset. Connect first by using a feature that requires authentication.',
                  display: 'info'
                });
              }

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
          }
        ];

        // Add menu item to find and go to running timer
        items.push({
          text: 'Go to Running Timer',
          callback: async (t) => {
            try {
              const cards = await t.cards('id');
              const memberId = await getMemberId();

              for (const card of cards) {
                const cardModel = new Card(card.id);
                const cardTimers = await cardModel.getTimers();
                const timer = cardTimers.getByMemberId(memberId);

                if (timer) {
                  // Found a running timer, close popup and open the card
                  t.closePopup();
                  return t.showCard(card.id);
                }
              }

              // No running timer found
              await t.alert({
                message: 'No running timer found',
                display: 'info'
              });
            } catch (e) {
              Sentry.captureException(e);

              await t.alert({
                message:
                  'An error occurred while trying to find a running timer',
                display: 'error'
              });
            }
          }
        });

        // Add menu item to check auto-timer connection status
        const autoTimerEnabled = await hasAutoTimer();
        if (autoTimerEnabled) {
          items.push({
            text: 'Check Auto-Timer Connection',
            callback: async (t) => {
              const state = getConnectionState();
              const stateMessages: Record<ConnectionState, string> = {
                [ConnectionState.DISCONNECTED]:
                  '🔴 Disconnected - Auto-timer is not active',
                [ConnectionState.CONNECTING]:
                  '🟡 Connecting to auto-timer service...',
                [ConnectionState.CONNECTED]:
                  '🟢 Connected - Auto-timer is working',
                [ConnectionState.RECONNECTING]:
                  '🟡 Reconnecting to auto-timer service...',
                [ConnectionState.FAILED]:
                  '🔴 Connection failed - Auto-timer may not work'
              };

              const message = stateMessages[state];

              if (
                state === ConnectionState.FAILED ||
                state === ConnectionState.DISCONNECTED
              ) {
                return t.popup({
                  type: 'confirm',
                  title: 'Auto-Timer Connection Status',
                  message: `${message}\n\nWould you like to try reconnecting?`,
                  confirmText: 'Reconnect',
                  onConfirm: async (t) => {
                    await reconnectWebsocket();
                    await t.closePopup();
                    await t.alert({
                      message: 'Attempting to reconnect...',
                      display: 'info'
                    });
                  },
                  cancelText: 'Close'
                });
              } else {
                await t.alert({
                  message,
                  display: 'info'
                });
              }
            }
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
