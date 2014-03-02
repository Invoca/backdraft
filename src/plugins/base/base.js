Backdraft.plugin("Base", function(plugin) {

  {%= inline("src/plugins/base/view.js") %}
  {%= inline("src/plugins/base/collection.js") %}
  {%= inline("src/plugins/base/model.js") %}
  {%= inline("src/plugins/base/router.js") %}

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