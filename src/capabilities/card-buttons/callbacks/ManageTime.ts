import { Card } from '../../../components/card';
import { Ranges } from '../../../components/ranges';
import { Range } from '../../../components/range';
import { Trello } from '../../../types/trello';
import {
  formatDate,
  formatMemberName,
  formatTime
} from '../../../utils/formatting';
import { getMemberId } from '../../../components/trello';

function getManageRow(
  card: Card,
  ranges: Ranges,
  range: Range
): Trello.PowerUp.PopupOptionsItem {
  const start = new Date(range.start * 1000);
  const end = new Date(range.end * 1000);
  const rangeOnTheSameDay = start.toDateString() === end.toDateString();
  const rangeLengthInSeconds = range.end - range.start;

  return {
    text: `${formatDate(start)} - ${formatDate(
      end,
      rangeOnTheSameDay
    )} (${formatTime(rangeLengthInSeconds, false)})`,
    callback: function (t) {
      return t.popup({
        title: 'Edit time range',
        items: async function () {
          return [
            {
              text: 'Edit start (' + formatDate(start) + ')',
              callback: (t) => {
                return t.popup({
                  type: 'datetime',
                  title: 'Change start from (' + formatDate(start) + ')',
                  callback: async function (t, opts) {
                    range.start = Math.floor(
                      new Date(opts.date).getTime() / 1000
                    );
                    await ranges.save();
                    return t.closePopup();
                  },
                  date: start
                });
              }
            },
            {
              text: 'Edit end (' + formatDate(end) + ')',
              callback: (t) => {
                return t.popup({
                  type: 'datetime',
                  title: 'Change end from (' + formatDate(end) + ')',
                  callback: async function (t, opts) {
                    range.end = Math.floor(
                      new Date(opts.date).getTime() / 1000
                    );
                    await ranges.save();
                    return t.closePopup();
                  },
                  date: end
                });
              }
            },
            {
              text: 'Delete',
              callback: async (t) => {
                return t.popup({
                  type: 'confirm',
                  title: 'Delete tracking',
                  message:
                    "You're about to delete a time tracking. Are you sure?",
                  confirmText: 'Yes, delete tracking',
                  onConfirm: async (t) => {
                    const newRanges = new Ranges(
                      card.id,
                      ranges.items.filter(
                        (item) => item.rangeId !== range.rangeId
                      )
                    );
                    await newRanges.save();
                    return t.closePopup();
                  },
                  confirmStyle: 'danger',
                  cancelText: 'No, cancel'
                });
              }
            }
          ];
        }
      });
    }
  };
}

function openManuallyAdd(
  t: Trello.PowerUp.IFrame,
  card: Card,
  start = new Date(),
  end = new Date()
) {
  return t.popup({
    title: 'Manually add time tracking',
    items: async () => {
      return [
        {
          text: `Edit start (${formatDate(start)}`,
          callback: (t) => {
            return t.popup({
              type: 'datetime',
              title: `Change start (${formatDate(start)})`,
              callback: async function (t, opts) {
                openManuallyAdd(t, card, new Date(opts.date), end);
              },
              date: start
            });
          }
        },
        {
          text: `Edit end (${formatDate(end)})`,
          callback: (t) => {
            return t.popup({
              type: 'datetime',
              title: `Change end (${formatDate(start)})`,
              callback: async function (t, opts) {
                openManuallyAdd(t, card, start, new Date(opts.date));
              },
              date: end
            });
          }
        },
        {
          text: 'Add',
          callback: async (t) => {
            // Only save new time tracking if they're different
            if (start.getTime() !== end.getTime()) {
              const memberId = await getMemberId();
              const ranges = await card.getRanges();

              ranges.add(
                new Range(
                  memberId,
                  Math.floor(start.getTime() / 1000),
                  Math.floor(end.getTime() / 1000)
                )
              );

              await ranges.save();
            } else {
              t.alert({
                message:
                  'Unable to add time tracking. Start & end was the same.',
                duration: 3
              });
            }

            return t.closePopup();
          }
        }
      ];
    }
  });
}

export async function manageTimeCallback(t: Trello.PowerUp.IFrame) {
  return t.popup({
    title: 'Manage time',
    items: async function (t) {
      const card = await Card.getFromContext(t);
      const timers = await card.getTimers();
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
          const memberRanges = ranges.items.filter((range) => {
            return range.memberId === member.id;
          });

          const timer = timers.getByMemberId(member.id);

          if (memberRanges.length > 0 || timer) {
            items.push({
              text: formatMemberName(member) + ':'
            });

            memberRanges.forEach((range) => {
              items.push(getManageRow(card, ranges, range));
            });

            if (timer) {
              items.push({
                text: `Running: ${formatDate(
                  new Date(timer.start * 1000)
                )} (${formatTime(timer.timeInSecond, true)})`,
                callback: function (t) {
                  return t.popup({
                    title: 'Active timer',
                    items: async function () {
                      return [
                        {
                          text: 'Stop time tracking',
                          callback: async (t) => {
                            return t.popup({
                              type: 'confirm',
                              title: 'Stop time tracking',
                              message:
                                "You're about to stop a time tracking. Are you sure?",
                              confirmText: 'Yes, stop timer',
                              onConfirm: async (t) => {
                                await card.stopTrackingByMemberId(member.id, t);
                                return t.closePopup();
                              },
                              confirmStyle: 'danger',
                              cancelText: 'No, cancel'
                            });
                          }
                        }
                      ];
                    }
                  });
                }
              });
            }

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

      if (items.length > 0) {
        items.push({
          text: '--------'
        });

        items.push({
          text: 'Add manually',
          callback: (t) => openManuallyAdd(t, card)
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
                await t.remove('card', 'shared', 'act-timer-ranges');
                await t.remove('card', 'shared', 'act-timer-running');
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
          callback: (t) => openManuallyAdd(t, card)
        });
      }

      return items;
    }
  });
}
