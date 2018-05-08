import Backbone from "backbone";
import _ from "underscore";

import Plugin from "./plugin";

class App {
  constructor(plugins) {
    this.installedPlugins = [];

    plugins = plugins || this.plugins || [];
    plugins.forEach(name => this.installPlugin(name));
  }

  installPlugin(name) {
    const plugin = Plugin.ensurePlugin(name);

    if (this.installedPlugins.indexOf(plugin.name) === -1) {
      plugin.install(this);
      this.installedPlugins.push(name);
    }
  }

  activate() {
    throw new Error("#activate must be implemented in your class");
  }

  destroy() {
    // to be implemented in subclasses
  }
}

// add pub/sub support to the app
_.extend(App.prototype, Backbone.Events);

export default App;
