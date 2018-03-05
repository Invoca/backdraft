import { default as Backdraft } from "../../src/legacy/entry";

describe("Listing Plugin", function() {
  let app;
  let baseExports;
  let collection;

  beforeEach(function() {
    Backdraft.app.destroyAll();
    app = Backdraft.app("myapp", {
      plugins: [ "Listing" ]
    });
    app.model("M", {});
    app.collection("col", {
      model: app.Models.M
    });
    collection = new app.Collections.col();
    baseExports = Backdraft.plugin("Base");
  });

  describe("exports", function() {
    let Listing;

    beforeEach(function() {
      Listing = Backdraft.plugin("Listing");
    });

    it("should expose an Item", function() {
      app.view.listing.item("MyItem", {});
      expect(new app.Views.MyItem()).toEqual(jasmine.any(Listing.Item));
    });

    it("should expose a List", function() {
      app.view.listing.item("MyItem", {});
      app.view.listing("MyList", { itemClassName: "MyItem" });
      expect(new app.Views.MyList({ collection })).toEqual(jasmine.any(Listing.List));
    });
  });

  describe("factories", function() {
    it("should expose #listing", function() {
      app.view.listing.item("AbcItem", {});
      app.view.listing("Abc", {itemClassName: "AbcItem"});
      expect(new app.Views.Abc({ collection })).toEqual(jasmine.any(baseExports.View));
    });

    it("should expose #listing.item", function() {
      app.view.listing.item("Abc", {});
      expect(new app.Views.Abc()).toEqual(jasmine.any(baseExports.View));
    });

    it("requires that a collection be provided", function() {
      expect(() => {
        app.view.listing.item("AbcItem", {});
        app.view.listing("Abc", {itemClassName: "AbcItem"});
        new app.Views.Abc();
      }).toThrowError("A collection must be provided");
    });

    it("requires that an itemClassName is provided", function() {
      expect(() => {
        app.view.listing("Abc", {});
        new app.Views.Abc();
      }).toThrowError("itemClass must be defined");
    });

    it("should get a reference to the item class", function() {
      // intentionally define the listing before the item is defined to verify lazy evaluation of the item class
      app.view.listing("Abc", {
        itemClassName: "Def"
      });
      app.view.listing.item("Def", {});
      const listing = new app.Views.Abc({ collection });
      expect(listing.itemClass).toEqual(app.Views.Def);
    });
  });
});
