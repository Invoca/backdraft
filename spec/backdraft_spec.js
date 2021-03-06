import { default as Backdraft } from "../src/backdraft";

import Plugin from "../src/plugin";
import App from "../src/app";
import Router from "../src/router";
import View from "../src/view";
import Item from "../src/listing/item";
import List from "../src/listing/list";

describe("Backdraft Namespace", function() {
  beforeEach(function() {
    Backdraft.app.registry.destroyAll();
  });

  afterEach(function() {
    Backdraft.app.registry.destroyAll();
  });

  describe('app', function() {
    describe('create', function() {
      describe('with prototype', function() {
        it('calls registry.createApp', function() {
          expect(Backdraft.app).toEqual(jasmine.any(Function));

          spyOn(Backdraft.app.registry, 'createApp').and.callThrough();

          const app = Backdraft.app("myapp", {});

          expect(Backdraft.app.registry.createApp).toHaveBeenCalledWith("myapp", {});
          expect(app).toEqual(jasmine.any(App));
        });
      });

      describe('with App instance', function() {
        it('calls registry.createApp', function() {
          spyOn(Backdraft.app.registry, 'createApp').and.callThrough();

          const appInstance = new App();
          const app = Backdraft.app("myapp", appInstance);

          expect(Backdraft.app.registry.createApp).toHaveBeenCalledWith("myapp", appInstance);
          expect(app).toEqual(appInstance);
        });
      });
    });

    describe("get", function() {
      beforeEach(function() {
        this.app = Backdraft.app("myapp", {});
      });

      it("calls registry.get", function() {
        spyOn(Backdraft.app.registry, 'get').and.callThrough();

        expect(Backdraft.app("myapp")).toEqual(this.app);

        expect(Backdraft.app.registry.get).toHaveBeenCalledWith("myapp");
      });

      describe("with callback", function() {
        it("calls registry.get and calls callback", function() {
          spyOn(Backdraft.app.registry, 'get').and.callThrough();

          Backdraft.app("myapp", function(app) {
            app.hello = "hola";
          });

          expect(Backdraft.app.registry.get).toHaveBeenCalledWith("myapp");
          expect(this.app.hello).toEqual("hola");
        });
      });
    });

    describe('with invalid parameters', function() {
      it("throws error", function() {
        expect(() => {
          Backdraft.app("invalid", "arguments");
        }).toThrow(new Error('Invalid arguments: (invalid, "arguments")'));
      });
    });

    describe('destroy', function() {
      it("calls registry.destroy", function() {
        Backdraft.app("myapp", {});

        spyOn(Backdraft.app.registry, 'destroy').and.callThrough();

        Backdraft.app.destroy("myapp");

        expect(Backdraft.app.registry.destroy).toHaveBeenCalledWith("myapp");
      });
    });

    describe('destroyAll', function() {
      it("calls registry.destroyAll", function() {
        Backdraft.app("myapp", {});
        Backdraft.app("myapp2", {});

        spyOn(Backdraft.app.registry, 'destroyAll').and.callThrough();

        Backdraft.app.destroyAll();

        expect(Backdraft.app.registry.destroyAll).toHaveBeenCalled();
      });
    });
  });

  describe("plugin", function() {
    it("is plugin factory", function() {
      spyOn(Plugin, "create").and.returnValue("howdy");

      const result = Backdraft.plugin("hello", "bro");

      expect(Plugin.create).toHaveBeenCalledWith("hello", "bro");

      expect(result).toEqual("howdy");
    });
  });

  describe("exports", function() {
    it("includes Router", function() {
      expect(Backdraft.Router).toEqual(Router);
    });

    it("includes View", function() {
      expect(Backdraft.View).toEqual(View);
    });

    it("includes Listing classes", function() {
      expect(Backdraft.Listing.ListView).toEqual(List);
      expect(Backdraft.Listing.ItemView).toEqual(Item);
    });
  });
});
