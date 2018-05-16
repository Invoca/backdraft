import Cache from "../src/cache";
import Model from "../src/model";

describe("Cache", function() {
  describe("get", function() {
    it("should work with primitive keys", function() {
      expect(() => {
        const cache = new Cache();
        cache.get("1");
      }).not.toThrow();
    });

    it("should work with keys that have a cid property", function() {
      expect(() => {
        const cache = new Cache();
        const model = new Model();
        cache.get(model);
      }).not.toThrow();
    });

    it("should not work with other object types", function() {
      expect(() => {
        const cache = new Cache();
        cache.get(() => {});
      }).toThrow();
    });
  });

  describe("set", function() {
    it("should work with primitive keys", function() {
      expect(() => {
        const cache = new Cache();
        cache.set("1");
      }).not.toThrow();
    });

    it("should work with keys that have a cid property", function() {
      expect(() => {
        const cache = new Cache();
        const model = new Model();
        cache.set(model, 1);
      }).not.toThrow();
    });

    it("should not work with other object types", function() {
      expect(() => {
        const cache = new Cache();
        cache.set(() => {}, 3);
      }).toThrow();
    });
  });

  describe("other operations", function() {
    it("should return the cache size", function() {
      const cache = new Cache();
      cache.set("1", 2);
      cache.set("3", 4);

      expect(cache.size()).toBe(2);
    });

    it("should clear the cache", function() {
      const cache = new Cache();
      cache.set("1", 2);
      cache.set("3", 4);

      cache.reset();
      expect(cache.size()).toBe(0);
    });

    it("should unset an item", function() {
      const cache = new Cache();
      cache.set("1", 2);
      expect(cache.get("1")).toBe(2);
      const value = cache.unset("1");
      expect(value).toBe(2);
      expect(cache.get("1")).toBeUndefined();
    });

    it("should iterate over all values", function() {
      const cache = new Cache();
      const spy = jasmine.createSpy();
      cache.set("1", "a");
      cache.set("2", "b");

      cache.each(spy);

      expect(spy.calls.count()).toBe(2);
      expect(spy.calls.argsFor(0)[0]).toBe("a");
      expect(spy.calls.argsFor(0)[1]).toBe("1");
      expect(spy.calls.argsFor(1)[0]).toBe("b");
      expect(spy.calls.argsFor(1)[1]).toBe("2");
    });
  });
});
