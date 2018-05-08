import Plugin from "../plugin";

import List from "../listing/list";
import Item from "../listing/item";

import "./register_base_plugin";

// The Listing plugin is deprecated. Access to the List and Item classes is available through Backdraft.Listing.ListView and
// Backdraft.Listing.ItemView, respectively.

function finalizeList(name, listClass, views) {
  const descriptor = Object.create(null);
  descriptor.get = function() {
    return views[this.itemClassName];
  };

  Object.defineProperty(listClass.prototype, 'itemClass', descriptor);

  // maintain backwards compatibility
  listClass.prototype.getItemClass = function() {
    return this.itemClass;
  };
}

Plugin.create("Listing", (plugin) => {
  plugin.exports({
    List,
    Item
  });

  plugin.initializer(app => {
    app.installPlugin("Base");

    app.view.listing = function(name, properties) {
      app.Views[name] = List.extend(properties);
      finalizeList(name, app.Views[name], app.Views);
    };

    app.view.listing.item = function(name, properties) {
      app.Views[name] = Item.extend(properties);
    };
  });
});
