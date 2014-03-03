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

  var App = (function() {

  var getInstance = function(name) {
    if (App.instances[name]) return App.instances[name];
    throw new Error("App " + name + " does not exist");
  };

  var App = Backdraft.Utils.Class.extend({

    constructor : function() {
      // list of plugins by name this app should load, defaulting to none.
      // apps should either override this property or append to it in their #initialize method
      if (!this.plugins) this.plugins = [];

      // ensure that the Base plugin as always loaded
      if (!_.include(this.plugins, "Base")) this.plugins.unshift("Base");
     
      // call parent constructor
      App.__super__.constructor.apply(this, arguments);

      // load plugins for this application
      Plugin.load(this.plugins, this);
    },

    activate : function() {
      throw new Error("#activate must be implemented in your class");
    },

    destroy : function() {
      // to be implemented in subclasses
    }

  }, {

    instances : {

    },

    factory : function(name, obj) {
      if (!obj) {
        return getInstance(name);
      } else if (_.isFunction(obj)) {
        obj(getInstance(name));
      } else if (_.isObject(obj)) {
        // define app and create an instance of it
        if (App.instances[name]) throw new Error("App " + name + " is already defined");
        var appClass = App.extend(_.extend(obj, { name : name }));
        App.instances[name] = new appClass();
        return App.instances[name];
      }

    }

  });

  // add pub/sub support to the app
  _.extend(App.prototype, Backbone.Events);

  // support for destroying apps
  _.extend(App.factory, {

    // destroys all existing applications
    destroyAll : function() {
      _.chain(App.instances).keys().each(function(name) { 
        App.factory.destroy(name);
      });
    },

    // destroy a single application with provided name
    destroy : function(name) {
      getInstance(name).destroy();
      delete App.instances[name];
    }

  });



  return App;

})();
  Backdraft.app = App.factory;

  var Plugin = Backdraft.Utils.Class.extend({

  initialize : function(name) {
    this.name = name;
    this.initializers = [];
    this.exportedData = {};
  },

  // store a list of callback functions that will be executed in order
  // and passed an instance of a Backdraft application. Plugins are then able to add
  // factories and other properties onto an application instance
  initializer : function(fn) {
    this.initializers.push(fn);
  },

  // allow plugins to export static helpers, constants, etc
  exports : function(data) {
    _.extend(this.exportedData, data);
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
      // return exports of plugin with provided name
      if (!Plugin.registered[name]) throw new Error("Plugin " + name + " has not been registered");
      return Plugin.registered[name].exportedData;
    } else {
      // create and register new plugin. afterwards invoke callback with it
      if (Plugin.registered[name]) throw new Error("Plugin " + name + " is already registered");
      Plugin.registered[name] = new Plugin(name);
      fn(Plugin.registered[name]);
    }
  },

  load : function(pluginNames, app) {
    // load plugins the app has specified
    _.each(pluginNames, function(name) {
      if (!Plugin.registered[name]) throw new Error("Plugin " + name + " has not been registered");
      Plugin.registered[name].runInitializers(app);
    });
  }

});

_.extend(Plugin.factory, {

  destroyAll : function() {
    _.each(Plugin.registered, function(plugin, name) {
      // the Base plugin cannot be destroyed
      if (name !== "Base") delete Plugin.registered[name];
    })
  }
});

  Backdraft.plugin = Plugin.factory;

  Backdraft.plugin("Base", function(plugin) {

  var View = (function() {

  function closeAllChildren() {

  }

  var View = Backbone.View.extend({

    constructor : function() {
      this.children = {};
      View.__super__.constructor.apply(this, arguments);
    },

    child : function() {
    },

    close : function() {
      this.trigger("beforeClose");

      closeAllChildren(this);

      // remove from the DOM
      this.remove();

      this.trigger("afterClose");
    }

  });

  return View;

})();

  var Collection = (function() {

  var Collection = Backbone.Collection.extend({

  });

  return Collection;

})();
  var Model = (function() {

  var Model = Backbone.Model.extend({

  });

  return Model;

})();
  var Router = (function() {

  var Router = Backbone.Router.extend({

    constructor : function(options) {
      options || (options = {});
      if (options.$el) this.$el = options.$el;
      Router.__super__.constructor.apply(this, arguments);
    },

    swap : function(nextView) {
      this.activeView && this.activeView.close();

      this.activeView = nextView;
      this.activeView.trigger("beforeSwap", this);

      // render new view and place into router's element
      this.activeView.render();
      this.$el.html(this.activeView.$el);

      this.activeView.trigger("afterSwap", this);
    }

  });

  return Router;

})();

  plugin.exports({
    Router : Router,
    View : View,
    Model : Model,
    Collection : Collection
  });

  plugin.initializer(function(app) {
    app.Views = {};
    app.view = function() {

    };

    app.Collections = {}
    app.collection = function() {

    };

    app.Models = {};
    app.model = function() {

    };

    app.Routers = {};
    app.router = function() {

    };

  });


});

  window.Backdraft = Backdraft;

})(jQuery);