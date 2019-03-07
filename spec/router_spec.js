import Router from "../src/router";
import View from "../src/view";
import Backbone from "backbone";

import $ from "jquery";

describe("Router", function() {
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

  describe("navigate", function() {
    beforeEach(function() {
      this.router = new Router({ $el: $('<div>') });
    });

    it("calls router.navigate with provided options", function() {
      spyOn(Backbone.Router.prototype, 'navigate');

      const view = new View();
      view.render();
      this.router.activeView = view;

      this.router.navigate("nextPage", { trigger: false });
      expect(Backbone.Router.prototype.navigate).toHaveBeenCalledWith("nextPage", { trigger: false });
    });

    it("calls router.navigate with options defaulted to true if none are passed", function() {
      spyOn(Backbone.Router.prototype, 'navigate');

      const view = new View();
      view.render();
      this.router.activeView = view;

      this.router.navigate("nextPage");
      expect(Backbone.Router.prototype.navigate).toHaveBeenCalledWith("nextPage", true);
    });

    describe("when activeView is provided", function() {
      describe("without beforeNavigate hook", function() {
        it("calls router.navigate right away", function() {
          spyOn(Backbone.Router.prototype, 'navigate');

          const view = new View();
          view.render();
          this.router.activeView = view;

          this.router.navigate("nextPage");
          expect(Backbone.Router.prototype.navigate).toHaveBeenCalledWith("nextPage", true);
        });
      });

      describe("with beforeNavigate hook", function() {
        var navigateRightAway;

        class View2 extends View {
          beforeNavigate(doNavigation) {
            if (navigateRightAway) {
              doNavigation();
            }
          }
        }

        describe("when navigateRightAway is false", function() {
          it("defers to beforeNavigate on view and not navigate by default", function() {
            spyOn(Backbone.Router.prototype, 'navigate');

            const view = new View2();
            view.render();
            this.router.activeView = view;

            navigateRightAway = false;
            this.router.navigate("nextPage");
            expect(Backbone.Router.prototype.navigate).not.toHaveBeenCalled();
          });
        });

        describe("when navigateRightAway is true", function() {
          it("defers to beforeNavigate on view and pass method to navigate when view is ready", function() {
            spyOn(Backbone.Router.prototype, 'navigate');

            const view = new View2();
            view.render();
            this.router.activeView = view;

            navigateRightAway = true;
            this.router.navigate("nextPage");
            expect(Backbone.Router.prototype.navigate).toHaveBeenCalledWith("nextPage", true);
          });
        });
      });
    });

    describe("when activeView is not provided", function() {
      it("calls router.navigate right away", function() {
        spyOn(Backbone.Router.prototype, 'navigate');

        this.router.navigate("nextPage");
        expect(Backbone.Router.prototype.navigate).toHaveBeenCalledWith("nextPage", true);
      });
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
