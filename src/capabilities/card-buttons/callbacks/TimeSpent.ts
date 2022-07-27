import { Card } from '../../../components/card';
import { Trello } from '../../../types/trello';
import { formatMemberName, formatTime } from '../../../utils/formatting';

export async function timeSpentCallback(t: Trello.PowerUp.IFrame) {
  return t.popup({
    title: 'Time spent',
    items: async function (t) {
      const card = await Card.getFromContext(t);
      const ranges = await card.getRanges();
      const board = await t.board('members');

      const items: Trello.PowerUp.PopupOptionsItem[] = [];
      const memberIds = board.members.map((member) => member.id);

      board.members
        .sort((a, b) => {
          const nameA = (a.fullName ?? '').toUpperCase();
          const nameB = (b.fullName ?? '').toUpperCase();

          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          return 0;
        })
        .forEach((member) => {
          const timeSpent = ranges.items
            .filter((item) => item.memberId === member.id)
            .reduce((a, b) => a + b.diff, 0);

          if (timeSpent !== 0) {
            items.push({
              text: formatMemberName(member) + ': ' + formatTime(timeSpent)
            });
          }
        });

      const timeSpentNoMember = ranges.items
        .filter((range) => memberIds.indexOf(range.memberId) === -1)
        .reduce((time, range) => {
          time += range.diff;
          return time;
        }, 0);

      if (timeSpentNoMember > 0) {
        items.push({ text: 'N/A: ' + formatTime(timeSpentNoMember) });
      }

      if (items.length === 0) {
        items.push({ text: 'No activity yet' });
      }

      return items;
    }
  });
}
