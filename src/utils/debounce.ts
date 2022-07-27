export function debounce(func: () => void, timeout = 300) {
  let timer: number;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func();
    }, timeout);
  };
}
