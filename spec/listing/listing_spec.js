import List from "../../src/listing/list";
import Item from "../../src/listing/item";

import Collection from "../../src/collection";

import { default as Backdraft } from "../../src/legacy/entry";

class Sub extends Item {
  get tagName() { return "li"; }

  render() {
    this.$el.html(this.model.get("name"));
    return this;
  }
}

class Main extends List {
  get tagName() { return "ul"; }
  get itemClass() { return Sub; }
}

describe("Listing", function() {
  let collection;

  beforeEach(function() {
    collection = new Collection();
  });

  describe("exports", function() {
    it("internal classes are available on Backdraft.Listing", function() {
      expect(Backdraft.Listing.ListView).toEqual(List);
      expect(Backdraft.Listing.ItemView).toEqual(Item);
    });
  });

  describe("inheritance", function() {
    describe("Item", function() {
      it("is inheritable", function() {
        class ChildItem extends Item {

        }

        expect(new ChildItem()).toEqual(jasmine.any(Item));
      });
    });

    describe("List", function() {
      it("is inheritable", function() {
        class ChildItem extends Item {

        }

        class ChildList extends List {
          get itemClass() {
            return ChildItem;
          }
        }

        expect(new ChildItem()).toEqual(jasmine.any(Item));
        expect(new ChildList({collection})).toEqual(jasmine.any(List));
      });

      it("requires itemClass to be defined", function() {
        class ChildList extends List {
        }

        expect(() => {
          // eslint-disable-next-line no-new
          new ChildList({collection});
        }).toThrowError("itemClass must be defined");
      });
    });
  });

  describe("rendering", function() {
    let listing;

    beforeEach(function() {
      listing = new Main({ collection });
      listing.render();
    });

    describe("collection is reset", function() {
      beforeEach(function() {
        collection.reset([ { name: "Bob" }, { name: "Joe" } ]);
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
        collection.add({ name: "Bob" });
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
        collection.reset([ { name: "Bob" }, { name: "Joe" } ]);
        collection.remove(collection.models[0]);
      });

      removeTests();
    });

    describe("#closeItem helper", function() {
      beforeEach(function() {
        collection.reset([ { name: "Bob" }, { name: "Joe" } ]);
        const model = collection.models[0];
        const view = listing.cache.get(model);
        view.closeItem();
      });

      removeTests();
    });
  });

  describe("scenarios", function() {
    it("should not remove models from the collection when #close is called", function() {
      collection.add({ id: 1 });
      collection.add({ id: 2 });
      const listing = new Main({ collection });
      listing.render();
      listing.close();
      expect(collection.length).toEqual(2);
    });
  });
});
