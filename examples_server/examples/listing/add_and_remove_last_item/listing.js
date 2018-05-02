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

    itemClassName: "BookItem"

  });

});

Backdraft.app("ListingExample", function(app) {

  app.view.listing.item("BookItem", {

    constructor: function() {
      app.Views.BookItem.__super___.constructor.apply(this, arguments);

      this.listenTo(this.model.collection, "add remove", function() {
        this._toggleRemove();
      }.bind(this));
    },

    events: {
      "click .remove-keyword": "_onRemoveClick"
    },

    render: function() {
      this.$el.html('<input type="text" value="' + this.model.get('name') + '" placeholder="Enter a name" />');
      this.$el.append(' <a href="#" class="remove-keyword hidden">X</a>');

      this._toggleRemove();
      return this;
    },

    _toggleRemove: function() {
      var lastListItem = this.model.collection.indexOf(this.model) === (this.model.collection.length - 1);
      this.$el.find(".remove-keyword").toggleClass('hidden', !lastListItem);
    },

    _onRemoveClick: function() {
      this.closeItem();
      return false;
    }

  });

});

Backdraft.app("ListingExample", function(app) {

  app.view("Index", {

    events: {
      "click .add-item": "_onAddItem"
    },

    constructor: function() {
      app.Views.Index.__super___.constructor.apply(this, arguments);

      this.collection = new app.Collections.Books();
      var data = [];

      // fake data
      for (var iter = 0; iter < 10; ++iter) {
        data.push({ name: "Item " + (iter + 1) });
      }

      this.collection.add(data);
    },

    render: function() {
      var list = new app.Views.BookList({ collection: this.collection });

      this.child("list", list);
      this.$el.html(list.render().$el);
      this.$el.append("<button class='add-item'>Add</button>");
      return this;
    },

    _onAddItem: function() {
      this.collection.add({ name: "" });
      this.child("list").$(":input:last").focus();
      return false;
    }

  });

});

