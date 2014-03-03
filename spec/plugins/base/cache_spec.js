describe("Base Plugin", function() {

  describe("Cache", function() {

    var exports;

    beforeEach(function() {
      exports = Backdraft.plugin("Base");
    });

    describe("get", function() {

      it("should work with primitive keys", function() {
        expect(function() {
          var cache = new exports.Cache();
          cache.get("1");
        }).not.toThrow();
      });

      it("should work with keys that have a cid property", function() {
        expect(function() {
          var cache = new exports.Cache();
          var model = new exports.Model();
          cache.get(model);
        }).not.toThrow();
      });

      it("should not work with other object types", function() {
        expect(function() {
          var cache = new exports.Cache();
          cache.get(function() {});
        }).toThrow();
      });

    });

    describe("set", function() {

      it("should work with primitive keys", function() {
        expect(function() {
          var cache = new exports.Cache();
          cache.set("1");
        }).not.toThrow();
      });

      it("should work with keys that have a cid property", function() {
        expect(function() {
          var cache = new exports.Cache();
          var model = new exports.Model();
          cache.set(model, 1);
        }).not.toThrow();
      });

      it("should not work with other object types", function() {
        expect(function() {
          var cache = new exports.Cache();
          cache.set(function() {}, 3);
        }).toThrow();
      });
    });

    describe("other operations", function() {

      it("should return the cache size", function() {
        var cache = new exports.Cache();
        cache.set("1", 2);
        cache.set("3", 4);

        expect(cache.size()).toBe(2);
      });

      it("should clear the cache", function() {
        var cache = new exports.Cache();
        cache.set("1", 2);
        cache.set("3", 4);

        cache.reset();
        expect(cache.size()).toBe(0);
      });

      it("should unset an item", function() {
        var cache = new exports.Cache();
        cache.set("1", 2);
        expect(cache.get("1")).toBe(2);
        var value = cache.unset("1");
        expect(value).toBe(2);
        expect(cache.get("1")).toBeUndefined();
      });

      it("should iterate over all values", function() {
        var cache = new exports.Cache();
        var spy = jasmine.createSpy();
        cache.set("1", "a");
        cache.set("2", "b");

        cache.each(spy);

        expect(spy.calls.count()).toBe(2);
        expect(spy.calls.argsFor(0)[0]).toBe("a")
        expect(spy.calls.argsFor(0)[1]).toBe("1")
        expect(spy.calls.argsFor(1)[0]).toBe("b")
        expect(spy.calls.argsFor(1)[1]).toBe("2")
      });

    });


  });

});