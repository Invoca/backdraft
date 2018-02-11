Backdraft.plugin("Listing", function(plugin) {

  {%= inline("src/plugins/listing/list.js") %}
  {%= inline("src/plugins/listing/item.js") %}

  plugin.exports({
    List: List,
    Item: Item
  });

  plugin.initializer(function(app) {

    app.view.listing = function(name, properties) {
      app.Views[name] = List.extend(properties);
      List.finalize(name, app.Views[name], app.Views);
    };

    app.view.listing.item = function(name, properties) {
      app.Views[name] = Item.extend(properties);
      Item.finalize(name, app.Views[name], app.Views);
    }
  });

});