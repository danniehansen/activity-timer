import OptroLicenseApi from '@optro/api-client/dist/OproLicenseApi';
import { getPowerupId, getTrelloInstance } from './trello';

let optroClient: OptroLicenseApi | undefined;

async function getOptroBoardLicense() {
  if (!optroClient) {
    throw new Error('No optro client defined');
  }

  const board = await getTrelloInstance().board('id');

  return optroClient.getBoardLicenseStatus(board.id);
}

export function initializeOptro() {
  if (typeof import.meta.env.VITE_OPTRO_API_KEY !== 'string') {
    return;
  }

  const powerupId = getPowerupId();

  if (!powerupId) {
    return;
  }

  optroClient = new OptroLicenseApi(
    import.meta.env.VITE_OPTRO_API_KEY,
    powerupId
  );
}

export function hasOptroClient() {
  return optroClient !== undefined;
}

export async function getSubscriptionStatus() {
  if (hasOptroClient()) {
    const optroBoardLicense = await getOptroBoardLicense();
    return optroBoardLicense.isLicensed;
  }

  return true;
}
