import { Trello } from './types/trello';

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
    trelloInstance.sizeTo(
      document.documentElement.offsetHeight
    );
  }
}

export async function getMemberId () {
  if (memberIdCache === null) {
    memberIdCache = (await getTrelloInstance().member('id')).id;
  }

  return memberIdCache;
}