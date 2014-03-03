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

    beforeEach(function() {
      Backdraft.app.destroyAll();
      app = Backdraft.app("myapp", {});
    });

    it("should expose #view", function() {
      expect(_.isFunction(app.view)).toBe(true);
    });

    it("should expose #model", function() {
      expect(_.isFunction(app.model)).toBe(true);
    });

    it("should expose #collection", function() {
      expect(_.isFunction(app.collection)).toBe(true);
    });

    it("should expose #router", function() {
      expect(_.isFunction(app.router)).toBe(true);
    });

  });

  describe("exports", function() {

    var exports;

    beforeEach(function() {
      exports = Backdraft.plugin("Base");
    });

    it("should expose a Router", function() {
      expect(new exports.Router()).toEqual(jasmine.any(Backbone.Router))
    });

    it("should expose a View", function() {
      expect(new exports.View()).toEqual(jasmine.any(Backbone.View))
    });

    it("should expose a Collection", function() {
      expect(new exports.Collection()).toEqual(jasmine.any(Backbone.Collection))
    });

    it("should expose a Model", function() {
      expect(new exports.Model()).toEqual(jasmine.any(Backbone.Model))
    });


  });

});