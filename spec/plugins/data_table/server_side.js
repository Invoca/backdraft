describe("DataTable Plugin", function() {
  var app;
  var collection;
  var table;
  var mockResponse;

  function MockResponse() {
    this.echo = 1;
  }

  MockResponse.prototype.get = function() {
    return {
      status : 200,
      responseText : JSON.stringify({
        sEcho: this.echo++,
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
  };

  MockResponse.prototype.getEmpty = function() {
    return {
      status : 200,
      responseText : JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 0,
        iTotalDisplayRecords: 0,
        aaData: []
      })
    };
  };

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
        { bulk : true },
        { attr : "name", title : "Name" },
        { attr : "date", title : "Date" },
        { title : "Non attr column"}
      ]
    });
    app.view.dataTable("T", {
      rowClassName : "R",
      serverSide : true
    });
    collection = new app.Collections.Col();

    jasmine.Ajax.install();
    mockResponse = new MockResponse();
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  describe("server side restrictions", function() {
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

  describe("server side rendering", function() {
    it("should disable filtering", function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
      expect(table.$(".dataTables_filter").css("visibility")).toEqual("hidden");
    });

    it("should allow a processing text to be provided", function() {
      app.view.dataTable("TableWithProcessing", {
        rowClassName : "R",
        serverSide : true,
        processingText: "HELLO I am processing stuff"
      });

      table = new app.Views.TableWithProcessing({ collection : collection });
      table.render();
      expect(table.$(".dataTables_processing").text()).toEqual("HELLO I am processing stuff");
    });

    it("should allow a empty text to be provided", function() {
      app.view.dataTable("TableWithEmptyText", {
        rowClassName : "R",
        serverSide : true,
        emptyText: "Sad, there is nothing here!"
      });

      table = new app.Views.TableWithEmptyText({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.getEmpty());
      expect(table.$(".dataTables_empty").text()).toEqual("Sad, there is nothing here!");
    });
  });

  describe("server side urls", function() {
    it("should work with a url that is a string", function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("/somewhere?");
      expect(table.$("tbody tr").length).toEqual(10);
      expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
    });

    it("should work with a url that is a function", function() {
      var oldUrl = collection.url;
      collection.url = function() { return oldUrl };

      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("/somewhere?");
      expect(table.$("tbody tr").length).toEqual(10);
      expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
    });
  });

  describe("server side params", function() {
    it("should automatically include column attributes", function() {
      var expectedAttrParams = $.param({ column_attrs : ["", "name", "date", ""] });
      table = new app.Views.T({ collection : collection });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch(expectedAttrParams);
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
  });

  describe("#selectAllMatching", function() {
    beforeEach(function() {
      table = new app.Views.T({ collection : collection });
      table.serverParams({ monkey : "chicken" });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
    });

    it("should require that all visible rows are also currently selected", function() {
      expect(function() {
        table.selectAllMatching(true);
      }).toThrowError("all rows must be selected before calling #selectAllMatching")

      expect(function() {
        table.selectAllVisible(true);
        table.selectAllMatching(true);
      }).not.toThrow();
    });

    it("should store a copy of the server params", function() {
      table.selectAllVisible(true);
      table.selectAllMatching(true);

      expect(table.selectAllMatching()).toEqual({ monkey : "chicken" });
    });

    it("should allow clearing", function() {
      table.selectAllVisible(true);
      table.selectAllMatching(true);

      expect(table.selectAllMatching()).toEqual({ monkey : "chicken" });

      table.selectAllMatching(false);
      expect(table.selectAllMatching()).toEqual(null);
    });

    describe("automatically clear stored params", function() {
      beforeEach(function() {
        table.selectAllVisible(true);
        table.selectAllMatching(true);
        expect(table.selectAllMatching()).toEqual({ monkey : "chicken" });
      })

      it("should clear on pagination", function() {
        table.changePage("next");
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());

        expect(table.selectAllMatching()).toEqual(null);
      });

      it("should clear on sorting", function() {
        table.sort([ [1,'asc'] ]);
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());

        expect(table.selectAllMatching()).toEqual(null);
      });

      it("should clear on page size change", function() {
        table.$(".dataTables_length select").val(25).change();
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());

        expect(table.selectAllMatching()).toEqual(null);
      });

      it("should clear when all rows are deselected", function() {
        table.selectAllVisible(false);

        expect(table.selectAllMatching()).toEqual(null);
      });

      it("should clear when a row becomes unchecked", function() {
        // need to actually insert into the DOM to have #click work correctly
        $("body").append(table.$el);
        table.$("td.bulk :checkbox:first").click();
        expect(table.selectAllMatching()).toEqual(null);
      });

      it("should clear when #serverParams is called", function() {
        table.serverParams({});
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());

        expect(table.selectAllMatching()).toEqual(null);
      });
    });
  });
});
