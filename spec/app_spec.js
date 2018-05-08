import App from "../src/app";
import Plugin from "../src/plugin";

describe("App", function() {
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

  describe("constructor", function() {
    beforeEach(function() {
      Plugin.factory("Plugin1", (plugin) => {
        plugin.initializer((app) => {
          app.plugin1Installed = "hey-o!";
        });
      });
    });

    describe("without plugins", function() {
      it("does not install plugins", function() {
        const app = new App();
        expect(app.plugin1Installed).toEqual(undefined);
        expect(app.plugins).toEqual([]);
        expect(app.installedPlugins).toEqual([]);
      });
    });

    describe("with plugins supplied through constructor", function() {
      it("installs plugins", function() {
        const app = new App(["Plugin1"]);
        expect(app.plugin1Installed).toEqual("hey-o!");
        expect(app.plugins).toEqual(["Plugin1"]);
        expect(app.installedPlugins).toEqual(["Plugin1"]);
      });
    });

    describe("with plugins supplied via prototype", function() {
      it("installs plugins", function() {
        class MyApp extends App {}
        MyApp.prototype.plugins = ["Plugin1"];

        const app = new MyApp();
        expect(app.plugin1Installed).toEqual("hey-o!");
        expect(app.plugins).toEqual(["Plugin1"]);
        expect(app.installedPlugins).toEqual(["Plugin1"]);
      });
    });
  });

  describe("installPlugin", function() {
    beforeEach(function() {
      Plugin.factory("Plugin1", (plugin) => {
        plugin.initializer((app) => {
          app.plugin1Installed = "hey-o!";
        });
      });

      Plugin.factory("Plugin2", (plugin) => {
        plugin.initializer((app) => {
          app.plugin2Installed = "yea!";
        });
      });
    });

    it("installs plugin", function() {
      const app = new App();
      expect(app.plugin1Installed).toEqual(undefined);
      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual([]);

      app.installPlugin("Plugin1");

      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual(["Plugin1"]);
    });

    it("installs plugins only once", function() {
      const app = new App();
      expect(app.plugin1Installed).toEqual(undefined);
      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual([]);

      app.installPlugin("Plugin1");

      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual(["Plugin1"]);

      app.installPlugin("Plugin1");

      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual(["Plugin1"]);

      app.installPlugin("Plugin2");

      expect(app.plugins).toEqual([]);
      expect(app.installedPlugins).toEqual(["Plugin1", "Plugin2"]);
    });
  });

  describe("activate", function() {
    it("is required", function() {
      expect(function() {
        const app = new App();
        app.activate();
      }).toThrow();
    });
  });

  describe("events", function() {
    it("should have Backbone.Events mixed in", function() {
      var app = new App();
      var eventSpy = jasmine.createSpy();
      app.on("something", eventSpy);
      app.trigger("something");

      expect(eventSpy).toHaveBeenCalled();
    });
  });
});
