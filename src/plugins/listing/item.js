import Plugin from "../../plugin";

var Item = (function() {

  var Base = Plugin.factory("Base");

  var Item = Base.View.extend({

    closeItem : function() {
      this.model.collection.remove(this.model);
    }

  }, {

    finalize : function(name, listClass, views) {
    }

  });

  return Item;

})();

export default Item;
