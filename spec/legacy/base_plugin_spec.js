import { default as Backdraft } from "../../src/entry";

describe("Base Plugin", function() {
  describe("storage", function() {
    var app;

    beforeEach(function() {
      Backdraft.app.destroyAll();
      app = Backdraft.app("myapp", {});
    });

    it("should expose storage for classes", function() {
      expect(app.Views).toEqual({});
      expect(app.Models).toEqual({});
      expect(app.Collections).toEqual({});
      expect(app.Routers).toEqual({});
    });
  });

  describe("factories", function() {
    var app;
    var exports;

    beforeEach(function() {
      Backdraft.app.destroyAll();
      app = Backdraft.app("myapp", {});
      exports = Backdraft.plugin("Base");
    });

    it("should expose #view", function() {
      app.view("Abc", {});
      expect(new app.Views.Abc()).toEqual(jasmine.any(exports.View));
    });

    it("should expose #model", function() {
      app.model("Abc", {});
      expect(new app.Models.Abc()).toEqual(jasmine.any(exports.Model));
    });

    it("should expose #collection", function() {
      app.collection("Abc", {});
      expect(new app.Collections.Abc()).toEqual(jasmine.any(exports.Collection));
    });

    it("should expose #router", function() {
      app.router("Abc", {});
      expect(new app.Routers.Abc({ $el: $("<div>") })).toEqual(jasmine.any(exports.Router));
    });
  });

  describe("exports", function() {
    var exports;

    beforeEach(function() {
      exports = Backdraft.plugin("Base");
    });

    it("should expose a Router", function() {
      expect(new exports.Router({ $el: $("<div>") })).toEqual(jasmine.any(Backbone.Router));
    });

    it("should expose a View", function() {
      expect(new exports.View()).toEqual(jasmine.any(Backbone.View));
    });

    it("should expose a Collection", function() {
      expect(new exports.Collection()).toEqual(jasmine.any(Backbone.Collection));
    });

    it("should expose a Model", function() {
      expect(new exports.Model()).toEqual(jasmine.any(Backbone.Model));
    });

    it("should expose a Cache", function() {
      expect(new exports.Cache()).toEqual(jasmine.any(Object));
    });
  });
});
