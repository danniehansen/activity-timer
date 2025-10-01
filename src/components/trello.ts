import { Trello } from '../types/trello';
import { disableAutoTimer } from '../utils/auto-timer';
import { getAppKey } from './settings';

type TrelloInstance = Trello.PowerUp.Plugin | Trello.PowerUp.IFrame;

let trelloInstance: TrelloInstance | null = null;
let memberIdCache: string | null = null;

interface WebookResponseItem {
  id: string;
}

interface TrelloToken {
  dateCreated: string;
  dateExpires: string | null;
  id: string;
  idMember: string;
  identifier: string;
  permissions: {
    idModel: string;
    modelType: 'Board' | 'Organization';
    read: boolean;
    write: boolean;
  }[];
}

export function setTrelloInstance(t: TrelloInstance) {
  trelloInstance = t;
}

export function getTrelloInstance<T = TrelloInstance>(): T {
  return trelloInstance as T;
}

export function getTrelloCard(): Trello.PowerUp.IFrame {
  return trelloInstance as Trello.PowerUp.IFrame;
}

export function resizeTrelloFrame(): void {
  if (trelloInstance && 'sizeTo' in trelloInstance) {
    trelloInstance.sizeTo(document.documentElement.offsetHeight + 10);
  }
}

export async function getMemberId() {
  if (memberIdCache === null) {
    memberIdCache = (await getTrelloInstance().member('id')).id;
  }

  return memberIdCache;
}

export function getPowerupId() {
  if (typeof import.meta.env.VITE_POWERUP_ID !== 'string') {
    return '';
  }

  return import.meta.env.VITE_POWERUP_ID;
}

/**
 * Gets the REST API token and returns it only if it's valid.
 * Returns undefined if the token contains an error (e.g., when user denies authorization).
 * Trello returns tokens with &error= when authorization is rejected.
 */
export async function getValidToken(
  t?: Trello.PowerUp.IFrame
): Promise<string | undefined> {
  const token = await (t ?? getTrelloCard()).getRestApi().getToken();

  if (token && token.includes('&error=')) {
    return undefined;
  }

  return token;
}

/**
 * Checks if the user is truly authorized by validating the token.
 * This is more reliable than getRestApi().isAuthorized() which can return true
 * even when the user denies authorization.
 */
export async function isAuthorized(
  t?: Trello.PowerUp.IFrame
): Promise<boolean> {
  const token = await getValidToken(t);
  return token !== undefined;
}

export async function clearToken(t?: Trello.PowerUp.IFrame) {
  try {
    const token = await getValidToken(t);

    if (token) {
      // When token get's cleared - so do webhooks. Making it no longer functional. Better UI to disable auto timer then.
      await disableAutoTimer();

      // When clearing tokens we need to also clear the webhooks. Else it'll just continue to exist in infinity.
      // We don't want that..
      const response = await fetch(
        `https://api.trello.com/1/tokens/${token}/webhooks?key=${getAppKey()}`
      ).then<WebookResponseItem[]>((response) => response.json());

      if (response && response.length > 0) {
        const promises: Promise<Response>[] = [];

        response.forEach((item) => {
          promises.push(
            fetch(
              `https://api.trello.com/1/tokens/${token}/webhooks/${
                item.id
              }?key=${getAppKey()}`,
              {
                method: 'DELETE'
              }
            )
          );
        });

        await Promise.all(promises);
      }

      await (t ?? getTrelloCard()).getRestApi().clearToken();
    }
  } catch (e) {
    // Ignore issues related to incognito
    if (e instanceof Error && e.name === 'restApi::ApiNotConfiguredError') {
      return;
    }

    throw e;
  }
}

/**
 * Trello will have 1 RestApi token stored per powerup. So for us
 * to allow users only to grant read access on the data exporting
 * tools we need to gracefully handle revoking these tokens &
 * prepare the user to accept write access.
 */
export async function prepareWriteAuth() {
  const tokenData = await getTokenDetails();

  if (tokenData) {
    const writePermissions = tokenData.permissions.reduce(
      (a, b) => a + (b.write ? 1 : 0),
      0
    );

    // If token doesnt have write permission. We need to clear it.
    // As we cannot use tokens authorized for reads to perform writes.
    if (writePermissions !== tokenData.permissions.length) {
      await clearToken();
    }
  }
}

export async function getTokenDetails(): Promise<TrelloToken | undefined> {
  const token = await getValidToken();

  if (token) {
    try {
      const response = await fetch(
        `https://api.trello.com/1/tokens/${token}/?key=${getAppKey()}`,
        {
          method: 'GET'
        }
      );

      return (await response.json()) as TrelloToken;
    } catch (e) {
      // Ignore API errors. I suspect they'll be expirations.
      // Better to just have users re-auth.
    }
  }

  return undefined;
}

/**
 * Shows a native Trello confirmation popup.
 * Returns a promise that resolves to true if confirmed, false if cancelled.
 *
 * @param title - The title of the confirmation dialog
 * @param message - The message/body text
 * @param options - Optional configuration
 * @param options.confirmText - Text for the confirm button (default: "Confirm")
 * @param options.confirmStyle - Style of the confirm button: 'primary' | 'danger' (default: 'primary')
 * @param options.cancelText - Text for the cancel button (default: "Cancel")
 * @param options.mouseEvent - Mouse event for positioning the popup
 */
export function showConfirm(
  title: string,
  message: string,
  options?: {
    confirmText?: string;
    confirmStyle?: 'primary' | 'danger';
    cancelText?: string;
    mouseEvent?: MouseEvent;
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const t = getTrelloCard();

    t.popup({
      type: 'confirm',
      title,
      message,
      confirmText: options?.confirmText ?? 'Confirm',
      confirmStyle: options?.confirmStyle ?? 'primary',
      cancelText: options?.cancelText ?? 'Cancel',
      mouseEvent: options?.mouseEvent,
      onConfirm: () => {
        resolve(true);
        return Promise.resolve();
      },
      onCancel: () => {
        resolve(false);
        return Promise.resolve();
      }
    });
  });
}
