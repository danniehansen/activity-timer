import { Trello } from '../types/trello';

export function formatTime (secondsToFormat: number, allowSeconds?: boolean) {
  const hours = Math.floor(secondsToFormat / 3600);
  const minutes = Math.floor((secondsToFormat % 3600) / 60);
  const seconds = secondsToFormat % 60;
  const timeFormat = [];

  if (hours > 0) {
    timeFormat.push(hours + 'h');
  }

  if (minutes > 0) {
    timeFormat.push(minutes + 'm');
  }

  if (allowSeconds && seconds > 0) {
    timeFormat.push(seconds + 's');
  }

  return (timeFormat.length > 0 ? timeFormat.join(' ') : '0m');
}

export function formatDate (date: Date, returnOnlyTimeString?: boolean) {
  const dateStr = [
    date.getFullYear(),
    ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1),
    (date.getDate() < 10 ? '0' : '') + date.getDate()
  ];

  const timeStr = [
    (date.getHours() < 10 ? '0' : '') + date.getHours(),
    (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
  ];

  return (returnOnlyTimeString ? '' : dateStr.join('-') + ' ') + timeStr.join(':');
}

export function formatMemberName (member: Trello.PowerUp.Member) {
  if (!member) {
    return 'N/A';
  }
  
  return member.fullName + (member.fullName !== member.username ? ' (' + member.username + ')' : '');
}
