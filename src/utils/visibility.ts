import { getTrelloInstance } from '../components/trello';

export enum Visibility {
  ALL,
  SPECIFIC_MEMBERS,
  MEMBERS_OF_BOARD
}

export async function getVisibility(): Promise<Visibility> {
  const visibility = await getTrelloInstance().get(
    'board',
    'shared',
    'act-timer-visibility'
  );

  switch (visibility) {
    case 'specific-members':
      return Visibility.SPECIFIC_MEMBERS;

    case 'members-of-board':
      return Visibility.MEMBERS_OF_BOARD;
  }

  return Visibility.ALL;
}

export async function isVisible(): Promise<boolean> {
  const visibility = await getVisibility();

  switch (visibility) {
    case Visibility.SPECIFIC_MEMBERS: {
      const members = await getVisibilityMembers();
      const member = await getTrelloInstance().member('id');

      return members.length === 0 || members.includes(member.id);
    }

    case Visibility.MEMBERS_OF_BOARD: {
      const members = await getTrelloInstance().board('members');
      const member = await getTrelloInstance().member('id');

      return members.members.map((mem) => mem.id).includes(member.id);
    }
  }

  return true;
}

export async function setVisibility(visibility: Visibility): Promise<void> {
  switch (visibility) {
    case Visibility.MEMBERS_OF_BOARD:
      await getTrelloInstance().set(
        'board',
        'shared',
        'act-timer-visibility',
        'members-of-board'
      );
      break;

    case Visibility.SPECIFIC_MEMBERS:
      await getTrelloInstance().set(
        'board',
        'shared',
        'act-timer-visibility',
        'specific-members'
      );
      break;

    case Visibility.ALL:
      await getTrelloInstance().set(
        'board',
        'shared',
        'act-timer-visibility',
        ''
      );
      break;
  }
}

export async function setVisibilityMembers(members: string[]): Promise<void> {
  await getTrelloInstance().set(
    'board',
    'shared',
    'act-timer-visibility-members',
    members
  );
}

export async function getVisibilityMembers(): Promise<string[]> {
  return await getTrelloInstance().get<string[]>(
    'board',
    'shared',
    'act-timer-visibility-members',
    []
  );
}
