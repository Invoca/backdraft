Backdraft.Utils.DomVisibility = Backdraft.Utils.Class.extend({
  initialize: function(el) {
    this.el = $(el);
  },

  leftEdgeInView: function() {
    var x = this.el.offset().left;

    return this.windowOffset() <= x;
  },

  rightEdgeInView: function() {
    var x = this.el.offset().left;
    var width = this.el.outerWidth();

    return (x + width) <= ($(window).outerWidth() + this.windowOffset());
  },

  windowOffset: function() {
    return $(window).scrollLeft();
  }
});

Backdraft.Utils.Coordinates = {
  absolutePointAtViewportEdge: function(edge, x, buffer) {
    switch(edge) {
      case 'left':
        return x - $(window).scrollLeft() <= buffer;

      case 'right':
        return x - $(window).scrollLeft() >= $(window).outerWidth() - buffer;

      default:
        throw new Error("unsupported edge value: " + edge);
    }
  }
};
