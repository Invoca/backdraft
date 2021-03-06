Backdraft.app("TableExample", {

  plugins: [ "DataTable"],

  activate: function($el) {
    this.mainRouter = new this.Routers.Main({ $el: $el });
    Backbone.history.start({ });
  }

});

Backdraft.app("TableExample", function(app) {

  app.router("Main", {

    routes: {
      "": "index"
    },

    index: function() {
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

    model: app.Models.Book,

    url: "/server_side_data?total=1"

  });

});



Backdraft.app("TableExample", function(app) {

  app.view.dataTable("BookTable", {

    rowClassName: "BookRow",

    layout: "<'table-wrapper-with-footer't><'row'<'col-xs-4'p><'col-xs-4'r><'col-xs-4'i>>",

    serverSide: true,

    isNontotalsColumn: function(col) {
      return col.id !== "income";
    },

  });

});

Backdraft.app("TableExample", function(app) {

  app.view.dataTable.row("BookRow", {

    columns: [
      { bulk: true },
      { attr: "name", title: "Name" },
      { attr: "address", title: "address" },
      { attr: "income", title: "Yearly income"},
      { title: "Random Hotness" }
    ],

    renderers: {
      "random-hotness": function(node, config) {
        node.text(Math.random());
      },
      "name": function(node, config) {
        node.text("name: " + this.model.get(config.attr));
      },
      "address": function(node, config) {
        node.text("addr: " + this.model.get(config.attr));
      },
      "income": function(node, config) {
        node.text("$" + this.model.get(config.attr));
      },
    }

  });

});

Backdraft.app("TableExample", function(app) {

  app.view("Index", {

    render: function() {
      var collection  = new app.Collections.Books();
      var table = new app.Views.BookTable({ collection: collection });
      this.$el.html(table.render().$el);
      return this;
    }

  });

});
