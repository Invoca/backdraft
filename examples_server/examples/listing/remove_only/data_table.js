Backdraft.app("ListingExample", {

  plugins: [ "Listing"],

  activate: function($el) {
    this.mainRouter = new this.Routers.Main({ $el: $el });
    Backbone.history.start({ });
  }

});

Backdraft.app("ListingExample", function(app) {

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

Backdraft.app("ListingExample", function(app) {

  app.model("Book", {
    
  });

});

Backdraft.app("ListingExample", function(app) {

  app.collection("Books", {

    model: app.Models.Book
    
  });

});



Backdraft.app("ListingExample", function(app) {

  app.view.listing("BookList", {

    itemClassName: "BookItem",

    tagName: "ul"
  });

});

Backdraft.app("ListingExample", function(app) {

  app.view.listing.item("BookItem", {

    tagName: "li",

    events: {
      "click .remove-keyword": "_onRemoveClick"
    },

    render: function() {
      this.$el.text(this.model.get('name'));
      this.$el.append(' <a href="#" class="remove-keyword">X</a>');

      return this;
    },

    _onRemoveClick: function() {
      this.closeItem();
      return false;
    }

  });

});

Backdraft.app("ListingExample", function(app) {

  app.view("Index", {

    render: function() {
      var collection  = new app.Collections.Books();
      var data = [];

      // fake data
      for (var iter = 0; iter < 10; ++iter) {
        data.push({ name: "Item " + (iter + 1) });
      }

      collection.add(data);
      var list = new app.Views.BookList({ collection: collection });

      this.$el.html(list.render().$el);
      return this;
    }

  });

});

