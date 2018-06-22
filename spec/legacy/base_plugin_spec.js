import "../../src/legacy/register_base_plugin";

import App from "../../src/app";
import Plugin from "../../src/plugin";

import Backbone from "backbone";
import $ from "jquery";

describe("Base Plugin", function() {
  const exports = Plugin.get("Base");

  describe("app usage", function() {
    var app;

    beforeEach(function() {
      app = new App(["Base"]);
    });

    describe("storage", function() {
      it("should expose storage for classes", function() {
        expect(app.Views).toEqual({});
        expect(app.Models).toEqual({});
        expect(app.Collections).toEqual({});
        expect(app.Routers).toEqual({});
      });
    });

    describe("factories", function() {
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
  });

  describe("exports", function() {
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
