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

    model : app.Models.Book,

    url : "/server_side_data"

  });

});



Backdraft.app("TableExample", function(app) {

  app.view.dataTable("BookTable", {

    rowClassName : "BookRow",

    layout : "<'table-wrapper-with-footer'>t<'row'<'col-xs-6'>r>",

    serverSide : true

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
      var table = new app.Views.BookTable({ collection : collection });
      this.$el.html(table.render().$el);
      return this;
    }

  });

});

