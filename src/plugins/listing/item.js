var Item = (function() {

  var Base = Backdraft.plugin("Base");

  var Item = Base.View.extend({
  }, {

    finalize : function(name, listClass, views) {
      // override the default #close method to simply remove from the collection which
      // triggers an event that will do the closing among other things
      listClass.prototype.closeOriginal = listClass.prototype.close;
      listClass.prototype.close = function() {
        this.model.collection.remove(this.model);
      }
    }

  });

  return Item;

})();