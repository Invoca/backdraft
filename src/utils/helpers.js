export function htmlDecode(value) {
  if (value) {
    const doc = new DOMParser().parseFromString(value, "text/html");
    return doc.documentElement.textContent;
  }
  return value;
}
