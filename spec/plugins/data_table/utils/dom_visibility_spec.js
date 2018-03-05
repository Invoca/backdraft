import { DomVisibility, absolutePointAtViewportEdge } from "../../../../src/plugins/data_table/utils/dom_visibility";

const WIDTH_BEYOND_VIEWPORT = 9000;

describe("DomVisibility", function() {
  let el, dummyDiv, previousBodyMargin;

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
    expect(DomVisibility).toBeDefined();
  });

  describe("leftEdgeInView", function() {
    var domViz;

    beforeEach(function() {
      el.css({ width: WIDTH_BEYOND_VIEWPORT, height: 50 });
      domViz = new DomVisibility(el);
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
      el.css({ width: WIDTH_BEYOND_VIEWPORT, height: 50 });
      domViz = new DomVisibility(el);
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
      dummyDiv.css({ width: WIDTH_BEYOND_VIEWPORT, height: 10 });
      el.css({ marginLeft: 50, width: $('body').width() });
      expect(el.offset().left).toEqual(50);

      $(window).scrollLeft(44);
      expect(domViz.rightEdgeInView()).toEqual(false, "Scrolled to 44");

      $(window).scrollLeft(51);
      expect(domViz.rightEdgeInView()).toEqual(true, "Scrolled to 51");
    });
  });

  describe("absolutePointAtViewportEdge", function() {
    beforeEach(function() {
      dummyDiv.css({ width: WIDTH_BEYOND_VIEWPORT, height: 700 });
    });

    describe("left", function() {
      it("should handle when a point is close to edge of viewport - not scrolled", function() {
        expect(absolutePointAtViewportEdge('left', 0, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 0, 50)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 1, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 50, 50)).toEqual(true);

        // outside the "buffer"
        expect(absolutePointAtViewportEdge('left', 2, 1)).toEqual(false);
        expect(absolutePointAtViewportEdge('left', 100, 50)).toEqual(false);
      });

      it("should handle when a point is close to edge of viewport - scrolled", function() {
        $(window).scrollLeft(60);

        // anything past the edge is considered at the edge
        expect(absolutePointAtViewportEdge('left', 0, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 0, 50)).toEqual(true);

        // factoring in the scroll, still within the buffer
        expect(absolutePointAtViewportEdge('left', 61, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 80, 50)).toEqual(true);
        expect(absolutePointAtViewportEdge('left', 110, 50)).toEqual(true);

        // outside the "buffer"
        expect(absolutePointAtViewportEdge('left', 62, 1)).toEqual(false);
        expect(absolutePointAtViewportEdge('left', 111, 50)).toEqual(false);
      });
    });

    describe("right", function() {
      it("should handle when a point is close to edge of viewport - not scrolled", function() {
        const bodyWidth = $('body').width();

        // past edge is considered at the edge
        expect(absolutePointAtViewportEdge('right', bodyWidth + 50, 1)).toEqual(true);

        // at or within the bugger
        expect(absolutePointAtViewportEdge('right', bodyWidth, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('right', bodyWidth - 50, 50)).toEqual(true);

        // outside the "buffer"
        expect(absolutePointAtViewportEdge('right', bodyWidth - 1, 0)).toEqual(false);
        expect(absolutePointAtViewportEdge('right', bodyWidth - 51, 50)).toEqual(false);
      });

      it("should handle when a point is close to edge of viewport - scrolled", function() {
        const bodyWidth = $('body').width();
        $(window).scrollLeft(bodyWidth + 100);

        // anything past the edge is considered at the edge
        expect(absolutePointAtViewportEdge('right', 2 * (bodyWidth + 100), 1)).toEqual(true);

        // factoring in the scroll, still within the buffer
        expect(absolutePointAtViewportEdge('right', (bodyWidth + 100) + bodyWidth, 1)).toEqual(true);
        expect(absolutePointAtViewportEdge('right', (bodyWidth + 100) + bodyWidth - 100, 100)).toEqual(true);

        // outside the "buffer"
        expect(absolutePointAtViewportEdge('right', (bodyWidth + 100) + bodyWidth - 100, 50)).toEqual(false, "outside the buffer");
      });
    });
  });
});
