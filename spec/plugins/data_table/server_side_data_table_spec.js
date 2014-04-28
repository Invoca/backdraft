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
      })

    });

    describe("rendering", function() {

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

      it("should fetch data from the server", function() {
        table = new app.Views.T({ collection : collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(mockResponse);
        expect(table.$("tbody tr").length).toEqual(10);
        expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
      });

      it("should fetch data from the server when the url is a function", function() {
        var oldUrl = collection.url;
        collection.url = function() { return oldUrl };

        table = new app.Views.T({ collection : collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(mockResponse);
        expect(table.$("tbody tr").length).toEqual(10);
        expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
      });

    });

  });

});