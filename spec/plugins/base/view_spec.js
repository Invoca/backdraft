describe("Base Plugin", function() {

  describe("View", function() {

    var exports = Backdraft.plugin("Base");

    it("should trigger events before and after it is closed", function() {
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

    describe("#child", function() {

      it("should return undefined when accessing invalid children", function() {
        var view = new exports.View();
        expect(view.child("invalid")).toBeUndefined();
      });

      it("should raise an error when setting a child with an existing name", function() {
        expect(function() {
          var view = new exports.View();
          view.child("abc", new exports.View());
          view.child("abc", new exports.View());
        }).toThrow();
      });

      it("should set children", function() {
        var parent = new exports.View();
        var child = new exports.View();

        parent.child("abc", child);
        expect(child.parent).toBe(parent);
        expect(parent.child("abc")).toBe(child);
      });

      it("should close all children", function() {
        var parent = new exports.View();
        var child1 = new exports.View();
        var child2 = new exports.View();
        parent.child("child1", child1);
        parent.child("child2", child2);
        spyOn(child1, 'close').and.callThrough();
        spyOn(child2, 'close').and.callThrough();

        parent.close();

        expect(child1.close).toHaveBeenCalled();
        expect(child2.close).toHaveBeenCalled();
        expect(child1.parent).not.toBeDefined();
        expect(child2.parent).not.toBeDefined();

        expect(parent.child("child1")).toBeUndefined();
        expect(parent.child("child2")).toBeUndefined();
      });

    });

  });

});