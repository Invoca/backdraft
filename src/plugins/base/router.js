var Router = (function() {

  var Router = Backbone.Router.extend({

    constructor : function(options) {
      options || (options = {});
      if (options.$el) this.$el = options.$el;
      Router.__super__.constructor.apply(this, arguments);
    },

    swap : function(nextView) {
      this.activeView && this.activeView.close();

      this.activeView = nextView;
      this.activeView.trigger("beforeSwap", this);

      // render new view and place into router's element
      this.activeView.render();
      this.$el.html(this.activeView.$el);

      this.activeView.trigger("afterSwap", this);
    }

  });

  return Router;

})();