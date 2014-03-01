{%= inline("src/plugins/plugin.js") %}

var PluginLoader = Backdraft.Utils.Class.extend({
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
      if (this.registered[name]) throw new Error("Plugin " + name + " has already been registered");
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