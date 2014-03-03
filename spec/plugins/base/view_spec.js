describe("Base Plugin", function() {

  describe("View", function() {

    it("should trigger events before and after it is closed", function() {
      var exports = Backdraft.plugin("Base");
      var view = new exports.View();
      var spy = jasmine.createSpyObj("eventSpy", [ "beforeClose", "afterClose" ]);

      view.on({
        beforeClose : spy.beforeClose,
        afterClose : spy.afterClose
      });

      view.close();

      expect(spy.beforeClose).toHaveBeenCalled();
      expect(spy.afterClose).toHaveBeenCalled();      
    });

  });

});