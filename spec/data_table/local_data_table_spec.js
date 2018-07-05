import setupEnvironment from "../../src/data_table/setup_environment";

import Model from "../../src/model";
import Collection from "../../src/collection";

import { inDom, createRowClass, createLocalDataTableClass } from "../support/spec_helpers";

function createDataTableClass(constructorOptions, protoProperties) {
  return createLocalDataTableClass(_.extend({ rowClass: TestRow }, constructorOptions), protoProperties);
}

const TestRow = createRowClass({
  columns: [
    { attr: "name", title: "Name" }
  ]
});

const RowWithBulkColumn = createRowClass({
  columns: [
    { bulk: true },
    { attr: "name", title: "Name" }
  ]
});

const TestDataTable = createDataTableClass();

class TestModel extends Model {}

class TestCollection extends Collection {
  get model() {
    return TestModel;
  }
}

function createBulkData() {
  let data = [];
  for (var iter = 0; iter < 100; ++iter) {
    data.push({ id: iter + 1, name: "hi " + iter });
  }
  return data;
}

describe("DataTable Plugin", function() {
  beforeEach(function() {
    setupEnvironment();

    this.collection = new TestCollection();
  });

  describe("local data store rendering", function() {
    describe("collection changes", function() {
      beforeEach(function() {
        this.table = new TestDataTable({ collection: this.collection });
        this.table.render();
      });

      afterEach(function() {
        this.table.close();
      });

      describe("collection is reset", function() {
        beforeEach(function() {
          this.collection.reset([{ name: "Bob" }, { name: "Joe" }]);
        });

        it("should render a view for every single model in the collection", function() {
          var rows = this.table.$("tbody tr");
          expect(rows.length).toEqual(2);

          expect(rows.eq(0).find("td").html()).toEqual("Joe");
          expect(rows.eq(1).find("td").html()).toEqual("Bob");
        });

        it("should have children views for every model", function() {
          expect(_.size(this.table.children)).toEqual(2);
        });

        it("should have cache populated for every model", function() {
          expect(this.table.cache.size()).toEqual(2);
        });

        it("should remove children when the collection is reset to nothing", function() {
          this.collection.reset();
          expect(_.size(this.table.children)).toEqual(0);
        });

        it("should have cache cleared when the collection is reset to nothing", function() {
          this.collection.reset();
          expect(this.table.cache.size()).toEqual(0);
        });
      });

      describe("collection is added to", function() {
        beforeEach(function() {
          this.collection.add({ name: "Bob" });
        });

        it("should add a view for the model added", function() {
          var rows = this.table.$("tbody tr");
          expect(rows.length).toEqual(1);
          expect(rows.eq(0).find("td").html()).toEqual("Bob");
        });

        it("should register a child view for the model added", function() {
          expect(_.size(this.table.children)).toEqual(1);
        });

        it("should populate the cache for the model added", function() {
          expect(this.table.cache.size()).toEqual(1);
        });
      });

      describe("collection is removed from", function() {
        beforeEach(function() {
          this.collection.reset([{ name: "Bob" }, { name: "Joe" }]);
          this.collection.remove(this.collection.models[0]);
        });

        it("should remove a view for the model removed", function() {
          var rows = this.table.$("tbody tr");
          expect(rows.length).toEqual(1);
          expect(rows.eq(0).find("td").html()).toEqual("Joe");
        });

        it("should remove a child view for the model removed", function() {
          expect(_.size(this.table.children)).toEqual(1);
        });

        it("should purge the cache fo the removed model", function() {
          expect(this.table.cache.size()).toEqual(1);
        });
      });
    });

    describe("customization", function() {
      it("should allow a empty text to be provided", function() {
        const Table = createDataTableClass({}, {
          emptyText: "Sad, there is nothing here!"
        });

        const table = new Table({ collection: this.collection });
        table.render();
        expect(table.$(".dataTables_empty").text()).toEqual("Sad, there is nothing here!");
      });
    });
  });

  describe("local data store pagination", function() {
    it("should paginate by default", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();

      expect(table.$(".dataTables_paginate").length).toEqual(1);
    });

    describe("local data table pagination history", function() {
      let data;
      let table;
      beforeEach(function() {
        data = createBulkData();
        table = new TestDataTable({ collection: this.collection });
        this.collection.reset(data);
      });
      afterAll(function() {
        history.pushState({}, "pagination", "?");
      });
      it("should load correct page in table from url", function() {
        history.pushState({}, "pagination", "?page=5");
        table.render();
        expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/41 to 50/);
      });
      it("should store page in url", function() {
        history.pushState({}, "pagination", "?page=1");
        table.render();
        table.page("next");
        expect(window.location.search).toMatch(/page=2/);
        table.page("previous");
        expect(window.location.search).toMatch(/page=1/);
        table.page(7);
        expect(window.location.search).toMatch(/page=8/);
      });
      it("should load into page 1 if no page parameter exists", function() {
        history.pushState({}, "pagination", "?");
        table.render();
        expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
      });
      it("should load into page 1 if page parameter is out of bounds", function() {
        history.pushState({}, "pagination", "?page=500");
        table.render();
        expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
        expect(window.location.search).toMatch(/page=1/);
      });
      it("shouldn't get tripped up by other query variables in the url", function() {
        history.pushState({}, "pagination", "?something=awesome&page=3");
        table.render();
        expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/21 to 30/);
      });
    });

    it("should allow pagination to be disabled", function() {
      const Table = createDataTableClass({}, {
        paginate: false
      });

      const table = new Table({ collection: this.collection });
      table.render();

      expect(table.$(".dataTables_paginate").length).toEqual(0);
    });
  });

  describe("local data store bulk selection", function() {
    var data;

    beforeEach(function() {
      data = createBulkData();
    });

    describe("without pagination", function() {
      beforeEach(function() {
        this.TableClass = createDataTableClass({
          rowClass: RowWithBulkColumn
        }, {
          paginate: false
        });

        this.collection.reset(data);
      });

      it("should not unselect models that are filtered out", function() {
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        expect(table.selectedModels().length).toEqual(0);
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(data.length);

        this.collection.add({ name: "monkey " });
        this.collection.add({ name: "monkey and more " });

        table.filter("monkey");
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(data.length + 2);
      });

      it("should not allow selectAllMatching to be called", function() {
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        expect(function() {
          table.selectAllMatching();
        }).toThrowError("#selectAllMatching can only be used with paginated tables");
      });

      it("should allow a list of pre-selected model ids to be provided and select the correct rows", function() {
        var selectedIds = [1, 2, 3, 10, 11, 90, 76, 45];
        const table = new this.TableClass({ collection: this.collection, selectedIds });
        table.render();
        expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
      });

      it("should not throw exceptions when provided pre-selected model ids that don't exist", function() {
        var selectedIds = [1, 2, 3, -1];
        const table = new this.TableClass({ collection: this.collection, selectedIds });
        expect(function() {
          table.render();
        }).not.toThrow();

        expect(table.selectedModels().length).toEqual(3);
      });
    });

    describe("with pagination", function() {
      beforeEach(function() {
        this.TableClass = createDataTableClass({
          rowClass: RowWithBulkColumn
        }, {
          paginate: true
        });

        this.collection.reset(data);
      });

      it("should select models that are not filtered out from the current page only", function() {
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        expect(table.selectedModels().length).toEqual(0);
        table.selectAllVisible(true);

        var selectedModels = _.map(table.selectedModels(), function(m) {
          return m.toJSON();
        });

        var selectedModelsExpected = _.map(this.collection.slice(0, 10), function(m) {
          return m.toJSON();
        });

        expect(selectedModelsExpected).toEqual(selectedModels);
      });

      it("should uncheck the header bulk checkbox when a page transitions and the next page doesn't have all rows already selected", function(done) {
        const table = new this.TableClass({ collection: this.collection });
        table.render();
        table.selectAllVisible(true);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("page", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done();
          });
        });

        table.page("next");
      });

      it("should check the header bulk checkbox when a page transitions and the next page has all rows already selected", function(done) {
        const table = new this.TableClass({ collection: this.collection });
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
          var selectedIds = [1, 2, 3, 10, 11, 90, 76, 45];
          const table = new this.TableClass({ collection: this.collection, selectedIds });
          table.render();
          expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
        });

        it("should make the correct rows appear selected as some my not be rendered initially due to deferred rendering", function() {
          var selectedIds = [1, 2, 3, 10, 11, 90, 76, 45, 72, 97, 33, 5, 13];
          const table = new this.TableClass({ collection: this.collection, selectedIds });
          table.render();
          table.$(".dataTables_length select").val(100).change();
          expect(table.$("td.bulk :checkbox:checked").length).toEqual(selectedIds.length);
        });
      });
    });

    describe("regardless of pagination", function() {
      beforeEach(function() {
        this.TableClass = createDataTableClass({
          rowClass: RowWithBulkColumn
        }, {
          paginate: false
        });

        this.collection.reset(data);
      });

      it("should check/uncheck the header bulk checkbox when #selectAllVisible is called", function() {
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        table.selectAllVisible(true);
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
        table.selectAllVisible(false);
        expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
      });

      it("should trigger an event when #selectAllVisible is called", function() {
        history.pushState({}, "pagination", "?page=3");
        var changeSelectSpy = jasmine.createSpy();
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        table.on("change:selected", changeSelectSpy);

        table.selectAllVisible(true);
        table.selectAllVisible(false);

        expect(changeSelectSpy).toHaveBeenCalled();
        expect(changeSelectSpy.calls.allArgs()[0][0]).toEqual({ count: data.length, selectAllVisible: true });
        expect(changeSelectSpy.calls.allArgs()[1][0]).toEqual({ count: 0, selectAllVisible: false });
      });

      it("should uncheck the header bulk checkbox when a row's checkbox is unchecked", function() {
        const table = new this.TableClass({ collection: this.collection });

        // need to append to body in order to do clicks on checkboxes
        inDom(table.render().$el, () => {
          table.selectAllVisible(true);

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        });
      });

      it("should uncheck the header bulk checkbox when a filter is applied and the result set doesn't have all rows already selected", function(done) {
        const table = new this.TableClass({ collection: this.collection });
        table.render();
        table.filter("89");
        table.selectAllVisible(true);

        expect(table.selectedModels().length).toEqual(1);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done();
          });
        });

        // relax the filter and verify that the checkbox is not checked
        table.filter("");
      });

      it("should check the header bulk checkbox when a filter is applied and the result set has all rows already selected", function(done) {
        const table = new this.TableClass({ collection: this.collection });
        table.render();
        table.filter("9");
        table.selectAllVisible(true);

        // there are 19 rows with the number "9" in them
        expect(table.selectedModels().length).toEqual(19);

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
            done();
          });
        });

        // restrict the filter and verify that the checkbox is checked
        table.filter("89");
      });

      it("should adjust bulk selection after a model is removed from the collection", function() {
        const table = new this.TableClass({ collection: this.collection });
        table.render();
        var model = this.collection.find(function(m) {
          return m.id === 89;
        });
        table.filter("hi 88");
        table.selectAllVisible(true);
        expect(table.selectedModels().length).toEqual(1);
        this.collection.remove(model);
        expect(table.selectedModels().length).toEqual(0);
      });

      it("should uncheck the header bulk checkbox when a filter is applied and the result set is empty", function(done) {
        const table = new this.TableClass({ collection: this.collection });
        table.render();

        // we need to test this using an async strategy because the checkbox is toggled async as well
        table.dataTable.on("filter", function() {
          _.defer(function() {
            expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
            done();
          });
        });

        // filter by something that doesn't exist and verify that the checkbox is not checked
        table.filter("not gonna find me");
      });

      it("should toggle the 'backdraft-selected' class on the row when a row's checkbox is toggled", function() {
        const table = new this.TableClass({ collection: this.collection });
        // need to append to body in order to do clicks on checkboxes
        inDom(table.render().$el, () => {
          expect(table.$(".backdraft-selected").length).toEqual(0);
          table.selectAllVisible(true);
          expect(table.$(".backdraft-selected").length).toEqual(data.length);

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$(".backdraft-selected").length).toEqual(data.length - 1);
        });
      });
    });
  });

  describe("header group", function() {
    function buildAndAppendTable(rowClass) {
      const TableClass = createDataTableClass({ rowClass });

      const collection = new TestCollection();
      collection.reset([{ id: 1, firstName: "Billy", lastName: "Bob", income: "1000" }]);

      const table = new TableClass({ collection });
      $("body").append(table.render().$el);

      return table;
    }

    function getHeaderGroupText(table) {
      return table.$(".header-groups").map(function() {
        return $(this).text();
      }).get();
    }

    function getHeaderText(table) {
      return table.$("thead tr th").not('.header-groups').map(function() {
        return $(this).text();
      }).get();
    }

    function columns() {
      return [
        { attr: "income", title: "Income", headerGroupDataIndex: "financial" },
        { attr: "firstName", title: "First Name", headerGroupDataIndex: "user" },
        { attr: "lastName", title: "Last Name", headerGroupDataIndex: "user" }
      ];
    }

    describe("present", function() {
      describe("", function() {
        beforeEach(function() {
          const rowClass = createRowClass({
            columns: columns(),
            columnGroupDefinitions: [
              { "headerName": "Financial", "colspan": 1, headerGroupDataIndex: "financial" },
              { "headerName": "User Info", "colspan": 2, headerGroupDataIndex: "user" }
            ]
          });

          this.table = buildAndAppendTable(rowClass);
        });

        afterEach(function() {
          this.table.close();
        });

        afterEach(function() {
          this.table.remove();
        });

        it("should build a single header group row when columnGroupDefinitions is supplied, using headerGroupDataIndex to match up between columns and columnGroupDefinitions", function() {
          expect(this.table.$(".header-groups-row").length).toEqual(1);
          expect(getHeaderGroupText(this.table)).toEqual(['Financial', 'User Info']);
          expect(this.table.$(".header-groups-row").children()[1].attributes.colspan.value).toEqual("2");
          expect(this.table._colReorder).toEqual(undefined);
        });

        it("should disable column sorting (_colReorder) when using a header group", function() {
          expect(this.table.$(".header-groups-row").length).toEqual(1);
          expect(this.table._colReorder).toEqual(undefined);
        });

        it("should hide corresponding header group when child column is set visible false", function() {
          expect(this.table.$(".header-groups-row").length).toEqual(1);
          expect(getHeaderGroupText(this.table)).toEqual(['Financial', 'User Info']);
          expect(getHeaderText(this.table)).toEqual(["Income", "First Name", "Last Name"]);

          this.table.columnVisibility("income", false);
          expect(getHeaderText(this.table)).toEqual(['First Name', 'Last Name']);
          expect(getHeaderGroupText(this.table)).toEqual(['User Info']);
        });
      });

      describe("no match for headerGroupDataIndex", function() {
        beforeEach(function() {
          console.log = jasmine.createSpy("log");
        });

        afterEach(function() {
          this.table.remove();
        });

        function buildTableAndExpectMismatchedColumn(rowClass) {
          const table = buildAndAppendTable(rowClass);
          expect(console.log.calls.mostRecent().args[0]).toMatch(/Unable to find a matching headerGroupDataIndex for/);
          expect(table.$(".header-groups-row").length).toEqual(1);

          return table;
        }

        it("should gracefully render the column title when headerGroupDataIndex is not matched in columnGroupDefinitions", function() {
          const rowClass = createRowClass({
            columns: [
              { attr: "income", title: "Income", headerGroupDataIndex: "financial" },
              { attr: "firstName", title: "First Name", headerGroupDataIndex: "BOGUS" },
              { attr: "lastName", title: "Last Name", headerGroupDataIndex: "user" }
            ],

            columnGroupDefinitions: [
              { "headerName": "Financial", "colspan": 1, headerGroupDataIndex: "financial" },
              { "headerName": "User Info", "colspan": 2, headerGroupDataIndex: "user" }
            ]
          });

          this.table = buildTableAndExpectMismatchedColumn(rowClass);
          expect(getHeaderGroupText(this.table)).toEqual(['Financial', '', 'User Info']);
        });

        it("should gracefully render the column title when headerGroupDataIndex is not matched in columns", function() {
          const rowClass = createRowClass({
            columns: [
              { attr: "income", title: "Income", headerGroupDataIndex: "financial" },
              { attr: "firstName", title: "First Name", headerGroupDataIndex: "user" },
              { attr: "lastName", title: "Last Name", headerGroupDataIndex: "user" }
            ],

            columnGroupDefinitions: [
              { "headerName": "Financial", "colspan": 1, headerGroupDataIndex: "financial" },
              { "headerName": "User Info", "colspan": 2, headerGroupDataIndex: "BOGUS" }
            ]
          });

          this.table = buildTableAndExpectMismatchedColumn(rowClass);
          expect(getHeaderGroupText(this.table)).toEqual(['Financial', '', '']);
        });
      });
    });

    describe("not present", function() {
      beforeEach(function() {
        const rowClass = createRowClass({
          columns
        });

        this.table = buildAndAppendTable(rowClass);
      });

      afterEach(function() {
        this.table.close();
      });

      afterEach(function() {
        this.table.close();
        this.table.remove();
      });

      it("should allow column sorting (_colReorder) when not using a header group", function() {
        expect(this.table.$(".header-groups-row").length).toEqual(0);
        expect(this.table._colReorder).not.toEqual(undefined);
      });

      it("should omit header group row when columnGroupDefinitions is not supplied", function() {
        expect(this.table.$(".header-groups-row").length).toEqual(0);
      });

      it("should omit header group row when columnGroupDefinitions is empty", function() {
        const rowClass = createRowClass({
          columns,
          columnGroupDefinitions: []
        });

        const table = buildAndAppendTable(rowClass);
        expect(table.$(".header-groups-row").length).toEqual(0);
      });
    });
  });

  describe("columnElements", function() {
    beforeEach(function() {
      const TableClass = createDataTableClass({
        rowClass: RowWithBulkColumn
      });

      this.table = new TableClass({ collection: this.collection });
      this.table.render();
    });

    afterEach(function() {
      this.table.close();
    });

    it("should provide all of the column header elements", function() {
      var expectedHeaders = this.table.$('table').find('thead tr th');
      expect(expectedHeaders).toEqual(this.table.columnElements());
    });

    it("should allow custom selectors", function() {
      expect(this.table.$('table').find('thead tr th:not(.bulk)')).toEqual(this.table.columnElements(":not(.bulk)"));
    });
  });
});
