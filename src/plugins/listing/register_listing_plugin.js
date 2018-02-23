import Plugin from "../../plugin";

import List from "./list";
import Item from "./item";

Plugin.factory("Listing", (plugin) => {

  plugin.exports({
    List,
    Item
  });

  plugin.initializer(app => {

    app.view.listing = function(name, properties) {
      app.Views[name] = List.extend(properties);
      List.finalize(name, app.Views[name], app.Views);
    };

    app.view.listing.item = function(name, properties) {
      app.Views[name] = Item.extend(properties);
    }
  });
});
