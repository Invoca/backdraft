var Plugin = Backdraft.Utils.Class.extend({

  initialize : function(name) {
    this.name = name;
    this.initializers = [];
    this.exports = {};
  },

  // store a list of callback functions that will be executed in order
  // and passed an instance of a Backdraft application. Plugins are then able to add
  // factories and other properties onto an application instance
  initializer : function(fn) {
    this.initializers.push(fn);
  },

  // allow plugins to export static helpers, constants, etc
  exports : function(data) {
    _.extend(this.exports, data);
  },

  // call all initializers, providing Backdraft app instance to each
  runInitializers : function(app) {
    _.each(this.initializers, function(fn) {
      fn(app);
    });
  }

}, {

  registered : {

  },

  factory : function(name, fn) {
    if (!fn) {
      // return plugin instance with provided name
      if (!this.registered[name]) throw new Error("Plugin " + name + " could has not been registered");
      return this.registered[name];
    } else {
      // create and register new plugin. afterwards invoke callback with it
      if (this.registered[name]) throw new Error("Plugin " + name + " is already registered");
      this.registered[name] = new Plugin(name);
      fn(this.registered[name]);
    }
  },

  load : function(pluginNames, app) {
    // load plugins the app has requested
    _.chain(this.registered).pick(pluginNames).each(function(plugin) {
      plugin.runInitializers(app);
    });
  }


});
