import $ from "jquery";

export class DomVisibility {
  constructor(el) {
    this.el = $(el);
  }

  leftEdgeInView() {
    const x = this.el.offset().left;

    return this.windowOffset() <= x;
  }

  rightEdgeInView() {
    const x = this.el.offset().left;
    const width = this.el.outerWidth();

    return (x + width) <= ($(window).outerWidth() + this.windowOffset());
  }

  windowOffset() {
    return $(window).scrollLeft();
  }
}

export function absolutePointAtViewportEdge(edge, x, buffer) {
  switch(edge) {
    case 'left':
      return x - $(window).scrollLeft() <= buffer;

    case 'right':
      return x - $(window).scrollLeft() >= $(window).outerWidth() - buffer;

    default:
      throw new Error(`unsupported edge value: ${edge}`);
  }
}
