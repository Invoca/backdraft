describe("Base Plugin", function() {

  describe("Router", function() {

    it("should trigger events on views when swapping", function() {
      var exports = Backdraft.plugin("Base");
      var router = new exports.Router({ $el : $("<div>") });
      var view = new exports.View;
      var spy = jasmine.createSpyObj("eventSpy", [ "beforeSwap", "afterSwap" ]);

      view.on({
        beforeSwap : spy.beforeSwap,
        afterSwap : spy.afterSwap
      });

      router.swap(view);

      expect(spy.beforeSwap).toHaveBeenCalledWith(router);
      expect(spy.afterSwap).toHaveBeenCalledWith(router);

    });

  });

});