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

    url: "/server_side_data"

  });

});



Backdraft.app("TableExample", function(app) {

  app.view.dataTable("BookTable", {

    rowClassName: "BookRow",

    layout: "<'table-wrapper-with-footer't><'row'<'col-xs-4'p><'col-xs-4'r><'col-xs-4'i>>",

    serverSide: true

  });

});

Backdraft.app("TableExample", function(app) {

  app.view.dataTable.row("BookRow", {

    columns: [
      { attr: "bulk",           bulk: true,             headerGroupDataIndex: "bulk" },
      { attr: "name",           title: "Name",           headerGroupDataIndex: "user" },
      { attr: "address",        title: "address",        headerGroupDataIndex: "user" },
      { attr: "income",         title: "Yearly income",  headerGroupDataIndex: "financial" },
    ],

    columnGroupDefinitions: [
      { "headerName": "",          "colspan": 1, headerGroupDataIndex: "bulk" },
      { "headerName": "User",      "colspan": 2, headerGroupDataIndex: "user" },
      { "headerName": "Financial", "colspan": 1, headerGroupDataIndex: "financial" },
    ],

    renderers: {
      "name": function(node, config) {
        node.text("name: " + this.model.get(config.attr));
      },
      "address": function(node, config) {
        node.text("addr: " + this.model.get(config.attr));
      },
      "income": function(node, config) {
        node.text("$"+this.model.get(config.attr));
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
