describe("Listing Plugin", function() {

  describe("factories", function() {

    var app;
    var baseExports;

    beforeEach(function() {
      Backdraft.app.destroyAll();
      app = Backdraft.app("myapp", {
        plugins : [ "Listing" ]
      });
      baseExports = Backdraft.plugin("Base");
    });

    it("should expose #listing", function() {
      app.view.listing("abc", {});
      app.collection("col", {});
      var collection = new app.Collections.col();
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
      app.collection("col", {});
      var collection = new app.Collections.col();
      var listing = new app.Views.abc({ collection : collection });
      expect(listing.itemClass).toEqual(app.Views.def);
    });
    
  });

});