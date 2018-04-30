import Plugin from "../plugin";

import List from "../listing/list";
import Item from "../listing/item";

// The Listing plugin is deprecated. Access to the List and Item classes is available through Backdraft.Listing.ListView and
// Backdraft.Listing.ItemView, respectively.

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
    };
  });
});
