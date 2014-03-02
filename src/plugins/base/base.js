Backdraft.plugin("Base", function(plugin) {

  {%= inline("src/plugins/base/view.js") %}
  {%= inline("src/plugins/base/collection.js") %}
  {%= inline("src/plugins/base/model.js") %}
  {%= inline("src/plugins/base/router.js") %}

  plugin.initializer(function(app) {
    app.view = function() {

    };

    app.collection = function() {

    };

    app.model = function() {

    };

    app.router = function() {

    };

  });


});