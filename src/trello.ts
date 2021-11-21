import { Ranges } from './components/ranges';
import { Range } from './components/range';
import { Timers } from './components/timers';
import { Trello } from './types/trello';
import { getThresholdForTrackings } from './components/settings';
import { Card } from './components/card';

type TrelloInstance = Trello.PowerUp.Plugin | Trello.PowerUp.IFrame;

let trelloInstance: TrelloInstance | null = null;
let memberIdCache: string | null = null;

export function setTrelloInstance (t: TrelloInstance) {
  trelloInstance = t;
}

export function getTrelloInstance (): TrelloInstance {
  return trelloInstance as TrelloInstance;
}

export function getTrelloCard (): Trello.PowerUp.IFrame {
  return trelloInstance as Trello.PowerUp.IFrame;
}

export function resizeTrelloFrame (): void {
  if (trelloInstance && 'sizeTo' in trelloInstance) {
    trelloInstance.sizeTo('body');
  }
}

export async function getMemberId () {
  if (memberIdCache === null) {
    memberIdCache = (await getTrelloInstance().member('id')).id;
  }

  return memberIdCache;
}