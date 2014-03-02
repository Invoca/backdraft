describe("App", function() {

  beforeEach(function() {
    Backdraft.app.destroyAll();
  });

  describe("create", function() {

    it("should create an instance", function() {
      var app = Backdraft.app("myapp", {});
      expect(app).toBeDefined();
    });

    it("should require unique app names", function() {
      expect(function() {
        Backdraft.app("myapp", {});
        Backdraft.app("myapp", {});
      }).toThrow();
    });

  });

  describe("get", function() {

    it("should return from the defining function", function() {
      expect(Backdraft.app("myapp", {})).toBeDefined();
    });

    it("should return with a callack", function(done) {
      Backdraft.app("myapp", {});
      Backdraft.app("myapp", function(app) {
        expect(app).toBeDefined();
        done();
      });
    });

    it("should return without a callback", function() {
      Backdraft.app("myapp", {});
      expect(Backdraft.app("myapp")).toBeDefined();
    });

  });

  describe("destroy", function() {

    it("should call #destroy", function() {
      var destroySpy = jasmine.createSpy();
      
      Backdraft.app("myapp", {
        destroy : function() {
          destroySpy();
        }
      });

      Backdraft.app.destroy("myapp");
      expect(destroySpy).toHaveBeenCalled();
    });

  });

});