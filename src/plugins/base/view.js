var View = (function() {

  function closeAllChildren() {

  }

  var View = Backbone.View.extend({

    constructor : function() {
      this.children = {};
      View.__super__.constructor.apply(this, arguments);
    },

    child : function() {
    },

    close : function() {
      this.trigger("beforeClose");

      closeAllChildren(this);

      // remove from the DOM
      this.remove();

      this.trigger("afterClose");
    }

  });

  return View;

})();
