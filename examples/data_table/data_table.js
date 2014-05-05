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
      // $("#example").dataTable();
      $("#example").hide()
      this.swap(view);
      view.redrawTable();
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
    columnPicker: true,
    horizontalScroll: true
  });

});

Backdraft.app("TableExample", function(app) {

  app.view.dataTable.row("BookRow", {

    columns : function(){
      return [
        { bulk : true },
        { attr : "name", title : "Name" },
        { title : "random" },
        { title : "random" },
        { title : "random" },
        { title : "random" },
        { title : "random" },
        { title : "random" },
        { title : "random" }
      ]  
    },

    renderers : {
      "random" : function(node, config) {
        node.text(Math.random());
      },
      "random2" : function(node, config) {
        node.text(Math.random());
      },
      "random3" : function(node, config) {
        node.text(Math.random());
      },
      "random4" : function(node, config) {
        node.text(Math.random());
      },
      "random5" : function(node, config) {
        node.text(Math.random());
      },
      "random6" : function(node, config) {
        node.text(Math.random());
      },
      "random7" : function(node, config) {
        node.text(Math.random());
      }
    }

  });

});

Backdraft.app("TableExample", function(app) {

  app.view("Index", {

    render : function() {
      var collection  = new app.Collections.Books();
      collection.add([
        { name : "bob" },
        { name : "joe" },
        { name : "euge" }
      ]);
      this.table = new app.Views.BookTable({ collection : collection });

      this.$el.html(this.table.render().$el);

      return this;
    },

    redrawTable: function() {
      this.table.dataTable.fnDraw();
    }

  });

});

