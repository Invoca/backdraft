import AppRegistry from "../src/app_registry";
import App from "../src/app";
import Plugin from "../src/plugin";

describe("App Registry", function() {
  beforeEach(function() {
    this.appRegistry = new AppRegistry();
  });

  describe("createApp", function() {
    describe("default", function() {
      beforeEach(function() {
        this.app = this.appRegistry.createApp("myapp", {});
      });

      it("sets name", function() {
        expect(this.app.name).toEqual("myapp");
      });

      it("returns an instance", function() {
        expect(this.app).toEqual(jasmine.any(App));
      });

      it("installs Base plugin", function() {
        expect(this.app.installedPlugins).toEqual(["Base"]);
        expect(this.app.plugins).toEqual(["Base"]);
      });
    });

    describe("with prototype", function() {
      beforeEach(function() {
        this.app = this.appRegistry.createApp("myapp", {
          yo: "bro",

          howsit() {
            return `it's good ${this.yo}`;
          }
        });
      });

      it("maintains prototype", function() {
        expect(this.app.yo).toEqual("bro");
        expect(this.app.howsit()).toEqual("it's good bro");
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
        const app = this.appRegistry.createApp("myapp", {
          plugins: ["Plugin1"]
        });

        expect(app.installedPlugins).toEqual(["Base", "Plugin1"]);
        expect(app.plugins).toEqual(["Base", "Plugin1"]);
      });
    });

    it("requires unique app names", function() {
      this.appRegistry.createApp("myapp", {});

      expect(() => {
        this.appRegistry.createApp("myapp", {});
      }).toThrow(new Error("App myapp is already defined"));
    });
  });

  describe("get", function() {
    it("returns app", function() {
      const app = this.appRegistry.createApp("myapp", { });
      expect(this.appRegistry.get("myapp")).toEqual(app);
    });
  });

  describe("destroy", function() {
    it("calls app.destroy", function() {
      var destroySpy = jasmine.createSpy();

      this.appRegistry.createApp("myapp", {
        destroy: function() {
          destroySpy();
        }
      });

      this.appRegistry.destroy("myapp");
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});
