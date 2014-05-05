Backdraft.app("TableExample", {

  plugins : [ "DataTable"],

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
      this.swap(view);
    }

  });

});

Backdraft.app("TableExample", function(app) {

  app.model("Book", {
    
  });

});

Backdraft.app("TableExample", function(app) {

  app.collection("Books", {

    model : app.Models.Book
    
  });

});



Backdraft.app("TableExample", function(app) {

  app.view.dataTable("BookTable", {

    rowClassName : "BookRow",

    layout : "t<'row'<'col-xs-4'p><'col-xs-4'l><'col-xs-4'i>>"

  });

});

Backdraft.app("TableExample", function(app) {

  app.view.dataTable.row("BookRow", {

    columns : [
      { bulk : true },
      { attr : "name", title : "Name" },
      { title : "random" }
    ],

    renderers : {
      "random" : function(node, config) {
        node.text(Math.random());
      }
    }

  });

});

Backdraft.app("TableExample", function(app) {

  app.view("Index", {

    render : function() {
      var collection  = new app.Collections.Books();
      var data = [];

      // fake data
      for (var iter = 0; iter < 100; ++iter) {
        data.push({ id : iter + 1, name : iter + 1 + " - hey hey " + (iter + 1) });
      }

      collection.add(data);
      var table = new app.Views.BookTable({ collection : collection, selectedIds : [1, 99] });
      this.$el.html(table.render().$el);
      return this;
    }

  });

});

