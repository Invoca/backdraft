describe("DataTable Plugin", function() {

  describe("Server Side", function() {

    var app;
    var collection;
    var table;

    beforeEach(function() {
      Backdraft.app.destroyAll();
      app = Backdraft.app("myapp", {
        plugins : [ "DataTable" ]
      });
      app.model("M", {});
      app.collection("Col", {
        model : app.Models.M,
        url : "/somewhere"
      });
      app.view.dataTable.row("R", {
        columns : [
          { attr : "name", title : "Name" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName : "R",
        serverSide : true
      });
      collection = new app.Collections.Col();
    });


    describe("restrictions", function() {

      it("should not allow the collection to contain models on creation", function() {
        collection.add({ name : "Bob" });
        expect(function() {
          table = new app.Views.T({ collection : collection });
        }).toThrowError("Server side dataTables requires an empty collection")
      });

      it("should not allow adding to the collection", function() {
        table = new app.Views.T({ collection : collection });
        expect(function() {
          collection.add({ name : "Bob" });
        }).toThrowError("Server side dataTables do not allow adding to the collection");
      });

      it("should not allow removing from the collection", function() {
        table = new app.Views.T({ collection : collection });
        expect(function() {
          collection.add({ name : "Bob" }, { silent : true });
          collection.remove(collection.models[0]);
        }).toThrowError("Server side dataTables do not allow removing from collection");
      });

      it("should require that collections define a url", function() {
        expect(function() {
          collection.url = null;
          table = new app.Views.T({ collection : collection });
        }).toThrowError("Server side dataTables require the collection to define a url");
      });

      it("should not allow the collection to be reset without providing an addData callback", function() {
        expect(function() {
          table = new app.Views.T({ collection : collection });
          collection.reset();
        }).toThrowError("An addData option is required to reset the collection");
      });

      it("should force pagination", function() {
        app.view.dataTable("T2", {
          rowClassName : "R",
          serverSide : true,
          paginate : false
        });
        table = new app.Views.T2({ collection : collection });
        expect(table.paginate).toEqual(true);
      });

    });

    describe("fetching server data", function() {

      var mockResponse = {
        status : 200,
        responseText : JSON.stringify({
          sEcho: '1',
          iTotalRecords: 100,
          iTotalDisplayRecords: 100,
          aaData: [
            { name: '1 - hey hey 1' },
            { name: '2 - hey hey 2' },
            { name: '3 - hey hey 3' },
            { name: '4 - hey hey 4' },
            { name: '5 - hey hey 5' },
            { name: '6 - hey hey 6' },
            { name: '7 - hey hey 7' },
            { name: '8 - hey hey 8' },
            { name: '9 - hey hey 9' },
            { name: '10 - hey hey 10' } 
          ] 
        })
      };

      beforeEach(function() {
        jasmine.Ajax.install();
      });

      afterEach(function() {
        jasmine.Ajax.uninstall();
      });

      it("should work with a url that is a string", function() {
        table = new app.Views.T({ collection : collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(mockResponse);
        expect(table.$("tbody tr").length).toEqual(10);
        expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
      });

      it("should work with a url that is a function", function() {
        var oldUrl = collection.url;
        collection.url = function() { return oldUrl };

        table = new app.Views.T({ collection : collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(mockResponse);
        expect(table.$("tbody tr").length).toEqual(10);
        expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
      });

      it("should allow for addition of server params", function() {
        table = new app.Views.T({ collection : collection });
        table.serverParams({ monkey : "chicken" });
        table.render();
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");
      });

      it("should reload the table when server params are set", function() {
        table = new app.Views.T({ collection : collection });
        table.render();

        table.serverParams({ monkey : "chicken" });
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");

        table.serverParams({ monkey : "rabbit" });
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("monkey=chicken");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=rabbit");
      });

      it("should pass the current server params with each page change", function() {
        table = new app.Views.T({ collection : collection });
        table.serverParams({ monkey : "chicken" });
        table.render();
        table.changePage("next");

        // an initial request and then another for the next page
        expect(jasmine.Ajax.requests.count()).toEqual(2);
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");
      });

      describe("rendering", function() {
        it("should disable filtering", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          jasmine.Ajax.requests.mostRecent().response(mockResponse);
          expect(table.$(".dataTables_filter").css("visibility")).toEqual("hidden");
        });
      });

    });

  });

});