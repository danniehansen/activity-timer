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