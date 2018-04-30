import View from "../src/view";
import { default as Backdraft } from "../src/legacy/entry";

describe("View", function() {
  it("is exported", function() {
    expect(Backdraft.View).toEqual(View);
  });

  it("should trigger events before and after it is closed", function() {
    const view = new View();
    const spy = jasmine.createSpyObj("eventSpy", [ "beforeClose", "afterClose" ]);

    view.on({
      beforeClose: spy.beforeClose,
      afterClose: spy.afterClose
    });

    view.close();

    expect(spy.beforeClose).toHaveBeenCalled();
    expect(spy.afterClose).toHaveBeenCalled();
  });

  describe("#child", function() {
    it("should return undefined when accessing invalid children", function() {
      const view = new View();
      expect(view.child("invalid")).toBeUndefined();
    });

    it("should raise an error when setting a child with an existing name", function() {
      expect(() => {
        const view = new View();
        view.child("abc", new View());
        view.child("abc", new View());
      }).toThrow();
    });

    it("should set children", function() {
      const parent = new View();
      const child = new View();

      parent.child("abc", child);
      expect(child.parent).toBe(parent);
      expect(parent.child("abc")).toBe(child);
    });

    it("should close all children", function() {
      const parent = new View();
      const child1 = new View();
      const child2 = new View();
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

  describe("#close", function() {
    it("should unbind all events from the view", function() {
      const view = new View();
      const spy = jasmine.createSpyObj("eventSpy", [ "abc", "xyz" ]);

      view.on({
        abc: spy.abc,
        xyz: spy.xyz
      });

      view.trigger("abc");
      view.trigger("xyz");

      expect(spy.abc.calls.count()).toBe(1);
      expect(spy.xyz.calls.count()).toBe(1);

      view.close();
      view.trigger("abc");
      view.trigger("xyz");

      expect(spy.abc.calls.count()).toBe(1);
      expect(spy.xyz.calls.count()).toBe(1);
    });
  });
});
