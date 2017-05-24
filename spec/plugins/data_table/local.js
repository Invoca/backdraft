describe("DataTable Plugin", function() {
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
      model : app.Models.M
    });
    collection = new app.Collections.Col();
  });

  describe("local data store rendering", function() {
    describe("collection changes", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });
        table = new app.Views.T({ collection : collection });
        table.render();
      });

      afterEach(function() {
        if (table) {
          table.close();
        }
      });

      describe("collection is reset", function() {
        beforeEach(function() {
          collection.reset([ { name : "Bob" }, { name : "Joe" } ]);
        });

        it("should render a view for every single model in the collection", function() {
          var rows = table.$("tbody tr");
          expect(rows.length).toEqual(2);

          expect(rows.eq(0).find("td").html()).toEqual("Joe");
          expect(rows.eq(1).find("td").html()).toEqual("Bob");
        });

        it("should have children views for every model", function() {
          expect(_.size(table.children)).toEqual(2);
        });

        it("should have cache populated for every model", function() {
          expect(table.cache.size()).toEqual(2);
        });

        it("should remove children when the collection is reset to nothing", function() {
          collection.reset();
          expect(_.size(table.children)).toEqual(0);
        });

        it("should have cache cleared when the collection is reset to nothing", function() {
          collection.reset();
          expect(table.cache.size()).toEqual(0);
        });
      });

      describe("collection is added to", function() {
        beforeEach(function() {
          collection.add({ name : "Bob" });
        });

        it("should add a view for the model added", function() {
          var rows = table.$("tbody tr");
          expect(rows.length).toEqual(1);
          expect(rows.eq(0).find("td").html()).toEqual("Bob");
        });

        it("should register a child view for the model added", function() {
          expect(_.size(table.children)).toEqual(1);
        });

        it("should populate the cache for the model added", function() {
          expect(table.cache.size()).toEqual(1);
        });

      });

      describe("collection is removed from", function() {
        beforeEach(function() {
          collection.reset([ { name : "Bob"}, { name : "Joe"} ]);
          collection.remove(collection.models[0]);
        });

        it("should remove a view for the model removed", function() {
          var rows = table.$("tbody tr");
          expect(rows.length).toEqual(1);
          expect(rows.eq(0).find("td").html()).toEqual("Joe");
        });

        it("should remove a child view for the model removed", function() {
          expect(_.size(table.children)).toEqual(1);
        });

        it("should purge the cache fo the removed model", function() {
          expect(table.cache.size()).toEqual(1);
        });
      });
    });

    describe("customization", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "name", title : "Name" }
          ]
        });
      });

      it("should allow a empty text to be provided", function() {
        app.view.dataTable("TableWithEmptyText", {
          rowClassName : "R",
          emptyText: "Sad, there is nothing here!"
        });

        table = new app.Views.TableWithEmptyText({ collection : collection });
        table.render();
        expect(table.$(".dataTables_empty").text()).toEqual("Sad, there is nothing here!");
      });
    });
  });

  describe("local data store pagination", function() {
    it("should paginate by default", function() {
      app.view.dataTable.row("R", {
        columns : [
          { attr : "name", title : "Name" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName : "R"
      });

      table = new app.Views.T({ collection : collection });
      table.render();

      expect(table.$(".dataTables_paginate").length).toEqual(1);
    });

    it("should allow pagination to be disabled", function() {
      app.view.dataTable.row("R", {
        columns : [
          { attr : "name", title : "Name" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName : "R",
        paginate : false
      });

      table = new app.Views.T({ collection : collection });
      table.render();

      expect(table.$(".dataTables_paginate").length).toEqual(0);
    });
  });

  describe("local data store bulk selection", function() {
    var data;

    beforeEach(function() {
      data = [];
      for (var iter = 0; iter < 100; ++iter) {
        data.push({ id : iter +1, name : "hi " + iter });
      }
    });

    describe("without pagination", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { bulk : true },
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R",
          paginate : false
        });
        collection.reset(data);
      });

      it("should not unselect models that are filtered out", function() {
        table = new app.Views.T({ collection : collection });
        table.render();

        expect(table.selectedModels().length).toEqual(0);
        table.selectAllVisible(true)
        expect(table.selectedModels().length).toEqual(data.length);

        collection.add({ name : "monkey "});
        collection.add({ name : "monkey and more "});

        table.filter("monkey");
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(data.length + 2);
      });

      it("should not allow selectAllMatching to be called", function() {
        table = new app.Views.T({ collection : collection });
        table.render();

        expect(function() {
          table.selectAllMatching();
        }).toThrowError("#selectAllMatching can only be used with paginated tables");
      });

      it("should allow a list of pre-selected model ids to be provided and select the correct rows", function() {
        var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45 ];
        table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
        table.render();
        expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
      });

      it("should not throw exceptions when provided pre-selected model ids that don't exist", function() {
        var selectedIds = [ 1, 2, 3, -1 ];
        expect(function() {
          table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
          table.render();
        }).not.toThrow();

        expect(table.selectedModels().length).toEqual(3);
      });
    });

    describe("with pagination", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { bulk : true },
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R",
          paginate : true
        });
        collection.reset(data);
      });

      it("should select models that are not filtered out from the current page only", function() {
        table = new app.Views.T({ collection : collection });
        table.render();
        expect(table.selectedModels().length).toEqual(0);
        table.selectAllVisible(true);

        var selectedModels = _.map(table.selectedModels(), function(m) {
          return m.toJSON();
        });

        var selectedModelsExpected = _.map(collection.slice(0,10), function(m) {
          return m.toJSON();
        });

        expect(selectedModelsExpected).toEqual(selectedModels);
      });

      it("should uncheck the header bulk checkbox when a page transitions and the next page doesn't have all rows already selected", function(done) {
        table = new app.Views.T({ collection : collection });
        table.render();
        table.selectAllVisible(true);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("page", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done()
          });
        });

        table.page("next");
      });

      it("should check the header bulk checkbox when a page transitions and the next page has all rows already selected", function(done) {
        table = new app.Views.T({ collection : collection });
        table.render();
        table.selectAllVisible(true);
        table.page("next");
        table.selectAllVisible(true);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("page", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
            done();
          });
        });

        table.page("previous");
      });

      describe("selectedIds", function() {
        it("should allow a list of model ids to be provided and select the correct models", function() {
          var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45 ];
          table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
          table.render();
          expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
        });

        it("should make the correct rows appear selected as some my not be rendered initially due to deferred rendering", function() {
          var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45, 72, 97, 33, 5, 13 ];
          table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
          table.render();
          table.$(".dataTables_length select").val(100).change();
          expect(table.$("td.bulk :checkbox:checked").length).toEqual(selectedIds.length);

        });

      });
    });

    describe("regardless of pagination", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { bulk : true },
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R",
          paginate : false
        });
        collection.reset(data);
      });

      it("should check/uncheck the header bulk checkbox when #selectAllVisible is called", function() {
        table = new app.Views.T({ collection : collection });
        table.render();

        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        table.selectAllVisible(true);
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
        table.selectAllVisible(false);
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
      });

      it("should trigger an event when #selectAllVisible is called", function() {
        var changeSelectSpy = jasmine.createSpy();
        table = new app.Views.T({ collection : collection });
        table.render();

        table.on("change:selected", changeSelectSpy);

        table.selectAllVisible(true);
        table.selectAllVisible(false);

        expect(changeSelectSpy).toHaveBeenCalled();
        expect(changeSelectSpy.calls.allArgs()[0][0]).toEqual({ count: data.length, selectAllVisible: true });
        expect(changeSelectSpy.calls.allArgs()[1][0]).toEqual({ count: 0, selectAllVisible: false });
      });

      it("should uncheck the header bulk checkbox when a row's checkbox is unchecked", function() {
        table = new app.Views.T({ collection : collection });
        // need to append to body in order to do clicks on checkboxes
        $("body").append(table.render().$el);

        table.selectAllVisible(true)

        // uncheck a single row checkbox
        table.$("td.bulk :checkbox:first").click();
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
      });

      it("should uncheck the header bulk checkbox when a filter is applied and the result set doesn't have all rows already selected", function(done) {
        table = new app.Views.T({ collection : collection });
        table.render();
        table.filter("89");
        table.selectAllVisible(true);

        expect(table.selectedModels().length).toEqual(1);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done()
          });
        });

        // relax the filter and verify that the checkbox is not checked
        table.filter("");
      });

      it("should check the header bulk checkbox when a filter is applied and the result set has all rows already selected", function(done) {
        table = new app.Views.T({ collection : collection });
        table.render();
        table.filter("9");
        table.selectAllVisible(true);

        // there are 19 rows with the number "9" in them
        expect(table.selectedModels().length).toEqual(19);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
            done()
          });
        });

        // restrict the filter and verify that the checkbox is checked
        table.filter("89");
      });

      it("should adjust bulk selection after a model is removed from the collection", function() {
        table = new app.Views.T({ collection : collection });
        table.render();
        var model = collection.find(function(m) {
          return m.id === 89;
        });
        table.filter("hi 88");
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(1);
        collection.remove(model);
        expect(table.selectedModels().length).toEqual(0);
      });

      it("should uncheck the header bulk checkbox when a filter is applied and the result set is empty", function(done) {
        table = new app.Views.T({ collection : collection });
        table.render();

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done()
          });
        });

        // filter by something that doesn't exist and verify that the checkbox is not checked
        table.filter("not gonna find me");
      });

      it("should toggle the 'backdraft-selected' class on the row when a row's checkbox is toggled", function() {
        table = new app.Views.T({ collection : collection });
        // need to append to body in order to do clicks on checkboxes
        $("body").append(table.render().$el);

        expect(table.$(".backdraft-selected").length).toEqual(0);
        table.selectAllVisible(true);
        expect(table.$(".backdraft-selected").length).toEqual(data.length);

        // uncheck a single row checkbox
        table.$("td.bulk :checkbox:first").click();
        expect(table.$(".backdraft-selected").length).toEqual(data.length - 1);
      });
    });
  });

  describe("header group", function() {
    var buildAndAppendTable = function() {
      if (table) { table.close(); };

      app.view.dataTable("T", {
        rowClassName : "R",
        paginate : false
      });
      collection.reset([{ id : 1, firstName : "Billy", lastName: "Bob", income: "1000" }]);

      table = new app.Views.T({ collection : collection });
      $("body").append(table.render().$el);
    };

    var getHeaderGroupText = function(table) {
      return table.$(".header-groups").map(function() {
        return $(this).text();
      }).get();
    };

    var getHeaderText = function(table) {
      return table.$("thead tr th").not('.header-groups').map(function() {
        return $(this).text();
      }).get();
    };

    var columns = function() {
      return [
        { attr : "income",    title : "Income",     headerGroupDataIndex: "financial" },
        { attr : "firstName", title : "First Name", headerGroupDataIndex: "user" },
        { attr : "lastName",  title : "Last Name",  headerGroupDataIndex: "user" }
      ]
    };

    describe("present", function() {

      describe("", function() {

        beforeEach(function () {
          app.view.dataTable.row("R", {
            columns: columns(),
            columnGroupDefinitions: [
              {"headerName": "Financial", "colspan": 1, headerGroupDataIndex: "financial"},
              {"headerName": "User Info", "colspan": 2, headerGroupDataIndex: "user"}
            ]
          });

          buildAndAppendTable();
        });

        it("should build a single header group row when columnGroupDefinitions is supplied, using headerGroupDataIndex to match up between columns and columnGroupDefinitions", function () {
          expect(table.$(".header-groups-row").length).toEqual(1);
          expect(getHeaderGroupText(table)).toEqual(['Financial', 'User Info']);
          expect(table.$(".header-groups-row").children()[1].attributes.colspan.value).toEqual("2");
          expect(table._colReorder).toEqual(undefined);
        });

        it("should disable column sorting (_colReorder) when using a header group", function () {
          expect(table.$(".header-groups-row").length).toEqual(1);
          expect(table._colReorder).toEqual(undefined);
        });

        it("should hide corresponding header group when child column is set visible false", function () {
          expect(table.$(".header-groups-row").length).toEqual(1);
          expect(getHeaderGroupText(table)).toEqual(['Financial', 'User Info']);
          expect(getHeaderText(table)).toEqual(["Income", "First Name", "Last Name"]);

          table.columnVisibility("income", false);
          expect(getHeaderText(table)).toEqual(['First Name', 'Last Name']);
          expect(getHeaderGroupText(table)).toEqual(['User Info']);
        });

      });

      describe("no match for headerGroupDataIndex", function() {
        beforeEach(function () {
          spyOn(Backdraft.Utils, 'log').and.callThrough();
        });

        var buildTableAndExpectMismatchedColumn = function() {
          buildAndAppendTable();
          expect(Backdraft.Utils.log.calls.mostRecent().args[0]).toMatch(/Unable to find a matching headerGroupDataIndex for/)
          expect(table.$(".header-groups-row").length).toEqual(1);
        };

        it("should gracefully render the column title when headerGroupDataIndex is not matched in columnGroupDefinitions", function() {
          app.view.dataTable.row("R", {
            columns : [
              { attr : "income",    title : "Income",     headerGroupDataIndex: "financial" },
              { attr : "firstName", title : "First Name", headerGroupDataIndex: "BOGUS" },
              { attr : "lastName",  title : "Last Name",  headerGroupDataIndex: "user" }
            ],

            columnGroupDefinitions: [
              { "headerName" : "Financial", "colspan" : 1, headerGroupDataIndex: "financial" },
              { "headerName" : "User Info", "colspan" : 2, headerGroupDataIndex: "user" }
            ]
          });

          buildTableAndExpectMismatchedColumn();
          expect(getHeaderGroupText(table)).toEqual([ 'Financial', '', 'User Info' ]);
        });

        it("should gracefully render the column title when headerGroupDataIndex is not matched in columns", function() {
          app.view.dataTable.row("R", {
            columns : [
              { attr : "income",    title : "Income",     headerGroupDataIndex: "financial" },
              { attr : "firstName", title : "First Name", headerGroupDataIndex: "user" },
              { attr : "lastName",  title : "Last Name",  headerGroupDataIndex: "user" }
            ],

            columnGroupDefinitions: [
              { "headerName" : "Financial", "colspan" : 1, headerGroupDataIndex: "financial" },
              { "headerName" : "User Info", "colspan" : 2, headerGroupDataIndex: "BOGUS" }
            ]
          });

          buildTableAndExpectMismatchedColumn();
          expect(getHeaderGroupText(table)).toEqual([ 'Financial', '', '' ]);
        });
      });
    });

    describe("not present", function() {

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : columns
        });

        buildAndAppendTable();
      });

      it("should allow column sorting (_colReorder) when not using a header group", function() {
        expect(table.$(".header-groups-row").length).toEqual(0);
        expect(table._colReorder).not.toEqual(undefined);
      });

      it("should omit header group row when columnGroupDefinitions is not supplied", function() {
        expect(table.$(".header-groups-row").length).toEqual(0);
      });

      it("should omit header group row when columnGroupDefinitions is empty", function() {
        app.view.dataTable.row("R", {
          columns : columns,
          columnGroupDefinitions: []
        });

        buildAndAppendTable();
        expect(table.$(".header-groups-row").length).toEqual(0);
      });
    });
  });

  describe("_columnElements", function() {
    beforeEach(function() {
      app.view.dataTable.row("R", {
        columns : [
          { bulk : true },
          { attr : "name", title : "Name" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName : "R"
      });

      table = new app.Views.T({ collection : collection });
      table.render();
    });

    afterEach(function() {
      table.close();
    });

    it("should provide all of the column header elements", function() {
      var expectedHeaders = table.$('table').find('thead tr th');
      expect(expectedHeaders).toEqual(table._columnElements());
    });

    it("should allow custom selectors", function() {
      expect(table.$('table').find('thead tr th:not(.bulk)')).toEqual(table._columnElements(":not(.bulk)"));
    });
  });
});
