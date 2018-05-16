import Router from "../src/router";
import View from "../src/view";
import { default as Backdraft } from "../src/entry";

describe("Router", function() {
  it("is exported", function() {
    expect(Backdraft.Router).toEqual(Router);
  });

  it("should trigger events on views when swapping", function() {
    const router = new Router({ $el: $("<div>") });
    const view = new View();
    const spy = jasmine.createSpyObj("eventSpy", ["beforeSwap", "afterSwap"]);

    view.on({
      beforeSwap: spy.beforeSwap,
      afterSwap: spy.afterSwap
    });

    router.swap(view);

    expect(spy.beforeSwap).toHaveBeenCalledWith(router);
    expect(spy.afterSwap).toHaveBeenCalledWith(router);
  });

  it("should throw and error if $el is not found", function() {
    expect(() => {
      // eslint-disable-next-line no-new
      new Router({ $el: $(".not-going-to-find-me") });
    }).toThrowError("$el can't be found");

    expect(() => {
      // eslint-disable-next-line no-new
      new Router();
    }).toThrowError("$el can't be found");
  });

  describe("Named Routes", function() {
    it("should create them based on callback name", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files": "index"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });

      expect(router.nameHelper.index).toEqual(jasmine.any(Function));
    });

    it("should create them using an alias when callback names are duplicated", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files": "index",
            "": ["index", "legacyIndex"]
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.legacyIndex).toEqual(jasmine.any(Function));
    });

    it("should substitute params", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files/:name.:ext": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show({ name: "image", ext: "png" })).toEqual("files/image.png");
    });

    it("should substitute splats", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files/*rest": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show(null, "dir1/dir2/image.png")).toEqual("files/dir1/dir2/image.png");
    });

    it("should remove unused splats", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files/*rest": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show()).toEqual("files/");
    });

    it("should remove optional params when they are not provided", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "docs/:section(/:subsection)": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show({ section: "faq" })).toEqual("docs/faq");
    });

    it("should remove optional params parens when they are provided", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "docs/:section(/:subsection)": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show({ section: "faq", subsection: "installing" })).toEqual("docs/faq/installing");
    });

    it("should throw an error when there are missing params", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files/:name.:ext": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(() => {
        router.nameHelper.show({ name: "image" });
      }).toThrow();
    });
  });

  describe("Scenarios", function() {
    it("should not cache an generated routes", function() {
      class MyRouter extends Router {
        get routes() {
          return {
            "files/:id": "show"
          };
        }
      }

      const router = new MyRouter({ $el: $("<div>") });
      expect(router.nameHelper.show({ id: 10 })).toEqual("files/10");
      expect(router.nameHelper.show({ id: 11 })).toEqual("files/11");
    });
  });
});
