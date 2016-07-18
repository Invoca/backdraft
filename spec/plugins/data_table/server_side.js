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
          { name: '1 - hey hey 1', cost: '', type: '' },
          { name: '2 - hey hey 2', cost: '', type: '' },
          { name: '3 - hey hey 3', cost: '', type: '' },
          { name: '4 - hey hey 4', cost: '', type: '' },
          { name: '5 - hey hey 5', cost: '', type: '' },
          { name: '6 - hey hey 6', cost: '', type: '' },
          { name: '7 - hey hey 7', cost: '', type: '' },
          { name: '8 - hey hey 8', cost: '', type: '' },
          { name: '9 - hey hey 9', cost: '', type: '' },
          { name: '10 - hey hey 10', cost: '', type: '' }
        ]
      })
    };
  };

  MockResponse.prototype.getBadKey = function() {
    return {
      status : 200,
      responseText : JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 1,
        iTotalDisplayRecords: 1,
        aaData: [
          { name_misspelled: '1 - hey hey 1' }
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

  function spyOnDataTableAjaxResponse(table) {
    var callbackSpy = jasmine.createSpy("callbackSpy");
    var originalFetchServerData = table._fetchServerData;

    spyOn(table, '_fetchServerData').and.callFake(function (sUrl, aoData, fnCallback, oSettings) {
      // pass through except use our own callBack to test the right json was passed to it (which is an internal DT callback that can't be spied on or stubbed)
      originalFetchServerData.call(this, sUrl, aoData, callbackSpy, oSettings);
    });

    spyOn(table.collection, 'reset').and.callThrough();

    return callbackSpy;
  }

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
        "non attr column": function(node, config) {
          node.html("Non attr column");
        }
      }
    });
    app.view.dataTable("T", {
      rowClassName : "R",
      serverSide : true,
      sorting : [['name', 'desc']],
      filteringEnabled: true,
      serverSideFiltering : true
    });

    app.view.dataTable.row("RSimple", {
      columns : [
        { attr : "cost", title : "Cost", filter : { type : "numeric" } },
        { attr : "name", title : "Name", filter : { type : "string" } }
      ]
    });

    app.view.dataTable("TSimple", {
      rowClassName : "RSimple",
      serverSide : true,
      sorting : [['name', 'desc']],
      simpleParams : true
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
    it("should log a warning via DataTables when the keys returned do not match", function() {
      table = new app.Views.T({ collection : collection });
      table.render();

      try {
        jasmine.Ajax.requests.mostRecent().response(mockResponse.getBadKey());
        throw Error("DataTables did not throw an error when we expected it to. It should warn about a missing parameter based on bad server response.");
      } catch(ex) {
        expect(ex.message).toMatch(/Requested unknown parameter/)
      }
    });

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

  describe("server side removal", function() {
    it("should reload the collection to the page", function() {
      table = new app.Views.T({ collection : collection });
      collection.remove(collection.models[0])

      expect(table.$("tbody tr").length).toEqual(0);
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
        rowClassName: "R",
        serverSide: true
      });

      table = new app.Views.AjaxMethodTestTable({collection: collection});
      table.render();

      expect(jasmine.Ajax.requests.mostRecent().method).toEqual("GET");
    });

    it("should handle DT 1.10 param for sEcho (draw) for ajax response", function() {
      table = new app.Views.T({ collection : collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status : 200,
        responseText : JSON.stringify({
          draw: '33',
          iTotalRecords: 0,
          iTotalDisplayRecords: 0,
          aaData: []
        })
      });

      expect(callbackSpy).toHaveBeenCalled();

      var ajaxUpdateArgs = callbackSpy.calls.argsFor(0);

      // data params filters
      expect(ajaxUpdateArgs[0].sEcho).toEqual("33");
    });

    it("should handle generic API param for sEcho (requestId) for ajax response", function() {
      table = new app.Views.T({ collection : collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status : 200,
        responseText : JSON.stringify({
          requestId: '33',
          iTotalRecords: 0,
          iTotalDisplayRecords: 0,
          aaData: []
        })
      });

      expect(callbackSpy).toHaveBeenCalled();

      var ajaxUpdateArgs = callbackSpy.calls.argsFor(0);

      // data params filters
      expect(ajaxUpdateArgs[0].sEcho).toEqual("33");
    });

    it("should handle generic API param for total records and data for ajax response", function() {
      table = new app.Views.T({ collection : collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status : 200,
        responseText : JSON.stringify({
          requestId: '33',
          recordsTotal: 2,
          recordsFiltered: 1,
          data: [{ name : 'bar' }]
        })
      });

      expect(callbackSpy).toHaveBeenCalled();

      var ajaxUpdateArgs = callbackSpy.calls.argsFor(0);

      // data params filters
      expect(ajaxUpdateArgs[0].sEcho).toEqual("33");
      expect(ajaxUpdateArgs[0].iTotalRecords).toEqual(2);
      expect(ajaxUpdateArgs[0].iTotalDisplayRecords).toEqual(1);

      // testing the aaData is mapped (need to spy the collection.reset since it then modifies the aaData param internally)
      expect(table.collection.reset.calls.argsFor(0)[0]).toEqual([{ name : 'bar' }]);
    });

    it("should handle generic API param for total records when 0 in ajax response", function() {
      table = new app.Views.T({ collection : collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status : 200,
        responseText : JSON.stringify({
          requestId: '33',
          recordsTotal: 0,
          data: []
        })
      });

      expect(callbackSpy).toHaveBeenCalled();

      var ajaxUpdateArgs = callbackSpy.calls.argsFor(0);

      // data params filters
      expect(ajaxUpdateArgs[0].sEcho).toEqual("33");
      expect(ajaxUpdateArgs[0].iTotalRecords).toEqual(0);
      expect(ajaxUpdateArgs[0].iTotalDisplayRecords).toEqual(0);
    });

    describe("when in simple_params mode", function() {
      it("should pass simpler paging and sort param names", function() {
        table = new app.Views.TSimple({collection: collection});
        table.render();

        table.serverParams({monkey: "chicken"});
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_by=name");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_dir=desc");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=2");
      });

      it("should handle no sort param and not pass sort dir either", function() {
        table = new app.Views.TSimple({collection: collection});

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function (aoData) {
          // pass in same array object but emptied out, to simulate no existing sort params
          aoData.splice(0, aoData.length);
          aoData.push({name: "sEcho", value: "3"});
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({monkey: "chicken"});
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_by");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_dir");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=3");
      });

      it("should handle when no sort param is found but sort dir did exist (and not send either param)", function() {
        table = new app.Views.TSimple({collection: collection});

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function (aoData) {
          // pass in same array object but emptied out, to simulate no existing sort params
          aoData.splice(0, aoData.length);
          aoData.push({name: "sEcho", value: "3"});
          aoData.push({name: "sSortDir_0", value: "desc"});
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({monkey: "chicken"});
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_by");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_dir");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=3");
      });

      it("should handle when sort param is index 0 and not treat as false", function() {
        table = new app.Views.TSimple({collection: collection});

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function (aoData) {
          // pass in same array object but emptied out first
          aoData.splice(0, aoData.length);
          aoData.push({ name: "sEcho", value: "3" });
          aoData.push({ name: "iSortCol_0", value: 0 });
          aoData.push({ name: "sSortDir_0", value: "desc" });
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({monkey: "chicken"});
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_by=cost");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_dir=desc");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=3");
      });
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
    var cg;
    beforeEach(function() {
      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse.get());
      history.pushState(null, null, "_SpecRunner.html");
      cg = table.configGenerator();
    });

    function getColumnConfigByCSS(element) {
      var id = Backdraft.Utils.extractColumnCSSClass(element.className).replace("column-","");
      return cg.columnConfigById.attributes[id];
    };

    function clearFilters() {
      table.dataTable.find("thead th").not(".bulk").each(function (index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            switch (col.filter.type) {
              case "string":
                $(".toggle-filter-button", this).click();
                $('.filterMenu input').val("").trigger("change");
                break;
              case "numeric":
                $(".toggle-filter-button", this).click();
                $("input#first-filter").val("").trigger("change");
                break;

              case "list":
                $(".toggle-filter-button", this).click();
                $('.filterMenu input').prop("checked", false).trigger("change");
                break;
            }
          }
        }
      });
    };

    function populateFilters() {
      table.dataTable.find("thead th").not(".bulk").each(function (index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            switch (col.filter.type) {
              case "string":
                $(".toggle-filter-button", this).click();
                $('.filterMenu input').val("Scott").trigger("change");
                $(".btn-filter").trigger("click");
                break;
              case "numeric":
                $(".toggle-filter-button", this).click();
                $('select[data-filter-id=first-filter]').val("eq").trigger("change");
                $('input#first-filter').val("0.5").trigger("change");
                $(".btn-filter").trigger("click");
                break;
              case "list":
                $(".toggle-filter-button", this).click();
                $(".filterMenu input[value=Basic]").prop("checked", true).trigger("change");
                $(".btn-filter").trigger("click");
                break;
            }
          }
        }
      });
    }

    function verifyFilterAjax(filterObj) {
      var url = jasmine.Ajax.requests.mostRecent().url;
      var expectedFilterJson = encodeURIComponent(JSON.stringify(filterObj));
      expect(url).toMatch("ext_filter_json="+expectedFilterJson);
    }

    function verifyUrlParams(filterObj) {
      var uri = encodeURIComponent($.deparam(window.location.href.split("?")[1]).filter_json)
      var expectedFilterJson = (filterObj.length>0) ? encodeURIComponent(JSON.stringify(filterObj)) : "";
      expect(uri).toMatch(expectedFilterJson);
    }

    it("should not duplicate filter view when there are duplicate title names", function() {

      // Create a brand new table with duplicate titles
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
          { attr : "cost2", title : "Cost", filter : { type : "numeric" } },
          { attr : "type", title : "Type", filter : { type : "list", options: ["Basic", "Advanced"] } },
          { title : "Non attr column"}
        ],
        renderers: {
          "non attr column": function(node, config) {
            node.html("Non attr column");
          }
        }
      });
      app.view.dataTable("T", {
        rowClassName : "R",
        serverSide : true,
        sorting : [['name', 'desc']],
        filteringEnabled: true,
        serverSideFiltering : true
      });

      var mockResponse = {
        status : 200,
        responseText : JSON.stringify({
          sEcho: 'custom1',
          iTotalRecords: 1,
          iTotalDisplayRecords: 1,
          aaData: [
            { name: '1 - hey hey 1', cost: 'c', cost2: 'c2', type: '' }
          ]
        })
      };

      collection = new app.Collections.Col();

      jasmine.Ajax.install();

      table = new app.Views.T({ collection : collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse);
      expect(table.children["filter-name"]).toBeDefined();
      expect(table.children["filter-cost"]).toBeDefined();
      expect(table.children["filter-cost2"]).toBeDefined();
      expect(table.children["filter-type"]).toBeDefined();
      expect(table).toBeDefined();
    });

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

      history.pushState(null, null, "_SpecRunner.html?date_filter=today");

      var expectedFilterObj = [];
      table.dataTable.find("thead th").not(".bulk").each(function (index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            if (col.filter.type === "string") {
              // test assignment
              $(".toggle-filter-button", this).click();
              $('.filterMenu input').val("Scott").trigger("change");
              expect(col.filter.value).toEqual("Scott");
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [{type: "string", attr: col.attr, comparison: "value", value: "Scott"}];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);

              // test unassignment
              $(".toggle-filter-button", this).click();
              $('.filterMenu input').val("").trigger("change");
              expect(col.filter.value).toEqual(null);
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);
            }
            else if (col.filter.type === "numeric") {
              // test assignment
              $(".toggle-filter-button", this).click();
              $('select[data-filter-id=first-filter]').val("eq").trigger("change");
              $('input#first-filter').val("0.5").trigger("change");
              expect(col.filter.eq).toEqual("0.5");
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [{type: "numeric", attr: col.attr, comparison: "eq", value: 0.5}];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);

              // test unassignment
              $(".toggle-filter-button", this).click();
              $("input#first-filter").val("").trigger("change");
              expect(col.filter.eq).toEqual(null);
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);
            }
            else if (col.filter.type === "list") {
              // test assignment
              $(".toggle-filter-button", this).click();
              $('.filterMenu input').prop("checked", true).trigger("change");
              expect(col.filter.value).toEqual(["Basic", "Advanced"]);
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [{type: "list", attr: col.attr, comparison: "value", value: ["Basic", "Advanced"]}];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);

              // test unassignment
              $(".toggle-filter-button", this).click();
              $('.filterMenu input').prop("checked", false).trigger("change");
              expect(col.filter.value).toEqual(null);
              // verify ajax
              $(".btn-filter").trigger("click");
              expectedFilterObj = [];
              verifyFilterAjax(expectedFilterObj);
              verifyUrlParams(expectedFilterObj);
            }
          }
        }
      });
    });

    it("should load filters from url params", function() {
      history.pushState(null, null, "_SpecRunner.html?date_filter=today");
      var expectedFilters = [];
      // populate url with filters
      populateFilters();
      // get url
      var oldFilterSettings = table._getFilteringSettings();
      var populatedURL = "_SpecRunner.html"+window.location.search;
      // remove filters
      clearFilters();
      // push the populatedURL
      history.pushState(null, null, populatedURL);
      // Since we can't do a refresh, we just call the method that fires at that moment
      cg._computeColumnConfig();
      // get new filtering settings
      var newFilterSettings = table._getFilteringSettings();
      // They should be the same
      expect(oldFilterSettings).toEqual(newFilterSettings);
      history.pushState(null, null, "_SpecRunner.html");
    });

    it("should load filters from url params with old uri param", function() {
      history.pushState(null, null, "_SpecRunner.html?date_filter=today");
      var expectedFilters = [];
      populateFilters();
      var oldFilterSettings = table._getFilteringSettings();
      var populatedURL = "_SpecRunner.html"+window.location.search;
      populatedURL = populatedURL.replace("filter_json", "ext_filter_json");
      clearFilters();
      history.pushState(null, null, populatedURL);
      cg._computeColumnConfig();
      var newFilterSettings = table._getFilteringSettings();
      expect(oldFilterSettings).toEqual(newFilterSettings);
    });

    it("should populate filter markup from url params", function() {
      history.pushState(null, null, "_SpecRunner.html?date_filter=today");
      var expectedFilters = [];

      // populate url with filters
      populateFilters();

      var populatedURL = "_SpecRunner.html"+window.location.search;

      // remove filters
      clearFilters();

      // push the populatedURL
      history.pushState(null, null, populatedURL);

      // Since we can't do a refresh, we just call the methods that fires at that moment
      cg._computeColumnConfig();
      cg.table.children["filter-name"].children["filter-menu"].afterRender()
      cg.table.children["filter-cost"].children["filter-menu"].afterRender()
      cg.table.children["filter-type"].children["filter-menu"].afterRender()

      // Check the filters are there
      table.dataTable.find("thead th").not(".bulk").each(function (index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            switch (col.filter.type) {
              case "string":
                expect($('.filterMenu input').val()).toEqual("Scott")
                break;
              case "numeric":
                expect($('select[data-filter-id=first-filter]').val()).toEqual("eq")
                expect($('input#first-filter').val()).toEqual("0.5");
                break;
              case "list":
                expect($(".filterMenu input[value=Basic]").prop("checked")).toEqual(true);
                break;
            }
          }
        }
      });

      history.pushState(null, null, "_SpecRunner.html");

      // remove filters again so that other tests don't fail
      clearFilters();

    });


    it("should enable the filterActive icon when filters are set, disable when cleared", function() {
      table.dataTable.find("thead th").not(".bulk").each(function () {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            $(".toggle-filter-button", this).click();
            if (col.filter.type === "string") {
              $(".filterMenu input").val("Test").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $(".filterMenu input").val("").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            }
            else if (col.filter.type === "numeric") {
              $("input#first-filter").val("3").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $("input#first-filter").val("").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            }
            else if (col.filter.type === "list") {
              $(".filterMenu input").prop("checked", true).trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $(".filterMenu input").prop("checked", false).trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            }
          }
        }
      });
    });

    it("should open the filterMenu when the filter toggle is clicked, and close if clicked again", function() {
      table.dataTable.find("thead th").not(".bulk").each(function () {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            expect($(".filterMenu", this).is(":hidden"));
            $("span", this).trigger("click");
            expect($(".filterMenu", this).is(":visible"));
            $("span", this).trigger("click");
            expect($(".filterMenu", this).is(":hidden"));
          }
        }
      });
    });

    it("should close the activeFilterMenu when the user clicks out of it", function() {
      table.dataTable.find("thead th").not(".bulk").each(function () {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            expect($(".popover .filterMenu").length).toEqual(3);
            $("span", this).trigger("click");
            expect($(".popover .filterMenu").length).toEqual(4);
            $("div:first-child", this).trigger("click");
            expect($(".popover .filterMenu").length).toEqual(3);
          }
        }
      });
    });

    it("should close the activeFilterMenu when the user clicks to open another menu, and then open the new menu", function() {
      var lastFilterMenu;
      var currentFilterMenu;
      table.dataTable.find("thead th").not(".bulk").each(function () {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            if (currentFilterMenu) {
              lastFilterMenu = currentFilterMenu;
            }
            currentFilterMenu = $(".filterMenu", this);
            expect(currentFilterMenu.is(":hidden"));
            $("span", this).trigger("click");
            expect(currentFilterMenu.is(":visible"));
            if (lastFilterMenu) {
              expect(lastFilterMenu.is(":hidden"));
            }
          }
        }
      });
    });

    it("should clear the filters when the clear button is clicked", function() {
      table.dataTable.find("thead th").not(".bulk").each(function () {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this);
          if (col && col.filter) {
            var toggleButton = $(".toggle-filter-button", this);
            toggleButton.click();
            if (col.filter.type === "string") {
              $(".filterMenu input").val("Test").trigger("change");
              $(".btn-clear").click();
              toggleButton.click();
              expect($(".filterMenu input").val()).toEqual("");
            }
            else if (col.filter.type === "numeric") {
              $("input#first-filter").val("3").trigger("change");
              $(".btn-clear").click();
              toggleButton.click();
              expect($("input#first-filter").val()).toEqual("");
            }
            else if (col.filter.type === "list") {
              $(".filterMenu input").prop("checked", true).trigger("change");
              $(".btn-clear").click();
              $(".filterMenu input").prop("checked", false).trigger("change");
              toggleButton.click();
              expect($(".filterMenu input").prop("checked")).toEqual(false);
            }
          }
        }
      });
    });

    it("should disable filter menus and display error message, and remove error message when enabled", function() {
      table.disableFilters("Test error message");
      var columns = table.columnsConfig();
      var currentFilterMenu;

      for (var c in columns) {
        if (!columns[c].filter) continue;
        currentFilterMenu = $(table.child("filter-" + columns[c].attr).$el);

        $("span", currentFilterMenu).trigger("click");
        expect($(".filterMenu .error-text").length).toEqual(1);
        expect($(".filterMenu .error-text").text()).toMatch(/Test error message/);
        expect($(".filterMenu .btn-filter").last().prop('disabled')).toEqual(true);

        $("span", currentFilterMenu).trigger("click");
      }

      table.enableFilters();
      for (var c in columns) {
        if (!columns[c].filter) continue;
        currentFilterMenu = $(table.child("filter-" + columns[c].attr).$el);

        $("span", currentFilterMenu).trigger("click");
        expect($(".filterMenu .error-text").length).toEqual(0);
        expect($(".filterMenu .btn-filter").last().prop('disabled')).toEqual(false);

        $("span", currentFilterMenu).trigger("click");
      }
    });

    it("should overwrite existing numeric filter when filter type is changed", function () {
      var cg = table.configGenerator();
      var col = cg.columnConfigById.attributes["cost"];
      table.dataTable.find("th.column-cost .toggle-filter-button").trigger("click");
      $(".popover-menu #first-filter").val("3").trigger("change");

      expect(col.filter).toEqual({type: "numeric", gt: "3"});

      $(".popover-menu select[data-filter-id=first-filter]").val("lt").trigger("change");
      expect(col.filter).toEqual({type: "numeric", lt: "3"});
    });

    describe("_fetchCSV", function () {
      it("should append current filter parameters to the URL when requesting a CSV export", function () {
        expect(table.serverSideFiltering).toEqual(true);

        // Set one column filter value so that the request contains filtering settings
        var cg = table._columnManager._configGenerator;
        var col = cg.columnsConfig[0];
        col.filter = {value: "filter_by_this_value"};

        // Set dummy URL
        var csv_url = "/networks/transaction_reports/4.csv?ajax=1&backdraft=ui&chart=transaction&transaction_type=transaction_count";

        spyOn(table, "_goToWindowLocation").and.callFake(function(){});
        table._fetchCSV(csv_url);
        expect(table._goToWindowLocation).toHaveBeenCalledWith("/networks/transaction_reports/4.csv?ajax=1&backdraft=ui&chart=transaction&transaction_type=transaction_count&backdraft_request=1&ext_filter_json=%5B%7B%22comparison%22%3A%22value%22%2C%22value%22%3A%22filter_by_this_value%22%7D%5D");
      });

      it("should throw error when serverSideFiltering is not enabled", function () {
        table.serverSideFiltering = false;
        expect(table.serverSideFiltering).toEqual(false);
        expect(function(){ table._fetchCSV("/fake_url"); } ).toThrow(new Error("serverSideFiltering is expected to be enabled when _fetchCSV is called"));
      });
    });

    describe("_goToWindowLocation", function () {
      it("should throw error when sUrl is not defined", function () {
        expect(function(){ table._goToWindowLocation(); } ).toThrow(new Error("sUrl must be defined when _goToWindowLocation is called"));
      });
    });
  });
});
