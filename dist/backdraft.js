(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  Backdraft.Utils.Class = (function() {

  // Backbone.js class implementation
  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  function Class() {
    this.initialize && this.initialize.apply(this, arguments);
  }

  _.extend(Class, {
    extend : extend
  });

  return Class;

})();
  var App = Backdraft.Utils.Class.extend({

  constructor : function() {
    // default list of plugin names this app should load, defaulting to none.
    // apps should either override this property or append to it
    this.plugins = [];
   
    // call parent constructor
    App.__super__.constructor.apply(this, arguments);

    // load plugins for this application
    PluginLoader.load(this.plugins, this);
  },

  render : function() {
    throw new Error("the render must be implemented in your class");
  }

})

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

})

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
  Backdraft.plugin = PluginLoader.factory;

  window.Backdraft = Backdraft;

})(jQuery);