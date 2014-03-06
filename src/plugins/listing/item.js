var Item = (function() {

  var Base = Backdraft.plugin("Base");

  var Item = Base.View.extend({

    close : function() {
      this.model.collection.remove(this.model);
    }

  }, {

    finalize : function(name, listClass, views) {
    }

  });

  return Item;

})();