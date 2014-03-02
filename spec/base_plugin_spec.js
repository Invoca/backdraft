describe("Base Plugin", function() {

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

});