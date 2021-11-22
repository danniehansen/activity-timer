import { Trello } from '../../types/trello';
import ClockImage from '../../assets/images/clock.svg';
import { Card } from '../../components/card';
import { formatDate, formatMemberName, formatTime } from '../../utils/formatting';
import { Ranges } from '../../components/ranges';
import { Range } from '../../components/range';

const icon = `${window.location.origin}${ClockImage}`;

function getManageRow (card: Card, ranges: Ranges, range: Range): Trello.PowerUp.PopupOptionsItem {
  const start = new Date(range.start * 1000);
  const end = new Date(range.end * 1000);
  const rangeOnTheSameDay = start.toDateString() === end.toDateString();
  const rangeLengthInSeconds = range.end - range.start;

  return {
    text: `${formatDate(start)} - ${formatDate(end, rangeOnTheSameDay)} (${formatTime(rangeLengthInSeconds, false)})`,
    callback: function (t) {
      return t.popup({
        title: 'Edit time range',
        items: async function () {
          const _start = new Date(range.start * 1000);
          const _end = new Date(range.end * 1000);

          return [
            {
              text: 'Edit start (' + formatDate(start) + ')',
              callback: (t) => {
                return t.popup({
                  type: 'datetime',
                  title: 'Change start from (' + formatDate(_start) + ')',
                  callback: async function (t, opts) {
                    range.start = Math.floor(new Date(opts.date).getTime() / 1000);
                    await ranges.save();
                    return t.closePopup();
                  },
                  date: _start
                });
              }
            },
            {
              text: 'Edit end (' + formatDate(end) + ')',
              callback: (t) => {
                return t.popup({
                  type: 'datetime',
                  title: 'Change end from (' + formatDate(_end) + ')',
                  callback: async function (t, opts) {
                    range.end = Math.floor(new Date(opts.date).getTime() / 1000);
                    await ranges.save();
                    return t.closePopup();
                  },
                  date: _end
                });
              }
            },
            {
              text: 'Delete',
              callback: async (t) => {
                const newRanges = new Ranges(card.id, ranges.items.filter((item) => item.rangeId !== range.rangeId));
                await newRanges.save();
                return t.closePopup();
              }
            }
          ];
        }
      });
    }
  };
}

export async function getCardButtons (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardButton[]> {
  return [
    {
      icon,
      text: 'Manage time',
      condition: 'edit',
      callback: async (t) => {
        return t.popup({
          title: 'Manage time',
          items: async function (t) {
            const card = await Card.getFromContext(t);
            const ranges = await card.getRanges();
            const board = await t.board('members');

            const items: Trello.PowerUp.PopupOptionsItem[] = [];
            const memberIds = board.members.map((member) => member.id);

            board.members.sort((a, b) => {
              const nameA = (a.fullName ?? '').toUpperCase();
              const nameB = (b.fullName ?? '').toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              return 0;
            }).forEach((member) => {
              const memberRanges = ranges.items.filter((range) => {
                return range.memberId === member.id;
              });

              if (memberRanges.length > 0) {
                items.push({
                  text: formatMemberName(member) + ':'
                });

                memberRanges.forEach((range) => {
                  items.push(getManageRow(card, ranges, range));
                });

                items.push({
                  text: '--------'
                });
              }
            });

            ranges.items
              .filter((range) => memberIds.indexOf(range.memberId) === -1)
              .forEach((range) => {
                items.push({
                  text: 'N/A:'
                });

                items.push(getManageRow(card, ranges, range));

                items.push({
                  text: '--------'
                });
              });

            if (items.length > 0) {
              items.splice(items.length - 1, 1);
            }

            /* if (items.length > 0) {
              items.push({
                text: '--------'
              });

              items.push({
                text: 'Add manually',
                callback: (t) => openManuallyAdd(t)
              });

              items.push({
                text: 'Clear',
                callback: async (t) => {
                  return t.popup({
                    type: 'confirm',
                    title: 'Clear time',
                    message: 'Do you wish to clear tracked time?',
                    confirmText: 'Yes, clear tracked time',
                    onConfirm: async (t) => {
                      await t.remove('card', 'shared', dataPrefix + '-ranges');
                      await t.remove('card', 'shared', dataPrefix + '-running');
                      await t.closePopup();
                    },
                    confirmStyle: 'danger',
                    cancelText: 'No, cancel'
                  });
                }
              });
            } else {
              items.push({ text: 'No activity yet' });

              items.push({
                text: '--------'
              });

              items.push({
                text: 'Add manually',
                callback: (t) => openManuallyAdd(t)
              });
            } */

            return items;
          }
        });
      }
    },
    {
      icon,
      text: 'Notifications',
      callback: async () => {
        console.log('Notifications');
      }
    },
    {
      icon,
      text: 'Settings',
      condition: 'edit',
      callback: async () => {
        console.log('Settings');
      }
    },
    {
      icon,
      text: 'Time spent',
      callback: async (t) => {
        return t.popup({
          title: 'Time spent',
          items: async function (t) {
            const card = await Card.getFromContext(t);
            const ranges = await card.getRanges();
            const board = await t.board('members');

            const items: Trello.PowerUp.PopupOptionsItem[] = [];
            const memberIds = board.members.map((member) => member.id);

            board.members.sort((a, b) => {
              const nameA = (a.fullName ?? '').toUpperCase();
              const nameB = (b.fullName ?? '').toUpperCase();

              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              return 0;
            }).forEach((member) => {
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
              .reduce(
                (time, range) => {
                  time += range.diff;
                  return time;
                },
                0
              );

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
    }
  ];
}