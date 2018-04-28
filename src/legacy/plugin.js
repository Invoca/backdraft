import _ from "underscore";

// for tests
export const pluginRegistry = {};

class Plugin {
  static get registered() {
    return pluginRegistry;
  }

  static factory(name, fn) {
    if (!fn) {
      // return exports of plugin with provided name
      if (!Plugin.registered[name]) throw new Error(`Plugin ${name} has not been registered`);
      return Plugin.registered[name].exportedData;
    } else {
      // create and register new plugin. afterwards invoke callback with it
      if (Plugin.registered[name]) throw new Error(`Plugin ${name} is already registered`);
      Plugin.registered[name] = new Plugin(name);
      fn(Plugin.registered[name]);
    }
  }

  static load(pluginNames, app) {
    // load plugins the app has specified
    _.each(pluginNames, name => {
      if (!Plugin.registered[name]) throw new Error(`Plugin ${name} has not been registered`);
      Plugin.registered[name].runInitializers(app);
    });
  }

  constructor(...args) {
    this.initialize(...args);
  }

  initialize(name) {
    this.name = name;
    this.initializers = [];
    this.exportedData = {};
  }

  // store a list of callback functions that will be executed in order
  // and passed an instance of a Backdraft application. Plugins are then able to add
  // factories and other properties onto an application instance
  initializer(fn) {
    this.initializers.push(fn);
  }

  // allow plugins to export static helpers, constants, etc
  exports(data) {
    _.extend(this.exportedData, data);
  }

  // call all initializers, providing Backdraft app instance to each
  runInitializers(app) {
    _.each(this.initializers, fn => {
      fn(app);
    });
  }
}

export default Plugin;
