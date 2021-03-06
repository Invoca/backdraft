import { extractColumnCSSClass } from "../../src/utils/css";

import Model from "../../src/model";
import Collection from "../../src/collection";

import { createRowClass, inDom, createServerSideDataTableClass } from "../support/spec_helpers";

import _ from "underscore";
import $ from "jquery";
import Backbone from "backbone";

import "../support/mock-ajax";

import "jquery-deparam";

class TestModel extends Model {}

class TestCollection extends Collection {
  constructor(models, options) {
    super(models, _.extend({ model: TestModel }, options));

    this.url = "/somewhere";
  }
}

const LIST_FILTERS = ["Basic", "Advanced", "Special_\\@="];

const TestRow = createRowClass({
  columns: [
    { bulk: true },
    { attr: "name", title: "Name", filter: { type: "string" } },
    { attr: "cost", title: "Cost", filter: { type: "numeric" } },
    { attr: "type", title: "Type", filter: { type: "list", options: LIST_FILTERS } },
    { title: "Non attr column" }
  ],

  renderers: {
    "non attr column": function(node, config) {
      node.html("Non attr column");
    }
  }
});

const TestDataTable = createServerSideDataTableClass({
  rowClass: TestRow,
  appName: "SillyBilly"
}, {
  sorting: [['name', 'desc']],
  filteringEnabled: true,
  serverSideFiltering: true
});

const RSimple = createRowClass({
  columns: [
    { attr: "cost", title: "Cost", filter: { type: "numeric" } },
    { attr: "name", title: "Name", filter: { type: "string" } }
  ]
});

const TSimple = createServerSideDataTableClass({
  rowClass: RSimple
}, {
  sorting: [['name', 'desc']],
  simpleParams: true
});

class MockResponse {
  constructor() {
    this.echo = 1;
  }

  get() {
    return {
      status: 200,
      responseText: JSON.stringify({
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
  }

  getWithTotals() {
    return {
      status: 200,
      responseText: JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 100,
        iTotalDisplayRecords: 100,
        aaData: [
          { name: 'Jon doe 1', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 2', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 3', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 4', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 5', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 6', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 7', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 8', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 9', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" },
          { name: 'Jon doe 10', cost: '100', type: 'boat', description: "simple boat", resale_value: "50" }
        ],
        total: { name: null, cost: 10000, type: null, description: null, resale_value: 5000 }
      })
    };
  }

  getWithUniques() {
    return {
      status: 200,
      responseText: JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 100,
        iTotalDisplayRecords: 100,
        aaData: [
          { name: 'Jon doe 1', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 2', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 3', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 4', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 5', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 6', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 7', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 8', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 9', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" },
          { name: 'Jon doe 10', cost: '100', 'cost.unique': '102', type: 'boat', description: "simple boat", resale_value: "50", 'resale_value.unique': "51" }
        ],
        total: { name: null, cost: 10000, 'cost.unique': 10020, type: null, description: null, resale_value: 5000, 'resale_value.unique': 5010 }
      })
    };
  }

  getBadKey() {
    return {
      status: 200,
      responseText: JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 1,
        iTotalDisplayRecords: 1,
        aaData: [
          { name_misspelled: '1 - hey hey 1' }
        ]
      })
    };
  }

  getEmpty() {
    return {
      status: 200,
      responseText: JSON.stringify({
        sEcho: this.echo++,
        iTotalRecords: 0,
        iTotalDisplayRecords: 0,
        aaData: []
      })
    };
  }
}

function spyOnDataTableAjaxResponse(table) {
  var callbackSpy = jasmine.createSpy("callbackSpy");
  var originalFetchServerData = table._fetchServerData;

  spyOn(table, '_fetchServerData').and.callFake(function(sUrl, aoData, fnCallback, oSettings) {
    // pass through except use our own callBack to test the right json was passed to it (which is an internal DT callback that can't be spied on or stubbed)
    originalFetchServerData.call(this, sUrl, aoData, callbackSpy, oSettings);
  });

  spyOn(table.collection, 'reset').and.callThrough();

  return callbackSpy;
}

describe("DataTable Plugin", function() {
  beforeEach(function() {
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
    history.pushState({}, "pagination", "?");
  });

  beforeEach(function() {
    this.collection = new TestCollection();

    jasmine.Ajax.install();
    this.mockResponse = new MockResponse();

    Backbone.history.start({
      pushState:  true,
      hashChange: false,
      root:       window.location.pathname
    });
  });

  afterEach(function() {
    $('[data-toggle="popover"]').remove();
    $('.popover').remove();
    Backbone.history.stop();
    jasmine.Ajax.uninstall();
  });

  describe("server side pagination history", function() {
    afterEach(function() {
      history.pushState({}, "pagination", "?");
    });

    describe("url pagination explicitly false", function() {
      it("should not use url pagination via constructor options", function() {
        history.pushState({}, "pagination", "?");
        const NoUrlPagingTable = createServerSideDataTableClass({
          rowClass: TestRow,
          appName: "SillyBilly",
          urlPagination: false
        }, {
          sorting: [['name', 'desc']],
          filteringEnabled: true,
          serverSideFiltering: true
        });
        const table = new NoUrlPagingTable({ collection: this.collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        table.page("next");
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        expect(window.location.search).not.toMatch(/page=/);
      });

      it("should not use url pagination via prototype properties", function() {
        history.pushState({}, "pagination", "?");
        const NoUrlPagingTable = createServerSideDataTableClass({
          rowClass: TestRow,
          appName: "SillyBilly"
        }, {
          sorting: [['name', 'desc']],
          filteringEnabled: true,
          serverSideFiltering: true,
          urlPagination: false
        });
        const table = new NoUrlPagingTable({ collection: this.collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        table.page("next");
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        expect(window.location.search).not.toMatch(/page=/);
      });

      it("should not load starting page based on url", function() {
        history.pushState({}, "pagination", "?page=5");
        const NoUrlPagingTable = createServerSideDataTableClass({
          rowClass: TestRow,
          appName: "SillyBilly"
        }, {
          sorting: [['name', 'desc']],
          filteringEnabled: true,
          serverSideFiltering: true,
          urlPagination: false
        });
        const table = new NoUrlPagingTable({ collection: this.collection });
        table.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
      });
    });

    it("should handling going back in browser history", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
      table.page("next");
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/11 to 20/);
      table.page("next");
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/21 to 30/);
      Backbone.history.navigate("?page=2", { trigger: false, replace: true });
      $(window).trigger('popstate');
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/11 to 20/);
    });

    it("should load the correct page from url", function() {
      history.pushState({}, "pagination", "?page=5");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/41 to 50/);
    });

    it("should store page in url", function() {
      history.pushState({}, "pagination", "?");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      table.page("next");
      expect(window.location.search).toMatch(/page=2/);
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      table.page("previous");
      expect(window.location.search).toMatch(/page=1/);
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      table.page(7);
      expect(window.location.search).toMatch(/page=8/);
    });

    it("should load into page 1 if no page parameter exists", function() {
      history.pushState({}, "pagination", "?");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
    });

    it("should load into empty table if page parameter is out of bounds", function() {
      history.pushState({}, "pagination", "?page=500");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/4,991 to 100/);
      expect(window.location.search).toMatch(/page=500/);
    });

    it("should load into page 1 if page parameter is not an integer", function() {
      history.pushState({}, "pagination", "?page=three");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/1 to 10/);
    });

    it("should load correctly with other variables in the url", function() {
      history.pushState({}, "pagination", "?something=awesome&page=3");
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$el.find('.dataTables_info')[0].innerText).toMatch(/21 to 30/);
      expect(window.location.search).toEqual("?something=awesome&page=3");
    });
  });

  describe("server side restrictions", function() {
    it("should not allow the collection to contain models on creation", function() {
      this.collection.add({ name: "Bob" });
      expect(() => {
        // eslint-disable-next-line no-new
        new TestDataTable({ collection: this.collection });
      }).toThrowError("Server side dataTables requires an empty collection");
    });

    it("should not allow adding to the collection", function() {
      // eslint-disable-next-line no-new
      new TestDataTable({ collection: this.collection });
      expect(() => {
        this.collection.add({ name: "Bob" });
      }).toThrowError("Server side dataTables do not allow adding to the collection");
    });

    it("should require that collections define a url", function() {
      expect(() => {
        this.collection.url = null;
        // eslint-disable-next-line no-new
        new TestDataTable({ collection: this.collection });
      }).toThrowError("Server side dataTables require the collection to define a url");
    });

    it("should not allow the collection to be reset without providing an addData callback", function() {
      expect(() => {
        // eslint-disable-next-line no-new
        new TestDataTable({ collection: this.collection });
        this.collection.reset();
      }).toThrowError("An addData option is required to reset the collection");
    });

    it("should force pagination", function() {
      const Table = createServerSideDataTableClass({
        rowClass: TestRow
      }, {
        paginate: false
      });

      const table = new Table({ collection: this.collection });
      expect(table.paginate).toEqual(true);
    });
  });

  describe("server side rendering", function() {
    it("should log a warning via DataTables when the keys returned do not match", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();

      try {
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.getBadKey());
        throw Error("DataTables did not throw an error when we expected it to. It should warn about a missing parameter based on bad server response.");
      } catch (ex) {
        expect(ex.message).toMatch(/Requested unknown parameter/);
      }
    });

    it("should disable filtering", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(table.$(".dataTables_filter").css("visibility")).toEqual("hidden");
    });

    it("should allow a processing text to be provided", function() {
      const TableWithProcessing = createServerSideDataTableClass({
        rowClass: TestRow
      }, {
        processingText: "HELLO I am processing stuff"
      });

      const table = new TableWithProcessing({ collection: this.collection });
      table.render();
      expect(table.$(".dataTables_processing").text()).toEqual("HELLO I am processing stuff");
    });

    it("should allow a empty text to be provided", function() {
      const TableWithEmptyText = createServerSideDataTableClass({
        rowClass: TestRow
      }, {
        emptyText: "Sad, there is nothing here!"
      });

      const table = new TableWithEmptyText({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.getEmpty());
      expect(table.$(".dataTables_empty").text()).toEqual("Sad, there is nothing here!");
    });

    it("should trigger events on the document body when dataTables starts and finishes ajax ", function() {
      var startSpy = jasmine.createSpy("startSpy");
      var finishSpy = jasmine.createSpy("finishSpy");
      $("body").on("SillyBilly:ajax-start.backdraft", startSpy);
      $("body").on("SillyBilly:ajax-finish.backdraft", finishSpy);
      const table = new TestDataTable({ collection: this.collection });
      table.render();

      expect(startSpy).toHaveBeenCalled();
      expect(finishSpy).not.toHaveBeenCalled();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(finishSpy).toHaveBeenCalled();

      var startArgs = startSpy.calls.argsFor(0);
      var finishArgs = finishSpy.calls.argsFor(0);

      // event
      expect(startArgs[0] instanceof jQuery.Event).toEqual(true);
      // xhr
      expect(_.keys(startArgs[1])).toContain("responseText");
      expect(_.keys(startArgs[1])).toContain("statusCode");
      // table
      expect(startArgs[2]).toEqual(table);

      // event
      expect(finishArgs[0] instanceof jQuery.Event).toEqual(true);
      // xhr
      expect(_.keys(finishArgs[1])).toContain("responseText");
      expect(_.keys(finishArgs[1])).toContain("statusCode");
      // status
      expect(finishArgs[2]).toEqual("success");
      // table
      expect(finishArgs[3]).toEqual(table);
      // filters
      expect(_.isArray(finishArgs[4])).toEqual(true);
      expect(_.pluck(finishArgs[4], "name")).toContain("sEcho");
      expect(_.pluck(finishArgs[4], "name")).toContain("column_attrs[]");
    });

    it("should reset collection on server response and set parse to true so that collection or models can override default attribute parsing", function() {
      class ModelWithParse extends Model {
        parse(response) {
          const data = response;

          if (response.name.match(/hey hey 10/)) {
            data.name = "PARSED NAME: " + data.name;
          }

          return data;
        }
      }

      class CollectionOfModelWithParse extends Collection {
        get model() { return ModelWithParse; }
        get url() { return "/somewhere"; }
      }

      const collection = new CollectionOfModelWithParse();

      const table = new TestDataTable({ collection: collection });
      table.render();

      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

      expect(collection.models.length).toEqual(10);
      expect(collection.models[0].get('name')).toEqual("1 - hey hey 1", "Unparsed name");
      expect(collection.models[9].get('name')).toEqual("PARSED NAME: 10 - hey hey 10", "Parsed name");
    });
  });

  describe("grand totals row", function() {
    beforeEach(function() {
      this.RowClass = createRowClass({
        columns: [
          { attr: "name", title: "Name", id: "name" },
          { attr: "cost", title: "Cost", id: "cost" },
          { attr: "type", title: "Type", id: "type" },
          { attr: "description", title: "description", id: "description" },
          { attr: "resale_value", title: "Resale value", id: "resale_value" }
        ],

        renderers: {
          "cost": function(node, config) {
            var value = "<br>";
            if (this.isTotals && this.hasUniques) {
              value = "$" + this.model.get(config.id + ".unique") + value;
            }
            node.html(value + "$" + this.model.get(config.id));
          },
          "resale_value": function(node, config) {
            var value = "<br>";
            if (this.isTotals && this.hasUniques) {
              value = "$" + this.model.get(config.id + ".unique") + value;
            }
            node.html(value + "$" + this.model.get(config.id));
          }
        }
      });

      const TestDataTable = createServerSideDataTableClass({
        rowClass: this.RowClass
      }, {
        sorting: [['name', 'desc']],
        filteringEnabled: true,
        serverSideFiltering: true,
        isNontotalsColumn: function(col) {
          return (col.id !== "cost" && col.id !== "resale_value");
        }
      });

      this.table = new TestDataTable({ collection: this.collection });
    });

    describe("without uniques", function() {
      beforeEach(function() {
        this.table.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.getWithTotals());
      });

      it("should be defined", function() {
        expect(this.table.$("table").length).toEqual(1);
        expect(this.table.$("tfoot").length).toEqual(1);
        expect(this.table.rowClass).toEqual(this.RowClass);
      });

      it("should have cells defined", function() {
        expect(this.table.$('tfoot tr td').length > 2).toBeTruthy();
      });

      it("should have a grand totals row defined", function() {
        expect(this.table.$('tfoot tr td').eq(0).text()).toEqual("Grand Total");
      });

      it("should correctly render grand totals row data using renderers", function() {
        const grandTotalsCells = this.table.$('tfoot tr td');
        expect(grandTotalsCells.length).toEqual(5);
        expect(grandTotalsCells.eq(0).text()).toEqual("Grand Total");
        expect(grandTotalsCells.eq(1).text()).toEqual("$10000");
        expect(grandTotalsCells.eq(2).text()).toEqual("");
        expect(grandTotalsCells.eq(3).text()).toEqual("");
        expect(grandTotalsCells.eq(4).text()).toEqual("$5000");
      });

      it("should correctly render grand totals row data after reorder", function() {
        expect(this.table._colReorder.fnGetCurrentOrder()).toEqual([0, 1, 2, 3, 4]);
        this.table._colReorder.fnOrder([1, 0, 2, 3, 4]);
        this.table._colReorder.s.dropCallback(1, 0);
        expect(this.table._colReorder.fnGetCurrentOrder()).toEqual([1, 0, 2, 3, 4]);
        var grandTotalsCells = this.table.$('tfoot tr td');
        expect(grandTotalsCells.eq(0).text()).toEqual("$10000");
        expect(grandTotalsCells.eq(1).text()).toEqual("Grand Total");
        expect(grandTotalsCells.eq(2).text()).toEqual("");
        expect(grandTotalsCells.eq(3).text()).toEqual("");
        expect(grandTotalsCells.eq(4).text()).toEqual("$5000");
      });

      it("should keep grand totals row leftmost", function() {
        expect(this.table._colReorder.fnGetCurrentOrder()).toEqual([0, 1, 2, 3, 4]);
        this.table._colReorder.fnOrder([3, 0, 1, 2, 4]);
        this.table._colReorder.s.dropCallback(3, 0);
        expect(this.table._colReorder.fnGetCurrentOrder()).toEqual([3, 0, 1, 2, 4]);
        var grandTotalsCells = this.table.$('tfoot tr td');
        expect(grandTotalsCells.eq(0).text()).toEqual("Grand Total");
        expect(grandTotalsCells.eq(1).text()).toEqual("");
        expect(grandTotalsCells.eq(2).text()).toEqual("$10000");
        expect(grandTotalsCells.eq(3).text()).toEqual("");
        expect(grandTotalsCells.eq(4).text()).toEqual("$5000");
      });
    });

    describe("with uniques", function() {
      beforeEach(function() {
        this.table.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.getWithUniques());
      });

      it("should render title from grandTotalsRenderer if it exists for column", function() {
        const Row = createRowClass({
          columns: [
            { attr: "name", title: "asdfdasdfas", id: "name", grandTotalRenderer: function(node, config) { node.html("Total Gross<br>Total Net"); } },
            { attr: "cost", title: "Cost", id: "cost", grandTotalRenderer: function(node, config) { node.html("Total Gross<br>Total Net"); } },
            { attr: "type", title: "Type", id: "type", grandTotalRenderer: function(node, config) { node.html("Total Gross<br>Total Net"); } },
            { attr: "description", title: "description", id: "description" },
            { attr: "resale_value", title: "Resale value", id: "resale_value" }
          ],

          renderers: {
            "cost": function(node, config) {
              var value = "<br>";
              if (this.isTotals && this.hasUniques) {
                value = "$" + this.model.get(config.id + ".unique") + value;
              }
              node.html(value + "$" + this.model.get(config.id));
            },
            "resale_value": function(node, config) {
              var value = "<br>";
              if (this.isTotals && this.hasUniques) {
                value = "$" + this.model.get(config.id + ".unique") + value;
              }
              node.html(value + "$" + this.model.get(config.id));
            }
          }
        });

        const TestDataTable = createServerSideDataTableClass({
          rowClass: Row
        });

        const collection = new TestCollection();
        const table1 = new TestDataTable({ collection: collection });
        table1.render();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.getWithUniques());

        var titleCell = table1.$('tfoot tr td').eq(0);
        expect(titleCell.html()).toEqual("Total Gross<br>Total Net");
      });

      it("should render title as 'Grand Total' if grandTotalsRenderer does not exist for column", function() {
        var titleCell = this.table.$('tfoot tr td').eq(0);
        expect(titleCell.html()).toEqual("Grand Total");
      });

      it("should properly display totals rows in the grand total row", function() {
        var grandTotalsCells = this.table.$('tfoot tr td');
        expect(grandTotalsCells.length).toEqual(5);
        expect(grandTotalsCells.eq(0).html()).toEqual("Grand Total");
        expect(grandTotalsCells.eq(1).html()).toEqual("$10020<br>$10000");
        expect(grandTotalsCells.eq(2).text()).toEqual("");
        expect(grandTotalsCells.eq(3).text()).toEqual("");
        expect(grandTotalsCells.eq(4).html()).toEqual("$5010<br>$5000");
      });
    });
  });

  describe("server side removal", function() {
    it("should reload the collection to the page", function() {
      const table = new TestDataTable({ collection: this.collection });
      this.collection.remove(this.collection.models[0]);

      expect(table.$("tbody tr").length).toEqual(0);
    });
  });

  describe("server side urls", function() {
    it("should work with a url that is a string", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("/somewhere?");
      expect(table.$("tbody tr").length).toEqual(10);
      expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1, table.$("div.dataTables_info").text());
    });

    it("should work with a url that is a function", function() {
      var oldUrl = this.collection.url;
      this.collection.url = function() { return oldUrl; };

      const table = new TestDataTable({ collection: this.collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("/somewhere?");
      expect(table.$("tbody tr").length).toEqual(10);
      expect(table.$("div.dataTables_info:contains('Showing 1 to 10 of 100 entries')").length).toEqual(1);
    });
  });

  describe("server side params", function() {
    it("should automatically include column attributes", function() {
      var expectedAttrParams = $.param({ column_attrs: [undefined, "name", "cost", "type", undefined] });
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch(expectedAttrParams);
    });

    it("should allow for addition of server params", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.serverParams({ monkey: "chicken" });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");
    });

    it("should allow for addition of server params that are arrays and convert to rails syntax", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.serverParams({ monkey: ["chicken", "goat"] });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey%5B%5D=chicken&monkey%5B%5D=goat");
    });

    it("should reload the table when server params are set", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();

      table.serverParams({ monkey: "chicken" });
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");

      table.serverParams({ monkey: "rabbit" });
      expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("monkey=chicken");
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=rabbit");
    });

    it("should pass the current server params with each page change", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.serverParams({ monkey: "chicken" });
      table.render();
      table.page("next");

      // an initial request and then another for the next page
      expect(jasmine.Ajax.requests.count()).toEqual(2);
      expect(jasmine.Ajax.requests.mostRecent().url).toMatch("monkey=chicken");
    });

    it("should set an X-Backdraft header on dataTables' ajax requests", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();
      expect(jasmine.Ajax.requests.mostRecent().requestHeaders["X-Backdraft"]).toEqual("1");
      expect(jasmine.Ajax.requests.count()).toEqual(1);
      table.page("next");
      expect(jasmine.Ajax.requests.mostRecent().requestHeaders["X-Backdraft"]).toEqual("1");
      expect(jasmine.Ajax.requests.count()).toEqual(2);
    });

    it("should allow an AJAX method to be specified", function() {
      const AjaxMethodTestTable = createServerSideDataTableClass({
        rowClass: TestRow
      }, {
        ajaxMethod: "POST"
      });

      const table = new AjaxMethodTestTable({ collection: this.collection });
      table.render();

      expect(jasmine.Ajax.requests.mostRecent().method).toEqual("POST");
    });

    it("should default to GET when an AJAX method is not specified", function() {
      const table = new TestDataTable({ collection: this.collection });
      table.render();

      expect(jasmine.Ajax.requests.mostRecent().method).toEqual("GET");
    });

    it("should handle DT 1.10 param for sEcho (draw) for ajax response", function() {
      const table = new TestDataTable({ collection: this.collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify({
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
      const table = new TestDataTable({ collection: this.collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify({
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
      const table = new TestDataTable({ collection: this.collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify({
          requestId: '33',
          recordsTotal: 2,
          recordsFiltered: 1,
          data: [{ name: 'bar' }]
        })
      });

      expect(callbackSpy).toHaveBeenCalled();

      var ajaxUpdateArgs = callbackSpy.calls.argsFor(0);

      // data params filters
      expect(ajaxUpdateArgs[0].sEcho).toEqual("33");
      expect(ajaxUpdateArgs[0].iTotalRecords).toEqual(2);
      expect(ajaxUpdateArgs[0].iTotalDisplayRecords).toEqual(1);

      // testing the aaData is mapped (need to spy the collection.reset since it then modifies the aaData param internally)
      expect(table.collection.reset.calls.argsFor(0)[0]).toEqual([{ name: 'bar' }]);
    });

    it("should handle generic API param for total records when 0 in ajax response", function() {
      const table = new TestDataTable({ collection: this.collection });

      var callbackSpy = spyOnDataTableAjaxResponse(table);
      expect(callbackSpy).not.toHaveBeenCalled();

      table.render();

      jasmine.Ajax.requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify({
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
        const table = new TSimple({ collection: this.collection });
        table.render();

        table.serverParams({ monkey: "chicken" });
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_by=name");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("sort_dir=desc");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=2");
      });

      it("should handle no sort param and not pass sort dir either", function() {
        const table = new TSimple({ collection: this.collection });

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function(aoData) {
          // pass in same array object but emptied out, to simulate no existing sort params
          aoData.splice(0, aoData.length);
          aoData.push({ name: "sEcho", value: "3" });
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({ monkey: "chicken" });
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_by");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_dir");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=3");
      });

      it("should handle when no sort param is found but sort dir did exist (and not send either param)", function() {
        const table = new TSimple({ collection: this.collection });

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function(aoData) {
          // pass in same array object but emptied out, to simulate no existing sort params
          aoData.splice(0, aoData.length);
          aoData.push({ name: "sEcho", value: "3" });
          aoData.push({ name: "sSortDir_0", value: "desc" });
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({ monkey: "chicken" });
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("iSortCol_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sSortDir_0");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sEcho");

        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_by");
        expect(jasmine.Ajax.requests.mostRecent().url).not.toMatch("sort_dir");
        expect(jasmine.Ajax.requests.mostRecent().url).toMatch("request_id=3");
      });

      it("should handle when sort param is index 0 and not treat as false", function() {
        const table = new TSimple({ collection: this.collection });

        var originalAddServerParams = table._addServerParams;

        spyOn(table, '_addServerParams').and.callFake(function(aoData) {
          // pass in same array object but emptied out first
          aoData.splice(0, aoData.length);
          aoData.push({ name: "sEcho", value: "3" });
          aoData.push({ name: "iSortCol_0", value: 0 });
          aoData.push({ name: "sSortDir_0", value: "desc" });
          originalAddServerParams.call(this, aoData);
        });

        table.render();

        table.serverParams({ monkey: "chicken" });
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
      this.table = new TestDataTable({ collection: this.collection });
      this.table.serverParams({ monkey: "chicken" });
      this.table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
    });

    it("should require that all visible rows are also currently selected", function() {
      expect(() => {
        this.table.selectAllMatching(true);
      }).toThrowError("all rows must be selected before calling #selectAllMatching");

      expect(() => {
        this.table.selectAllVisible(true);
        this.table.selectAllMatching(true);
      }).not.toThrow();
    });

    it("should store a copy of the server params", function() {
      this.table.selectAllVisible(true);
      this.table.selectAllMatching(true);

      expect(this.table.selectAllMatching()).toEqual({ monkey: "chicken" });
    });

    it("should allow clearing", function() {
      this.table.selectAllVisible(true);
      this.table.selectAllMatching(true);

      expect(this.table.selectAllMatching()).toEqual({ monkey: "chicken" });

      this.table.selectAllMatching(false);
      expect(this.table.selectAllMatching()).toEqual(null);
    });

    describe("automatically clear stored params", function() {
      beforeEach(function() {
        this.table.selectAllVisible(true);
        this.table.selectAllMatching(true);
        expect(this.table.selectAllMatching()).toEqual({ monkey: "chicken" });
      });

      it("should clear on pagination", function() {
        this.table.page("next");
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

        expect(this.table.selectAllMatching()).toEqual(null);
      });

      it("should clear on sorting", function() {
        this.table.sort([[1, 'asc']]);
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

        expect(this.table.selectAllMatching()).toEqual(null);
      });

      it("should clear on page size change", function() {
        this.table.$(".dataTables_length select").val(25).change();
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

        expect(this.table.selectAllMatching()).toEqual(null);
      });

      it("should clear when all rows are deselected", function() {
        this.table.selectAllVisible(false);

        expect(this.table.selectAllMatching()).toEqual(null);
      });

      it("should clear when a row becomes unchecked", function() {
        // need to actually insert into the DOM to have #click work correctly
        inDom(this.table.$el, () => {
          this.table.$("td.bulk :checkbox:first").click();
          expect(this.table.selectAllMatching()).toEqual(null);
        });
      });

      it("should clear when #serverParams is called", function() {
        this.table.serverParams({});
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

        expect(this.table.selectAllMatching()).toEqual(null);
      });
    });
  });

  describe("bulk selection", function() {
    beforeEach(function() {
      this.table = new TestDataTable({ collection: this.collection });
      this.table.render();
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
    });

    function bulkSelectionTests(action, callback) {
      it("should clear the bulk selection checkbox after " + action, function() {
        this.table.selectAllVisible(true);
        expect(this.table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
        callback(this.table);
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        expect(this.table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
      });

      it("should reset selections after " + action, function() {
        expect(this.table.selectedModels().length).toEqual(0);
        this.table.selectAllVisible(true);
        expect(this.table.selectedModels().length).toEqual(10);
        callback(this.table);
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
        expect(this.table.selectedModels().length).toEqual(0);
      });

      it("should trigger a selection change event after " + action, function() {
        var changeSelectSpy = jasmine.createSpy("changeSelectSpy");
        this.table.on("change:selected", changeSelectSpy);
        this.table.selectAllVisible(true);
        expect(changeSelectSpy.calls.allArgs()[0][0]).toEqual({ count: 10, selectAllVisible: true });
        callback(this.table);
        jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());
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
    function getColumnConfigByCSS(element, table) {
      var id = extractColumnCSSClass(element.className).replace("column-", "");
      return table.configGenerator().columnConfigById.attributes[id];
    }

    function clearFilters(table) {
      table.dataTable.find("thead th").not(".bulk").each(function(index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this, table);
          if (col && col.filter) {
            switch (col.filter.type) {
            case "string":
              $(".toggle-filter-button", this).click();
              $('.filter-menu input').val("").trigger("change");
              break;
            case "numeric":
              $(".toggle-filter-button", this).click();
              $("input#first-filter").val("").trigger("change");
              break;

            case "list":
              $(".toggle-filter-button", this).click();
              $('.filter-menu input').prop("checked", false).trigger("change");
              break;
            }
          }
        }
      });
    }

    function populateFilters(table) {
      table.dataTable.find("thead th").not(".bulk").each(function(index) {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this, table);
          if (col && col.filter) {
            switch (col.filter.type) {
            case "string":
              $(".toggle-filter-button", this).click();
              $('.filter-menu input').val("Scott").trigger("change");
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
              $(".filter-menu input[value=Special_\\\\\\@\\=]").prop("checked", true).trigger("change");
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
      expect(url).toMatch("ext_filter_json=" + expectedFilterJson);
    }

    function verifyUrlParams(filterObj) {
      var uri = encodeURIComponent($.deparam(window.location.href.split("?")[1]).filter_json);
      var expectedFilterJson = (filterObj.length > 0) ? encodeURIComponent(JSON.stringify(filterObj)) : "";
      expect(uri).toMatch(expectedFilterJson);
    }

    function setupTable(rowClass, mockResponse) {
      const TestDataTable = createServerSideDataTableClass({
        rowClass
      }, {
        sorting: [['name', 'desc']],
        filteringEnabled: true,
        serverSideFiltering: true
      });

      const collection = new TestCollection();

      const table = new TestDataTable({ collection });
      table.render();
      jasmine.Ajax.requests.mostRecent().response(mockResponse);
      Backbone.history.navigate("?", { trigger: false, replace: true });

      return table;
    }

    it("should not duplicate filter view when there are duplicate title names", function() {
      const TestRow = createRowClass({
        columns: [
          { bulk: true },
          { attr: "name", title: "Name", filter: { type: "string" } },
          { attr: "cost", title: "Cost", filter: { type: "numeric" } },
          { attr: "cost2", title: "Cost", filter: { type: "numeric" } },
          { attr: "type", title: "Type", filter: { type: "list", options: LIST_FILTERS } },
          { title: "Non attr column" }
        ],
        renderers: {
          "non attr column": function(node, config) {
            node.html("Non attr column");
          }
        }
      });

      const table = setupTable(TestRow, {
        status: 200,
        responseText: JSON.stringify({
          sEcho: 'custom1',
          iTotalRecords: 1,
          iTotalDisplayRecords: 1,
          aaData: [
            { name: '1 - hey hey 1', cost: 'c', cost2: 'c2', type: '' }
          ]
        })
      });

      expect(table.children["filter-name"]).toBeDefined();
      expect(table.children["filter-cost"]).toBeDefined();
      expect(table.children["filter-cost2"]).toBeDefined();
      expect(table.children["filter-type"]).toBeDefined();
      expect(table).toBeDefined();
    });

    it("should enable the filterActive icon when filters are set, disable when cleared", function() {
      const collection = new TestCollection();
      const table = new TestDataTable({ collection });
      table.render();
      $('body').append(table.$el);
      jasmine.Ajax.requests.mostRecent().response(this.mockResponse.get());

      table.dataTable.find("thead th").not(".bulk").each(function() {
        var wrapper = $(".DataTables_sort_wrapper", this);
        if (wrapper) {
          var col = getColumnConfigByCSS(this, table);
          if (col && col.filter) {
            $(".toggle-filter-button", this).click();
            if (col.filter.type === "string") {
              $(".filter-menu input").val("Test").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $(".filter-menu input").val("").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            } else if (col.filter.type === "numeric") {
              $("input#first-filter").val("3").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $("input#first-filter").val("").trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            } else if (col.filter.type === "list") {
              $(".filter-menu input").prop("checked", true).trigger("change");
              expect($("span", this).attr("class")).toEqual("filterActive");
              $(".filter-menu input").prop("checked", false).trigger("change");
              expect($("span", this).attr("class")).toEqual("filterInactive");
            }
          }
        }
      });
    });

    describe("common functionality", function() {
      beforeEach(function() {
        const TestRow = createRowClass({
          columns: [
            { bulk: true },
            { attr: "name", title: "Name", filter: { type: "string" } },
            { attr: "cost", title: "Cost", filter: { type: "numeric" } },
            { attr: "type", title: "Type", filter: { type: "list", options: LIST_FILTERS } },
            { title: "Non attr column" }
          ],
          renderers: {
            "non attr column": function(node, config) {
              node.html("Non attr column");
            }
          }
        });

        this.table = setupTable(TestRow, this.mockResponse.get());
        $('body').append(this.table.$el);
      });

      afterEach(function() {
        this.table.remove();
      });

      it("should have an object for each filterable column in the column manager which describes the filter to be applied", function() {
        var cg = this.table._columnManager._configGenerator;
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
        expect(cg.columnsConfig[3].filter.options).toEqual(LIST_FILTERS);
      });

      it("shouldn't create filter inputs for unfilterable columns", function() {
        var hasFilter = [];
        this.table.dataTable.find("thead th").each(function(index) {
          hasFilter.push(this.getElementsByClassName('DataTables_filter_wrapper').length > 0);
        });
        expect(hasFilter).toEqual([false, true, true, true, false]);
      });

      it("should track filtering in column manager and in ext_filter_json parameter", function() {
        Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

        var expectedFilterObj = [];
        const darTable = this.table;
        this.table.dataTable.find("thead th").not(".bulk").each(function(index) {
          var wrapper = $(".DataTables_sort_wrapper", this);
          if (wrapper) {
            var col = getColumnConfigByCSS(this, darTable);
            if (col && col.filter) {
              if (col.filter.type === "string") {
                // test assignment
                $(".toggle-filter-button", this).click();
                $('.filter-menu input').val("Scott").trigger("change");
                expect(col.filter.value).toEqual("Scott");
                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "string", attr: col.attr, comparison: "value", value: "Scott" }];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // test unassignment
                $(".toggle-filter-button", this).click();
                $('.filter-menu input').val("").trigger("change");
                expect(col.filter.value).toEqual(null);
                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);
              } else if (col.filter.type === "numeric") {
                // test assignment
                $(".toggle-filter-button", this).click();
                $('select[data-filter-id=first-filter]').val("eq").trigger("change");
                $('input#first-filter').val("0.5").trigger("change");
                expect(col.filter.eq).toEqual("0.5");
                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "numeric", attr: col.attr, comparison: "eq", value: 0.5 }];
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
              } else if (col.filter.type === "list") {
                // test assignment
                $(".toggle-filter-button", this).click();
                $('.filter-menu input').prop("checked", true).trigger("change");
                expect(col.filter.value).toEqual(LIST_FILTERS);
                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "list", attr: col.attr, comparison: "value", value: LIST_FILTERS }];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // test unassignment
                $(".toggle-filter-button", this).click();
                $('.filter-menu input').prop("checked", false).trigger("change");
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
        Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });
        // populate url with filters
        populateFilters(this.table);
        // get url
        var oldFilterSettings = this.table._getFilteringSettings();
        var populatedURL = window.location.search;
        // remove filters
        clearFilters(this.table);
        // push the populatedURL
        Backbone.history.navigate(populatedURL, { trigger: false, replace: true });

        const cg = this.table.configGenerator();
        // Since we can't do a refresh, we just call the method that fires at that moment
        cg._computeColumnConfig();
        // get new filtering settings
        var newFilterSettings = this.table._getFilteringSettings();
        // They should be the same
        expect(oldFilterSettings).toEqual(newFilterSettings);
        Backbone.history.navigate("?", { trigger: false, replace: true });
      });

      it("should load filters from url params with old uri param", function() {
        Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });
        populateFilters(this.table);
        var oldFilterSettings = this.table._getFilteringSettings();
        var populatedURL = window.location.search;
        populatedURL = populatedURL.replace("filter_json", "ext_filter_json");
        clearFilters(this.table);
        Backbone.history.navigate(populatedURL, { trigger: false, replace: true });
        const cg = this.table.configGenerator();
        cg._computeColumnConfig();
        var newFilterSettings = this.table._getFilteringSettings();
        expect(oldFilterSettings).toEqual(newFilterSettings);
      });

      it("should populate filter markup from url params and handle special characters in filter names", function() {
        Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

        // populate url with filters
        populateFilters(this.table);

        var populatedURL = window.location.search;

        // remove filters
        clearFilters(this.table);

        // push the new url
        Backbone.history.navigate(populatedURL, { trigger: false, replace: true });

        // Since we can't do a refresh, we just call the methods that fires at that moment
        const cg = this.table.configGenerator();
        cg._computeColumnConfig();
        cg.table.children["filter-name"].children["filter-menu"].afterRender();
        cg.table.children["filter-cost"].children["filter-menu"].afterRender();
        cg.table.children["filter-type"].children["filter-menu"].afterRender();

        // Check the filters are there
        const darTable = this.table;
        this.table.dataTable.find("thead th").not(".bulk").each(function(index) {
          var wrapper = $(".DataTables_sort_wrapper", this);
          if (wrapper) {
            var col = getColumnConfigByCSS(this, darTable);
            if (col && col.filter) {
              switch (col.filter.type) {
              case "string":
                $(".toggle-filter-button", this).click();
                expect($('.filter-menu input').val()).toEqual("Scott");
                break;
              case "numeric":
                $(".toggle-filter-button", this).click();
                expect($('select[data-filter-id=first-filter]').val()).toEqual("eq");
                expect($('input#first-filter').val()).toEqual("0.5");
                break;
              case "list":
                $(".toggle-filter-button", this).click();
                expect($(".filter-menu input[value=Special_\\\\\\@\\=]").prop("checked")).toEqual(true);
                break;
              }
            }
          }
        });

        Backbone.history.navigate("?", { trigger: false, replace: true });

        // remove filters again so that other tests don't fail
        clearFilters(this.table);
      });

      it("should open the filterMenu when the filter toggle is clicked, and close if clicked again", function() {
        const darTable = this.table;
        this.table.dataTable.find("thead th").not(".bulk").each(function() {
          var wrapper = $(".DataTables_sort_wrapper", this);
          if (wrapper) {
            var col = getColumnConfigByCSS(this, darTable);
            if (col && col.filter) {
              // todo: the below are not asserting anything! (and currently not returning 'true')
              expect($(".filter-menu", this).is(":hidden"));
              $("span", this).trigger("click");
              expect($(".filter-menu", this).is(":visible"));
              $("span", this).trigger("click");
              expect($(".filter-menu", this).is(":hidden"));
            }
          }
        });

        expect(true).toBe(true, "Fix the above expect statements to be valid tests");
      });

      it("should close the activeFilterMenu when the user clicks out of it", function() {
        const darTable = this.table;

        this.table.dataTable.find("thead th").not(".bulk").each(function() {
          const wrapper = $(".DataTables_sort_wrapper", this);
          expect(wrapper).toBeDefined();

          const col = getColumnConfigByCSS(this, darTable);

          if (col && col.filter) {
            expect($(".popover .filter-menu").length).toEqual(0);

            // open the menu
            const toggleButton = $(".toggle-filter-button", this);
            toggleButton.click();
            expect($(".popover .filter-menu").length).toEqual(1);

            // click away
            darTable.$el.trigger("click");
            expect($(".popover .filter-menu").length).toEqual(0);

            // catch the timeout for dataTable's _fnSortAttachListener()
            jasmine.clock().tick(1000);
          }
        });
      });

      it("should close the activeFilterMenu when the user clicks to open another menu, and then open the new menu", function() {
        var lastFilterMenu;
        var currentFilterMenu;
        const darTable = this.table;

        this.table.dataTable.find("thead th").not(".bulk").each(function() {
          var wrapper = $(".DataTables_sort_wrapper", this);
          if (wrapper) {
            var col = getColumnConfigByCSS(this, darTable);
            if (col && col.filter) {
              if (currentFilterMenu) {
                lastFilterMenu = currentFilterMenu;
              }
              currentFilterMenu = $(".filter-menu", this);

              // todo: the below are not asserting anything! (and currently not returning 'true')
              expect(currentFilterMenu.is(":hidden"));
              $("span", this).trigger("click");
              expect(currentFilterMenu.is(":visible"));
              if (lastFilterMenu) {
                expect(lastFilterMenu.is(":hidden"));
              }
            }
          }
        });

        expect(true).toBe(true, "Fix the above expect statements to be valid tests");
      });

      it("should clear the filters when the clear button is clicked", function() {
        Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

        var expectedFilterObj = [];
        const darTable = this.table;

        this.table.dataTable.find("thead th").not(".bulk").each(function() {
          var wrapper = $(".DataTables_sort_wrapper", this);
          if (wrapper) {
            var col = getColumnConfigByCSS(this, darTable);
            var toggleButton = $(".toggle-filter-button", this);
            if (col && col.filter) {
              if (col.filter.type === "string") {
                // test assignment
                toggleButton.click();
                $('.filter-menu input').val("Scott").trigger("change");
                expect(col.filter.value).toEqual("Scott");

                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "string", attr: col.attr, comparison: "value", value: "Scott" }];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // test clear button & filter value
                toggleButton.click();
                $(".btn-clear").trigger("click");
                expect(col.filter.value).toEqual(null);

                // verify ajax
                expectedFilterObj = [];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // verify assignment
                toggleButton.click();
                expect($(".filter-menu input").val()).toEqual("");
              } else if (col.filter.type === "numeric") {
                // test equal assignment
                toggleButton.click();
                $('select[data-filter-id=first-filter]').val("eq").trigger("change");
                $('input#first-filter').val("0.5").trigger("change");
                expect(col.filter.eq).toEqual("0.5");

                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "numeric", attr: col.attr, comparison: "eq", value: 0.5 }];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // test clear button & filter value
                toggleButton.click();
                $(".btn-clear").trigger("click");
                expect(col.filter.eq).toBeUndefined();

                // verify ajax
                expectedFilterObj = [];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // verify assignment
                toggleButton.click();
                expect($("input#first-filter").val()).toEqual("");
              } else if (col.filter.type === "list") {
                // test assignment
                toggleButton.click();
                $('.filter-menu input').prop("checked", true).trigger("change");
                expect(col.filter.value).toEqual(LIST_FILTERS);

                // verify ajax
                $(".btn-filter").trigger("click");
                expectedFilterObj = [{ type: "list", attr: col.attr, comparison: "value", value: LIST_FILTERS }];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // test clear button & filter value
                toggleButton.click();
                $(".btn-clear").trigger("click");
                expect(col.filter.value).toEqual(null);

                // verify ajax
                expectedFilterObj = [];
                verifyFilterAjax(expectedFilterObj);
                verifyUrlParams(expectedFilterObj);

                // verify assignment
                toggleButton.click();
                expect($(".filter-menu input").prop("checked")).toEqual(false);
              }
            }
          }
        });
      });

      describe("filterView", function() {
        describe("clear() should null filter values and update url even when not enabled", function() {
          it("for stringFilterMenu", function() {
            Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

            var stringFilterMenu = this.table.configGenerator().table.children["filter-name"].children["filter-menu"];

            stringFilterMenu.enabled = false;
            stringFilterMenu.filter.value = "scott";
            expect(stringFilterMenu.filter.value).toEqual("scott");

            stringFilterMenu.clear();
            expect(stringFilterMenu.filter.value).toEqual(null);
            verifyUrlParams([]);
          });

          it("for numericFilterMenu", function() {
            Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

            var numericFilterMenu = this.table.configGenerator().table.children["filter-cost"].children["filter-menu"];

            numericFilterMenu.enabled = false;
            numericFilterMenu.filter.lt = 0.1;
            numericFilterMenu.filter.gt = 0.2;
            numericFilterMenu.filter.eq = 0.3;

            expect(numericFilterMenu.filter.lt).toEqual(0.1);
            expect(numericFilterMenu.filter.gt).toEqual(0.2);
            expect(numericFilterMenu.filter.eq).toEqual(0.3);
            numericFilterMenu.clear();
            expect(numericFilterMenu.filter.lt).toEqual(null);
            expect(numericFilterMenu.filter.gt).toEqual(null);
            expect(numericFilterMenu.filter.eq).toEqual(null);

            verifyUrlParams([]);
          });

          it("for listFilterMenu", function() {
            Backbone.history.navigate("?date_filter=today", { trigger: false, replace: true });

            var listFilterMenu = this.table.configGenerator().table.children["filter-type"].children["filter-menu"];

            listFilterMenu.enabled = false;
            listFilterMenu.filter.value = LIST_FILTERS;

            expect(listFilterMenu.filter.value).toEqual(LIST_FILTERS);
            listFilterMenu.clear();
            expect(listFilterMenu.filter.value).toEqual(null);

            verifyUrlParams([]);
          });
        });
      });

      it("should disable filter menus and display error message, and remove error message when enabled", function() {
        this.table.disableFilters("Test error message");
        var columns = this.table.columnsConfig();
        var currentFilterMenu;

        for (let c in columns) {
          if (!columns[c].filter) continue;
          let renderedFilterMenu = this.table.child(('filter-' + columns[c].attr)).child('filter-menu').render().$el;

          expect(renderedFilterMenu.find("[data-mount=error-message]").length).toEqual(1, "error-message length");
          expect(renderedFilterMenu.find("[data-mount=error-message]").text()).toMatch(/Test error message/);
          expect(renderedFilterMenu.find(".filter-menu .btn").length).toEqual(0, "no buttons");

          $("span", currentFilterMenu).trigger("click");
        }

        this.table.enableFilters();
        for (let c in columns) {
          if (!columns[c].filter) continue;
          let renderedFilterMenu = this.table.child(('filter-' + columns[c].attr)).child('filter-menu').render().$el;

          expect(renderedFilterMenu.find("[data-mount=error-message]").length).toEqual(0, 'no error message');
          expect(renderedFilterMenu.find(".filter-menu .btn-filter").last().prop('disabled')).toEqual(false);
          expect(renderedFilterMenu.find(".filter-menu .btn-clear").last().prop('disabled')).toEqual(false);

          $("span", currentFilterMenu).trigger("click");
        }
      });

      it("should overwrite existing numeric filter when filter type is changed", function() {
        var cg = this.table.configGenerator();
        var col = cg.columnConfigById.attributes["cost"];
        this.table.dataTable.find("th.column-cost .toggle-filter-button").trigger("click");
        $(".popover #first-filter").val("3").trigger("change");

        expect(col.filter).toEqual({ type: "numeric", gt: "3" });

        $(".popover select[data-filter-id=first-filter]").val("lt").trigger("change");
        expect(col.filter).toEqual({ type: "numeric", lt: "3" });
      });

      describe("_fetchCSV", function() {
        it("should append current filter parameters to the URL when requesting a CSV export", function() {
          // Set one column filter value so that the request contains filtering settings
          var cg = this.table._columnManager._configGenerator;
          var col = cg.columnsConfig[0];
          col.filter = { value: "filter_by_this_value" };

          // Set dummy URL
          var csvUrl = "/networks/transaction_reports/4.csv?ajax=1&backdraft=ui&chart=transaction&transaction_type=transaction_count";

          spyOn(this.table, "_goToWindowLocation").and.callFake(function() {});
          this.table._fetchCSV(csvUrl);
          expect(this.table._goToWindowLocation).toHaveBeenCalledWith("/networks/transaction_reports/4.csv?ajax=1&backdraft=ui&chart=transaction&transaction_type=transaction_count&backdraft_request=1&ext_filter_json=%5B%7B%22comparison%22%3A%22value%22%2C%22value%22%3A%22filter_by_this_value%22%7D%5D");
        });

        it("should throw error when serverSideFiltering is not enabled", function() {
          this.table.serverSideFiltering = false;
          expect(this.table.serverSideFiltering).toEqual(false);
          expect(() => { this.table._fetchCSV("/fake_url"); }).toThrow(new Error("serverSideFiltering is expected to be enabled when _fetchCSV is called"));
        });
      });

      describe("_goToWindowLocation", function() {
        it("should throw error when sUrl is not defined", function() {
          expect(() => { this.table._goToWindowLocation(); }).toThrow(new Error("sUrl must be defined when _goToWindowLocation is called"));
        });
      });
    });
  });
});
