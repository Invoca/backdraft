import Backbone from "backbone";
import _ from "underscore";

import Plugin from "./plugin";

class App {
  constructor() {
    // list of plugins by name this app should load, defaulting to none.
    // apps should either override this property or append to it in their #initialize method
    if (!this.plugins) this.plugins = [];

    // ensure that the Base plugin as always loaded
    if (!_.include(this.plugins, "Base")) this.plugins.unshift("Base");

    // load plugins for this application
    Plugin.load(this.plugins, this);
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
