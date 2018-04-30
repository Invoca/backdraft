import Backbone from "backbone";
import _ from "underscore";

import Class from "./legacy/utils/class";
import Plugin from "./plugin";

var App = (function() {

  var getInstance = function(name) {
    if (App.instances[name]) return App.instances[name];
    throw new Error("App " + name + " does not exist");
  };

  var App = Class.extend({

    constructor: function() {
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

    activate: function() {
      throw new Error("#activate must be implemented in your class");
    },

    destroy: function() {
      // to be implemented in subclasses
    }

  }, {

    instances: {

    },

    factory: function(name, obj) {
      if (!obj) {
        return getInstance(name);
      } else if (_.isFunction(obj)) {
        obj(getInstance(name));
      } else if (_.isObject(obj)) {
        // define app and create an instance of it
        if (App.instances[name]) throw new Error("App " + name + " is already defined");
        var appClass = App.extend(_.extend(obj, { name: name }));
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
    destroyAll: function() {
      _.chain(App.instances).keys().each(function(name) {
        App.factory.destroy(name);
      });
    },

    // destroy a single application with provided name
    destroy: function(name) {
      getInstance(name).destroy();
      delete App.instances[name];
    }

  });



  return App;

})();

export default App;
