Backdraft.plugin("Base", function(plugin) {

  {%= inline("src/plugins/base/view.js") %}
  {%= inline("src/plugins/base/collection.js") %}
  {%= inline("src/plugins/base/model.js") %}
  {%= inline("src/plugins/base/router.js") %}
  {%= inline("src/plugins/base/cache.js") %}

  plugin.exports({
    Router : Router,
    View : View,
    Model : Model,
    Collection : Collection,
    Cache : Cache
  });

  // factories
  plugin.initializer(function(app) {
    app.Views = {};
    app.view = function(name, properties) {
      app.Views[name] = View.extend(properties);
    };

    app.Collections = {}
    app.collection = function(name, properties) {
      app.Collections[name] = Collection.extend(properties);
    };

    app.Models = {};
    app.model = function(name, properties) {
      app.Models[name] = Model.extend(properties);
    };

    app.Routers = {};
    app.router = function(name, properties) {
      app.Routers[name] = Router.extend(properties);
    };

  });


});