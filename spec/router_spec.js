import { default as Backdraft } from "../src/legacy/entry";

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

    it("should throw and error if $el is not found", function() {
      var exports = Backdraft.plugin("Base");
      expect(function() {
        new exports.Router({ $el : $(".not-going-to-find-me") });
      }).toThrowError("$el can't be found");

      expect(function() {
        new exports.Router();
      }).toThrowError("$el can't be found")
    });

    describe("Named Routes", function() {

      var app;

      beforeEach(function() {
        Backdraft.app.destroyAll();
        app = Backdraft.app("myapp", {});
      });

      it("should create them based on callback name", function() {
        app.router("abc", {
          routes : {
            "files" : "index"
          }
        });

        var router = new app.Routers.abc({ $el: $("<div>") });

        expect(router.nameHelper.index).toEqual(jasmine.any(Function));
      });

      it("should create them using an alias when callback names are duplicated", function() {
        app.router("abc", {
          routes : {
            "files" : "index",
            "" : [ "index", "legacyIndex" ]
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.legacyIndex).toEqual(jasmine.any(Function));
      });

      it("should substitute params", function() {
        app.router("abc", {
          routes : {
            "files/:name.:ext" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show({ name : "image", ext : "png" })).toEqual("files/image.png")
      });

      it("should substitute splats", function() {
        app.router("abc", {
          routes : {
            "files/*rest" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show(null, "dir1/dir2/image.png")).toEqual("files/dir1/dir2/image.png")
      });

      it("should remove unused splats", function() {
        app.router("abc", {
          routes : {
            "files/*rest" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show()).toEqual("files/")
      });

      it("should remove optional params when they are not provided", function() {
        app.router("abc", {
          routes : {
            "docs/:section(/:subsection)" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show({ section : "faq" })).toEqual("docs/faq");
      });

      it("should remove optional params parens when they are provided", function() {
        app.router("abc", {
          routes : {
            "docs/:section(/:subsection)" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show({ section : "faq", subsection : "installing" })).toEqual("docs/faq/installing");
      });

      it("should throw an error when there are missing params", function() {
        app.router("abc", {
          routes : {
            "files/:name.:ext" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(function() {
          router.nameHelper.show({ name : "image" });
        }).toThrow();
      });

    });

    describe("Scenarios", function() {

      it("should not cache an generated routes", function() {

        Backdraft.app.destroyAll();
        var app = Backdraft.app("myapp", {});
        app.router("abc", {
          routes : {
            "files/:id" : "show"
          }
        });
        var router = new app.Routers.abc({ $el: $("<div>") });
        expect(router.nameHelper.show({ id: 10 })).toEqual("files/10");
        expect(router.nameHelper.show({ id: 11 })).toEqual("files/11");

      });

    });

  });

});
