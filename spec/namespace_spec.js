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
    it('is a registry', function() {
      expect(Backdraft.app).toEqual(jasmine.any(Function));

      spyOn(Backdraft.app.registry, 'register').and.callThrough();

      const app = Backdraft.app("myapp", {});

      expect(Backdraft.app.registry.register).toHaveBeenCalledWith("myapp", {});
      expect(app).toEqual(jasmine.any(App));
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
