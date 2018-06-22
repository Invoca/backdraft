import _ from "underscore";

const pluginRegistry = {};

class Plugin {
  static get registered() {
    return pluginRegistry;
  }

  static get(name) {
    return this.ensurePlugin(name).exportedData;
  }

  static create(name, fn) {
    if (!fn) {
      return this.get(name);
    } else {
      // create and register new plugin. afterwards invoke callback with it
      if (this.registered[name]) throw new Error(`Plugin ${name} is already registered`);
      this.registered[name] = new Plugin(name);
      fn(this.registered[name]);
    }
  }

  static ensurePlugin(name) {
    const plugin = this.registered[name];

    if (!plugin) {
      throw new Error(`Plugin ${name} has not been registered`);
    }

    return plugin;
  }

  constructor(name) {
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
  install(app) {
    this.initializers.forEach(fn => fn(app));
  }
}

export default Plugin;
