import AppRegistry from "../src/app_registry";
import App from "../src/app";
import Plugin from "../src/plugin";

describe("App Registry", function() {
  beforeEach(function() {
    this.appRegistry = new AppRegistry();
  });

  describe("createApp", function() {
    describe("default", function() {
      it("should create an instance", function() {
        const app = this.appRegistry.register("myapp", {});
        expect(app).toBeDefined();
        expect(app).toEqual(jasmine.any(App));
      });

      it("installs Base plugin", function() {
        const app = this.appRegistry.register("myapp", {});
        expect(app.installedPlugins).toEqual(["Base"]);
        expect(app.plugins).toEqual(["Base"]);
      });
    });

    describe("with plugins", function() {
      beforeEach(function() {
        this.previouslyRegisteredPlugins = Object.keys(Plugin.registered);
      });

      afterEach(function() {
        Object.keys(Plugin.registered).forEach(pluginName => {
          if (this.previouslyRegisteredPlugins.indexOf(pluginName) === -1) {
            delete Plugin.registered[pluginName];
          }
        });
      });

      beforeEach(function() {
        Plugin.create("Plugin1", (plugin) => {});
      });

      it("installs all plugins", function() {
        const app = this.appRegistry.register("myapp", {
          plugins: ["Plugin1"]
        });

        expect(app.installedPlugins).toEqual(["Base", "Plugin1"]);
        expect(app.plugins).toEqual(["Base", "Plugin1"]);
      });
    });

    it("should require unique app names", function() {
      expect(function() {
        this.appRegistry.register("myapp", {});
        this.appRegistry.register("myapp", {});
      }).toThrow();
    });
  });

  describe("get", function() {
    it("should return with a callack", function(done) {
      this.appRegistry.register("myapp", {});
      this.appRegistry.register("myapp", function(app) {
        expect(app).toBeDefined();
        done();
      });
    });

    it("should return without a callback", function() {
      this.appRegistry.register("myapp", {});
      expect(this.appRegistry.register("myapp")).toBeDefined();
    });
  });

  describe("destroy", function() {
    it("should call #destroy", function() {
      var destroySpy = jasmine.createSpy();

      this.appRegistry.register("myapp", {
        destroy: function() {
          destroySpy();
        }
      });

      this.appRegistry.destroy("myapp");
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
