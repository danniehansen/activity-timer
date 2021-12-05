import OptroLicenseApi from '@optro/api-client/dist/OproLicenseApi';
import { getTrelloInstance } from './trello';

let optroClient: OptroLicenseApi | undefined;

async function getOptroBoardLicense () {
  if (!optroClient) {
    throw new Error('No optro client defined');
  }

  const board = await getTrelloInstance().board('id');

  return optroClient.getBoardLicenseStatus(board.id);
}

export function getOptroListingUrl () {
  if (typeof import.meta.env.VITE_OPTRO_LISTING_URL !== 'string') {
    return '';
  }

  return import.meta.env.VITE_OPTRO_LISTING_URL;
}

export function initializeOptro () {
  if (typeof import.meta.env.VITE_OPTRO_API_KEY !== 'string') {
    return;
  }

  if (typeof import.meta.env.VITE_POWERUP_ID !== 'string') {
    return;
  }

  optroClient = new OptroLicenseApi(
    import.meta.env.VITE_OPTRO_API_KEY,
    import.meta.env.VITE_POWERUP_ID
  );
}

export function hasOptroClient () {
  return optroClient !== undefined;
}

export async function getSubscriptionStatus () {
  if (hasOptroClient()) {
    const optroBoardLicense = await getOptroBoardLicense();
    return optroBoardLicense.isLicensed && optroBoardLicense.isRegistered;
  }

  return true;
}