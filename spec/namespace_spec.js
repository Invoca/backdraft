import { default as Backdraft } from "../src/entry";

import Plugin from "../src/plugin";
import App from "../src/app";

describe("Backdraft Namespace", function() {
  beforeEach(function() {
    Backdraft.app.registry.destroyAll();
  });

  afterEach(function() {
    Backdraft.app.registry.destroyAll();
  });

  describe('app', function() {
    describe('create', function() {
      it('calls registry.createApp', function() {
        expect(Backdraft.app).toEqual(jasmine.any(Function));

        spyOn(Backdraft.app.registry, 'createApp').and.callThrough();

        const app = Backdraft.app("myapp", {});

        expect(Backdraft.app.registry.createApp).toHaveBeenCalledWith("myapp", {});
        expect(app).toEqual(jasmine.any(App));
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
      expect(Backdraft.plugin).toEqual(Plugin.create);
    });
  });
});
