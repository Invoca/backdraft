export function inDom(element, block) {
  $("body").append(element);

  try {
    block();
  } finally {
    element.remove();
  }
}
