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