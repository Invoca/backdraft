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
        { attr : "name", title : "Name", filter : { type : "string" } },
        { attr : "cost", title : "Cost", filter : { type : "numeric" } },
        { attr : "type", title : "Type", filter : { type : "list", options: ["Basic", "Advanced"] } },
        { title : "Non attr column"}
      ],
      renderers: {
        "Non attr column": function(node, config) {
          node.html("Non attr column");
        }
      }
    });
    app.view.dataTable("T", {
      rowClassName : "R",
      serverSide : true,
      serverSideFiltering : true
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

    it("should trigger events on the document body when dataTables starts and finishes ajax ", function() {
      var startSpy = jasmine.createSpy("startSpy");
      var finishSpy = jasmine.createSpy("finishSpy");
      $("body").on(app.name + ":" + "ajax-start.backdraft", startSpy);
      $("body").on(app.name + ":" + "ajax-finish.backdraft", finishSpy);
      table = new app.Views.T({ collection : collection });
      table.render();

      expect(startSpy).toHaveBeenCalled();
      expect(finishSpy).not.toHaveBeenCalled();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
      expect(finishSpy).toHaveBeenCalled();

      var startArgs = startSpy.calls.argsFor(0);
      var finishArgs = finishSpy.calls.argsFor(0);

      // event
      expect(startArgs[0] instanceof jQuery.Event).toEqual(true);
      // xhr
      expect(_.keys(startArgs[1])).toContain("responseText")
      expect(_.keys(startArgs[1])).toContain("statusCode")
      // table
      expect(startArgs[2]).toEqual(table);

      // event
      expect(finishArgs[0] instanceof jQuery.Event).toEqual(true);
      // xhr
      expect(_.keys(finishArgs[1])).toContain("responseText")
      expect(_.keys(finishArgs[1])).toContain("statusCode")
      // status
      expect(finishArgs[2]).toEqual("success");
      // table
      expect(finishArgs[3]).toEqual(table);
      // filters
      expect(_.isArray(finishArgs[4])).toEqual(true);
      expect(_.pluck(finishArgs[4], "name")).toContain("sEcho");
      expect(_.pluck(finishArgs[4], "name")).toContain("column_attrs[]");
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
      var expectedAttrParams = $.param({ column_attrs : [undefined, "name", "cost", "type", undefined] });
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
      table.page("next");

      // an initial request and then another for the next page
      expect(jasmine.Ajax.requests.count()).toEqual(2);
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");
    });

    it("should set an X-Backdraft header on dataTables' ajax requests", function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().requestHeaders["X-Backdraft"]).toEqual("1");
      expect(jasmine.Ajax.requests.count()).toEqual(1);
      table.page("next");
      expect(jasmine.Ajax.requests.mostRecent().requestHeaders["X-Backdraft"]).toEqual("1");
      expect(jasmine.Ajax.requests.count()).toEqual(2);
    });

    it("should allow an AJAX method to be specified", function() {
      app.view.dataTable("AjaxMethodTestTable", {
        rowClassName : "R",
        serverSide : true,
        ajaxMethod: "POST",
      });

      table = new app.Views.AjaxMethodTestTable({ collection : collection });
      table.render();

      expect(jasmine.Ajax.requests.mostRecent().method).toEqual("POST");
    });

    it("should default to GET when an AJAX method is not specified", function() {
      app.view.dataTable("AjaxMethodTestTable", {
        rowClassName : "R",
        serverSide : true,
      });

      table = new app.Views.AjaxMethodTestTable({ collection : collection });
      table.render();

      expect(jasmine.Ajax.requests.mostRecent().method).toEqual("GET");
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
        table.page("next");
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

  describe("bulk selection", function() {
    beforeEach(function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
    });

    function bulkSelectionTests(action, callback) {
      it("should clear the bulk selection checkbox after " + action, function() {
        table.selectAllVisible(true);
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
        callback(table);
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
      });

      it("should reset selections after " + action, function() {
        expect(table.selectedModels().length).toEqual(0);
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(10);
        callback(table);
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
        expect(table.selectedModels().length).toEqual(0);
      });

      it("should trigger a selection change event after " + action, function() {
        var changeSelectSpy = jasmine.createSpy("changeSelectSpy");
        table.on("change:selected", changeSelectSpy);
        table.selectAllVisible(true);
        expect(changeSelectSpy.calls.allArgs()[0][0]).toEqual({ count: 10, selectAllVisible: true });
        callback(table);
        jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
        expect(changeSelectSpy.calls.allArgs()[1][0]).toEqual({ count: 0 });
      });
    }

    bulkSelectionTests("paginating", function(table) {
      table.page("next");
    });

    bulkSelectionTests("filtering", function(table) {
      table.filter("anything");
    });

    bulkSelectionTests("changing page size", function(table) {
      table.$(".dataTables_length select").val(25).change();
    });
  });

  describe("filtering", function() {
    beforeEach(function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
    });

    function VerifyFilterAjax(filterObj) {
      var url = jasmine.Ajax.requests.mostRecent().url;
      var expectedFilterJson = encodeURIComponent(JSON.stringify(filterObj));
      expect(url).toMatch("ext_filter_json="+expectedFilterJson);
    }

    it("should have an object for each filterable column in the column manager "+
        "which describes the filter to be applied", function() {
      var cg = table._columnManager._configGenerator;
      // should be 4 columns
      expect(cg.columnsConfig.length).toEqual(5);
      // filter should be undefined for unfilterable columns, not undefined for
      // filterable ones
      expect(cg.columnsConfig[0].filter).toEqual(undefined);
      expect(cg.columnsConfig[1].filter).not.toEqual(undefined);
      expect(cg.columnsConfig[2].filter).not.toEqual(undefined);
      expect(cg.columnsConfig[3].filter).not.toEqual(undefined);
      expect(cg.columnsConfig[4].filter).toEqual(undefined);
      // expect filter type to be string for column 1 and numeric for column 2
      // see global beforeEach ~line 46
      expect(cg.columnsConfig[1].filter.type).toEqual("string");
      expect(cg.columnsConfig[2].filter.type).toEqual("numeric");
      expect(cg.columnsConfig[3].filter.type).toEqual("list");
      expect(cg.columnsConfig[3].filter.options).toEqual(["Basic", "Advanced"]);
    });

    it("shouldn't create filter inputs for unfilterable columns", function() {
      var hasFilter = [];
      table.dataTable.find("thead th").each(function (index) {
        hasFilter.push(this.getElementsByClassName('DataTables_filter_wrapper').length > 0);
      });
      expect(hasFilter).toEqual([false, true, true, true, false]);
    });

    it("should track filtering in column manager and in ext_filter_json parameter", function() {
      var cg = table.configGenerator();
      //var cg = table._columnManager.columnsConfig();
      var expectedFilterObj = [];
      table.dataTable.find("thead th").each(function (index) {
        var title = this.outerText;
        title = title.substr(0, title.indexOf('Filter'));
        var col = cg.columnConfigByTitle.attributes[title];
        if (col && col.filter) {
          if (col.filter.type == "string") {
            // test assignment
            $('.filterMenu input', this).val("Scott").trigger("change");
            expect(col.filter.value).toEqual("Scott");
            // verify ajax
            expectedFilterObj = [{type:"string", attr: col.attr, comparison:"value", value:"Scott"}];
            VerifyFilterAjax(expectedFilterObj);

            // test unassignment
            $('.filterMenu input', this).val("").trigger("change");
            expect(col.filter.value).toEqual(null);
            // verify ajax
            expectedFilterObj = [];
            VerifyFilterAjax(expectedFilterObj);
          }
          else if (col.filter.type == "numeric") {
            // test assignment
            $('.filterMenu #eq', this).val("0.5").trigger("change");
            expect(col.filter.eq).toEqual("0.5");
            // verify ajax
            expectedFilterObj = [{type:"numeric", attr: col.attr, comparison:"eq", value:0.5}];
            VerifyFilterAjax(expectedFilterObj);

            // test unassignment
            $('.filterMenu #eq', this).val("").trigger("change");
            expect(col.filter.eq).toEqual(null);
            // verify ajax
            expectedFilterObj = [];
            VerifyFilterAjax(expectedFilterObj);
          }
          else if (col.filter.type == "list") {
            // test assignment
            $('.filterMenu #value', this).prop("checked", true).trigger("change");
            expect(col.filter.value).toEqual(["Basic", "Advanced"]);
            // verify ajax
            expectedFilterObj = [{type:"list", attr: col.attr, comparison:"value", value:["Basic", "Advanced"]}];
            VerifyFilterAjax(expectedFilterObj);

            // test unassignment
            $('.filterMenu #value', this).prop("checked", false).trigger("change");
            expect(col.filter.eq).toEqual(undefined);
            // verify ajax
            expectedFilterObj = [];
            VerifyFilterAjax(expectedFilterObj);
          }
        }
      });
    });
  });

});
