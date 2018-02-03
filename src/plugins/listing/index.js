import Plugin from "../../plugin";

import List from "./list";
import Item from "./item";

const ListingPlugin = Plugin.factory("Listing", function(plugin) {

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

export default ListingPlugin;
