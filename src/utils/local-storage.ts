export function getStorage<T extends object>(key: string): T | undefined {
  try {
    const data = localStorage.getItem(key);

    if (data) {
      return JSON.parse(data);
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
}

export function setStorage<T extends object>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // eslint-disable-next-line no-empty
  } catch (e) {}
}
