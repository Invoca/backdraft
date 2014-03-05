describe("Listing Plugin", function() {

  var app;
  var baseExports;
  var collection;

  beforeEach(function() {
    Backdraft.app.destroyAll();
    app = Backdraft.app("myapp", {
      plugins : [ "Listing" ]
    });
    app.model("M", {});
    app.collection("col", {
      model : app.Models.M
    });
    collection = new app.Collections.col();
    baseExports = Backdraft.plugin("Base");
  });

  describe("factories", function() {

    it("should expose #listing", function() {
      app.view.listing("abc", {});
      expect(new app.Views.abc({ collection : collection })).toEqual(jasmine.any(baseExports.View));
    });

    it("should expose #listing.item", function() {
      app.view.listing.item("abc", {});
      expect(new app.Views.abc).toEqual(jasmine.any(baseExports.View));
    });

    it("requires that a collection be provided", function() {
      expect(function() {
        app.view.listing("abc", {});
        new app.Views.abc();
      }).toThrowError("A collection must be provided");
    });

    it("should get a reference to the item class", function() {
      // intentionally define the listing before the item is defined to verify lazy evaluation of the item class
      app.view.listing("abc", {
        itemClassName : "def"
      });
      app.view.listing.item("def", {});
      var listing = new app.Views.abc({ collection : collection });
      expect(listing.itemClass).toEqual(app.Views.def);
    });

  });

  describe("rendering", function() {

    var listing;

    beforeEach(function() {
      app.view.listing("Main", {
        tagName : "ul",
        itemClassName : "Sub"
      });
      app.view.listing.item("Sub", {
        tagName : "li",
        render : function() {
          this.$el.html(this.model.get("name"));
          return this;
        }
      });
      listing = new app.Views.Main({ collection : collection });
      listing.render();
    });

    describe("collection is reset", function() {

      beforeEach(function() {
        collection.reset([ { name : "Bob"}, { name : "Joe"} ]);
      });

      it("should render a view for every model in the collection", function() {
        expect(listing.$("li").length).toEqual(2);
        expect(listing.$el.html()).toEqual("<li>Bob</li><li>Joe</li>");

      });

      it("should have children views for every model", function() {
        expect(_.size(listing.children)).toEqual(2);
      });

      it("should have cache populated for every model", function() {
        expect(listing.cache.size()).toEqual(2);
      });

      it("should remove children when the collection is reset to nothing", function() {
        collection.reset();
        expect(_.size(listing.children)).toEqual(0);
      });

      it("should have cache cleared when the collection is reset to nothing", function() {
        collection.reset();
        expect(listing.cache.size()).toEqual(0);
      });

    });

    describe("collection is added to", function() {

      beforeEach(function() {
        collection.add({ name : "Bob" });
      });

      it("should add a view for the model added", function() {
        expect(listing.$("li").length).toEqual(1);
        expect(listing.$el.html()).toEqual("<li>Bob</li>");
      });

      it("should register a child view for the model added", function() {
        expect(_.size(listing.children)).toEqual(1);
      });

      it("should populate the cache for the model added", function() {
        expect(listing.cache.size()).toEqual(1);
      });

    });

    function removeTests() {

      it("should remove a view for the model removed", function() {
        expect(listing.$("li").length).toEqual(1);
        expect(listing.$el.html()).toEqual("<li>Joe</li>");
      });

      it("should remove a child view for the model removed", function() {
        expect(_.size(listing.children)).toEqual(1);
      });

      it("should purge the cache fo the removed model", function() {
        expect(listing.cache.size()).toEqual(1);
      });

    }

    describe("collection is removed from", function() {

      beforeEach(function() {
        collection.reset([ { name : "Bob"}, { name : "Joe"} ]);
        collection.remove(collection.models[0]);
      });

      removeTests();

    });

    describe("#close helper", function() {

      beforeEach(function() {
        collection.reset([ { name : "Bob"}, { name : "Joe"} ]);
        var model = collection.models[0];
        var view = listing.cache.get(model);
        view.close();
      });

      removeTests();

    });

  });

});