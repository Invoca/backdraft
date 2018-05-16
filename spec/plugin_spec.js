import App from "../src/app";
import Plugin from "../src/plugin";

describe("Plugin", function() {
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

  describe("create", function() {
    it("should require unique plugin names", function() {
      Plugin.create("myplugin", function() { });

      expect(function() {
        Plugin.create("myplugin", function() { });
      }).toThrow();
    });

    it("should store and return exports", function() {
      Plugin.create("myplugin", function(plugin) {
        plugin.exports({
          xyz: 123
        });
      });

      expect(Plugin.create("myplugin").xyz).toEqual(123);
    });
  });

  describe("apps", function() {
    it("should error when an app specifies an invalid plugin", function() {
      expect(function() {
        // eslint-disable-next-line no-new
        new App(["invalid-one"]);
      }).toThrow();
    });

    it("should only run initializers for plugins an app has enabled", function() {
      var runSpy1 = jasmine.createSpy();
      var runSpy2 = jasmine.createSpy();
      var notRunSpy1 = jasmine.createSpy();
      var notRunSpy2 = jasmine.createSpy();

      Plugin.create("p1", function(plugin) {
        plugin.initializer(runSpy1);
        plugin.initializer(runSpy2);
      });

      Plugin.create("p2", function(plugin) {
        plugin.initializer(notRunSpy1);
        plugin.initializer(notRunSpy2);
      });

      // eslint-disable-next-line no-new
      new App(["p1"]);

      expect(runSpy1).toHaveBeenCalled();
      expect(runSpy2).toHaveBeenCalled();
      expect(notRunSpy1).not.toHaveBeenCalled();
      expect(notRunSpy2).not.toHaveBeenCalled();
    });
  });
});
