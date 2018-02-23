import { default as Backdraft } from "../src/entry.js";

describe("Backdraft.Utils.DomVisibility", function() {
  var el, dummyDiv, previousBodyMargin;

  beforeEach(function() {
    el = $('<div>');
    dummyDiv = $('<div>');
    $('body').append(el);
    $('body').append(dummyDiv);
    previousBodyMargin = $('body').css('margin');
    $('body').css({ margin: 0 });
  });

  afterEach(function() {
    el.remove();
    dummyDiv.remove();
    $('body').css({ margin: previousBodyMargin });
    $(window).scrollLeft(0);
  });

  it("should define a namespace for helper methods", function() {
    expect(Backdraft.Utils.DomVisibility).toBeDefined();
  });

  describe("leftEdgeInView", function() {
    var domViz;

    beforeEach(function() {
      el.css({ width: 9000, height: 50 });
      domViz = new Backdraft.Utils.DomVisibility(el);
    });

    it("should handle when not scrolled horizontally and table at edge", function() {
      expect($(window).scrollLeft()).toEqual(0);
      expect(el.offset().left).toEqual(0);
      expect(domViz.leftEdgeInView()).toEqual(true);
    });

    it("should handle when scrolled horizontally and table at edge", function() {
      expect(el.offset().left).toEqual(0);
      $(window).scrollLeft(1);

      expect(domViz.leftEdgeInView()).toEqual(false);
    });

    it("should handle when scrolled horizontally and table not at edge", function() {
      el.css('margin-left', 50);
      expect(el.offset().left).toEqual(50);

      $(window).scrollLeft(44);
      expect(domViz.leftEdgeInView()).toEqual(true, "Scrolled to 44");

      $(window).scrollLeft(51);
      expect(domViz.leftEdgeInView()).toEqual(false, "Scrolled to 51");
    });
  });

  describe("rightEdgeInView", function() {
    var domViz;

    beforeEach(function() {
      el.css({ width: 9000, height: 50 });
      domViz = new Backdraft.Utils.DomVisibility(el);
    });

    it("should handle when not scrolled horizontally and table off edge", function() {
      expect($(window).scrollLeft()).toEqual(0);
      expect(el.offset().left).toEqual(0);
      expect(domViz.rightEdgeInView()).toEqual(false);
    });

    it("should handle when scrolled horizontally and table at edge", function() {
      expect(el.offset().left).toEqual(0);

      $(window).scrollLeft(el.width() - $('body').outerWidth());

      expect(domViz.rightEdgeInView()).toEqual(true);
    });

    it("should handle when scrolled horizontally and table not at edge", function() {
      dummyDiv.css({ width: 2000, height: 10 });
      el.css({ marginLeft: 50, width: 400 });
      expect(el.offset().left).toEqual(50);

      $(window).scrollLeft(44);
      expect(domViz.rightEdgeInView()).toEqual(false, "Scrolled to 44");

      $(window).scrollLeft(51);
      expect(domViz.rightEdgeInView()).toEqual(true, "Scrolled to 51");
    });
  });

  describe("absolutePointAtViewportEdge", function() {
    beforeEach(function() {
      dummyDiv.css({ width: 1000, height: 700 });
    });

    describe("left", function() {
      it("should handle when a point is close to edge of viewport - not scrolled", function() {
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 0, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 0, 50)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 1, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 50, 50)).toEqual(true);

        // outside the "buffer"
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 2, 1)).toEqual(false);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 100, 50)).toEqual(false);
      });

      it("should handle when a point is close to edge of viewport - scrolled", function() {
        $(window).scrollLeft(60);

        // anything past the edge is considered at the edge
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 0, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 0, 50)).toEqual(true);

        // factoring in the scroll, still within the buffer
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 61, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 80, 50)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 110, 50)).toEqual(true);

        // outside the "buffer"
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 62, 1)).toEqual(false);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('left', 111, 50)).toEqual(false);
      });
    });

    describe("right", function() {
      it("should handle when a point is close to edge of viewport - not scrolled", function() {
        expect($('body').width()).toEqual(400, "width of viewport");

        // past edge is considered at the edge
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 450, 1)).toEqual(true);

        // at or within the bugger
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 400, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 350, 50)).toEqual(true);

        // outside the "buffer"
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 399, 0)).toEqual(false);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 349, 50)).toEqual(false);
      });

      it("should handle when a point is close to edge of viewport - scrolled", function() {
        expect($('body').width()).toEqual(400, "width of viewport");
        $(window).scrollLeft(500);

        // anything past the edge is considered at the edge
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 1000, 1)).toEqual(true);

        // factoring in the scroll, still within the buffer
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 900, 1)).toEqual(true);
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 800, 100)).toEqual(true);

        // outside the "buffer"
        expect(Backdraft.Utils.Coordinates.absolutePointAtViewportEdge('right', 800, 50)).toEqual(false);
      });
    });
  });
});
