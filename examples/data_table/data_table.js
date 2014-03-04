Backdraft.app("TableExample", {

  activate : function($el) {
    this.mainRouter = new this.Routers.Main({ $el : $el });
    Backbone.history.start({ });
  }

});

Backdraft.app("TableExample", function(app) {

  app.router("Main", {

    routes : {
      "" : "index"
    },

    index : function() {
      var view = new app.Views.Index();
      $("#example").dataTable();
      this.swap(view);
    }

  });

});



Backdraft.app("TableExample", function(app) {

  app.view("Index", {

    render : function() {
      this.$el.html("hi!")
      return this;
    }

  });

});

