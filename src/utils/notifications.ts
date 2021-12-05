import { Card } from '../components/card';
import { getMemberId, getTrelloInstance } from '../components/trello';
import { Trello } from '../types/trello';

export async function hasNotificationsFeature () {
  return !(await getTrelloInstance().get('member', 'private', 'act-timer-disable-notifications')) && Notification.permission === 'granted';
}

export async function disableNotificationsFeature () {
  await getTrelloInstance().set('member', 'private', 'act-timer-disable-notifications', 1);
}

export async function enableNotificationsFeature () {
  await getTrelloInstance().remove('member', 'private', 'act-timer-disable-notifications');
}

export async function setNotificationPercentage (percentage: number) {
  await getTrelloInstance().set('member', 'private', 'act-timer-notifications-percentage', percentage);
}

export async function getNotificationPercentage () {
  return (await getTrelloInstance().get('member', 'private', 'act-timer-notifications-percentage', 80));
}

export async function hasTriggeredNotification (t: Trello.PowerUp.IFrame) {
  return !!(await t.get('card', 'private', 'act-timer-notifications-triggered'));
}

export async function triggerNotification (t: Trello.PowerUp.IFrame) {
  const notificationsPercentage = await getNotificationPercentage();
  await t.set('card', 'private', 'act-timer-notifications-triggered', 1);
  const notification = new Notification(`You've passed ${notificationsPercentage}% of your estimated time`);
}

export async function canTriggerNotification (t: Trello.PowerUp.IFrame) {
  const isNotificationsEnabled = await hasNotificationsFeature();

  if (!isNotificationsEnabled) {
    return false;
  }

  const memberId = await getMemberId();
  const card = await Card.getFromContext(t);
  const ranges = await card.getRanges();

  const timeSpent = ranges.items.filter((item) => item.memberId === memberId).reduce((a, b) => a + b.diff, 0);

  if (timeSpent === 0) {
    return false;
  }

  const notificationsPercentage = await getNotificationPercentage();

  if (notificationsPercentage === 0) {
    return false;
  }

  const notificationTriggered = await hasTriggeredNotification(t);

  if (notificationTriggered) {
    return false;
  }

  const estimate = (await card.getEstimates()).getByMemberId(memberId);

  if (!estimate || estimate.time === 0) {
    return false;
  }

  return timeSpent >= ((estimate.time / 100) * notificationsPercentage);
}