import App from "../src/app";
import View from "../src/view";

describe("DataTable Plugin", function() {
  let app;
  let collection;
  let table;

  function getHeaders(table) {
    return table.$("thead tr th").map(function() {
      return $(this).text();
    }).get();
  }

  beforeEach(function() {
    app = new App(["DataTable"]);
    app.model("M", {});
    app.collection("Col", {
      model: app.Models.M
    });
    collection = new app.Collections.Col();
  });

  describe("factories and constructors", function() {
    it("should expose #dataTable and #dataTable.row", function() {
      app.view.dataTable.row("Abc", { columns: [] });
      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });
      expect(new app.Views.Abc({ columnsConfig: [] })).toEqual(jasmine.any(View));
      expect(new app.Views.Def({ collection })).toEqual(jasmine.any(View));
    });

    it("should allow rows to be subclassed", function() {
      app.view.dataTable.row("Abc", {
        baseMethod() {
          return "i am base";
        }
      });

      app.view.dataTable.row("new_abc", "Abc", {
        baseMethod() {
          return "i am the new base";
        }
      });

      expect(app.Views.new_abc.prototype.baseMethod()).toEqual("i am the new base");
    });

    it("should allow tables to be subclassed", function() {
      app.view.dataTable.row("Abc", { columns: [] });
      app.view.dataTable("Def", {
        rowClassName: "Abc",
        baseMethod() {
          return "i am base";
        }
      });
      app.view.dataTable("new_def", "Def", {
        baseMethod() {
          return "i am the new base";
        }
      });

      expect(app.Views.new_def.prototype.baseMethod()).toEqual("i am the new base");
    });

    it("should allow rowClass to be provided as an argument instead of rowClassName", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "I came from a rowClass argument" }
        ]
      });
      app.view.dataTable("Def", { });
      table = new app.Views.Def({ collection, rowClass: app.Views.Abc }).render();
      expect(getHeaders(table)).toEqual(["I came from a rowClass argument"]);
    });
  });

  describe("object names", function() {
    beforeEach(function() {
      app.view.dataTable.row("Abc", { columns: [] });
    });

    it("should default to using the object name of 'row' / 'rows'", function() {
      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });
      const table = new app.Views.Def({ collection });
      expect(table.objectName.singular).toEqual("row");
      expect(table.objectName.plural).toEqual("rows");
    });

    it("should allow the object name to be configurable", function() {
      app.view.dataTable("Def", {
        rowClassName: "Abc",
        objectName: {
          singular: "server",
          plural: "servers"
        }
      });
      const table = new app.Views.Def({ collection });
      expect(table.objectName.singular).toEqual("server");
      expect(table.objectName.plural).toEqual("servers");
    });

    it("should require that both the singular and plural forms of the object name be provided", function() {
      expect(() => {
        app.view.dataTable("Noplural", {
          rowClassName: "Abc",
          objectName: {
            singular: "server"
          }
        });

        // eslint-disable-next-line no-new
        new app.Views.Noplural({ collection });
      }).toThrowError(/plural object name must be provided/);

      expect(() => {
        app.view.dataTable("Nosingular", {
          rowClassName: "Abc",
          objectName: {
            plural: "servers"
          }
        });

        // eslint-disable-next-line no-new
        new app.Views.Nosingular({ collection });
      }).toThrowError(/singular object name must be provided/);
    });
  });

  describe("renderers", function() {
    describe("attr based", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "name", title: "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("should not insert them as html", function() {
        collection.add({ name: "<b>hihi</b>" });
        expect(table.$("tbody tr td:first").html()).toEqual("&lt;b&gt;hihi&lt;/b&gt;");
      });
    });

    describe("bulk", function() {
      beforeEach(function() {
        collection.add({ name: "Name" });
        app.view.dataTable.row("R", {
          columns: [
            { attr: "name", title: "Name" },
            { bulk: true }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("should insert a checkbox as first column", function() {
        collection.add({ name: "foo" });
        expect(table.$("tbody tr td:first :checkbox").length).toEqual(1);
      });

      it("should issue a change event for each row checkbox when header checkbox is toggled", function() {
        collection.add({ name: "foo" });
        const headerCheckbox = table.$("thead tr th:first :checkbox");
        const rowCheckbox = table.$("tbody tr td:first :checkbox");
        let rowChanged = 'row checkbox not changed';

        expect(headerCheckbox.length).toEqual(1);
        expect(rowCheckbox.length).toEqual(1);

        rowCheckbox.on('change', () => {
          rowChanged = 'row checkbox changed';
        });

        headerCheckbox.click();

        expect(rowChanged).toEqual('row checkbox changed');
      });
    });

    describe("user defined by title matching", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { title: "Name" },
            { title: "Age", attr: "age_value" }
          ],
          renderers: {
            // pure html, not based on model
            "name"(node, config) {
              node.html('<a href="#">I AM LINK</a>');
            },
            "age_value"(node, config) {
              node.addClass("age-added-by-renderer").text(this.model.get(config.attr));
            }
          }
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("invoke them correctly", function() {
        collection.add({ age_value: 30 });
        const cells = table.$("tbody td");
        expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
        expect(cells.eq(1).hasClass("column-age_value")).toEqual(true);
        expect(cells.eq(1).hasClass("age-added-by-renderer")).toEqual(true);
        expect(cells.eq(1).text()).toEqual("30");
      });
    });

    describe("user defined by config renderer property", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            {
              title: "Name",
              renderer(node, config) {
                node.html('<a href="#">I AM LINK</a>');
              }
            },
            {
              title: "Age",
              attr: "age_value",
              renderer(node, config) {
                node.addClass("age").text(this.model.get(config.attr));
              }
            }
          ]
        });

        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("invoke them correctly", function() {
        collection.add({ age_value: 30 });
        const cells = table.$("tbody td");
        expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
        expect(cells.eq(1).hasClass("age")).toEqual(true);
        expect(cells.eq(1).text()).toEqual("30");
      });
    });

    describe("subclassed renderers", function() {
      beforeEach(function() {
        app.view.dataTable.row("Abc", {
          renderers: {
            "monkey"(node, config) {
              return "Monkey";
            },
            "chicken"(node, config) {
              return "Chicken";
            }
          }
        });
      });

      it("should inherit renderers when a subclass does not provide a renderers property", function() {
        app.view.dataTable.row("new_abc", "Abc", {
        });

        expect(app.Views.new_abc.prototype.renderers["monkey"]()).toEqual("Monkey");
        expect(app.Views.new_abc.prototype.renderers["chicken"]()).toEqual("Chicken");
      });

      it("should inherit renderers when a subclass does provide a renderers property", function() {
        app.view.dataTable.row("new_abc", "Abc", {
          renderers: {
            "zebra"(node, config) {
              return "Zebra";
            },
            "monkey"(node, config) {
              return "OVERRIDE Monkey";
            }
          }
        });

        expect(app.Views.new_abc.prototype.renderers["zebra"]()).toEqual("Zebra");
        expect(app.Views.new_abc.prototype.renderers["monkey"]()).toEqual("OVERRIDE Monkey");
        expect(app.Views.new_abc.prototype.renderers["chicken"]()).toEqual("Chicken");
      });
    });
  });

  describe("columns", function() {
    it("can only be provided as an array or a function that returns an array", function() {
      const passingArray = () => {
        app.view.dataTable.row("ArrayCol", {
          columns: [
            { bulk: true }
          ]
        });
        app.view.dataTable("TableCol", {
          rowClassName: "ArrayCol"
        });

        table = new app.Views.TableCol({ collection });
        table.render();
      };

      const passingFn = () => {
        app.view.dataTable.row("ArrayCol", {
          columns() {
            return [
              { bulk: true }
            ];
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName: "ArrayCol"
        });

        table = new app.Views.TableCol({ collection });
        table.render();
      };

      const failing = () => {
        app.view.dataTable.row("ArrayCol", {
          columns() {
            return { bulk: true };
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName: "ArrayCol"
        });

        table = new app.Views.TableCol({ collection });
        table.render();
      };

      expect(passingArray).not.toThrow();
      expect(passingFn).not.toThrow();
      expect(failing).toThrow();
    });

    it("should allow columns to provide a #present method controlling whether they are included", function() {
      const yes = () => true;
      const no = () => false;
      app.view.dataTable.row("R", {
        columns: [
          { attr: "attr1", title: "Attr1", present: yes },
          { attr: "attr2", title: "Attr2", present: no },
          { attr: "attr3", title: "Attr3", present: no },
          { attr: "attr4", title: "Attr4", present: yes },
          { attr: "attr5", title: "Attr5" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName: "R"
      });

      table = new app.Views.T({ collection });
      table.render();

      expect(getHeaders(table)).toEqual(["Attr1", "Attr4", "Attr5"]);
    });

    it("should allow columns to set default sort direction", function() {
      function cellsByIndex(table, index) {
        return table.$(`tbody td:nth-child(${index + 1})`).map(function() {
          return $(this).text();
        }).get();
      }

      app.view.dataTable.row("R", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age", sortDir: ['desc', 'asc'] },
          { attr: "zip", title: "Zip", sortDir: ['asc', 'desc'] }
        ]
      });
      app.view.dataTable("T", {
        rowClassName: "R"
      });

      collection.reset([
        { name: "Zebra", age: 1, zip: 90000 },
        { name: "Bob", age: 10, zip: 10000 },
        { name: "Joe", age: 8, zip: 33333 }
      ]);

      table = new app.Views.T({ collection });
      table.render();

      // when nothing specified, sort asc by default
      table.$("thead th.column-name .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 0)).toEqual(["Bob", "Joe", "Zebra"]);

      // when clicking on a 'desc' specified one, sort desc by default
      table.$("thead th.column-age .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);

      // a second click should go to 'asc'
      table.$("thead th.column-age .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 1)).toEqual(["1", "8", "10"]);

      // when clicking on a 'asc' specified one, sort asc by default
      table.$("thead th.column-zip .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 2)).toEqual(["10000", "33333", "90000"]);

      // a second click should go to 'desc''
      table.$("thead th.column-zip .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 2)).toEqual(["90000", "33333", "10000"]);
    });

    it("should allow columns to set a sortBy method", function() {
      function cellsByIndex(table, index) {
        return table.$(`tbody td:nth-child(${index + 1})`).map(function() {
          return $(this).text();
        }).get();
      }

      app.view.dataTable.row("R", {
        columns: [
          { attr: "name", title: "Name" },
          { title: "User Age", sortBy(model) { return model.get('demographics').age; } }
        ],

        renderers: {
          "user-age"(node, config) {
            const d = this.model.get('demographics');
            return node.text(d.age);
          }
        }
      });

      app.view.dataTable("T", {
        rowClassName: "R"
      });

      collection.reset([
        { name: "A", demographics: { age: 7, gender: "male" } },
        { name: "B", demographics: { age: 5, gender: "male" } },
        { name: "C", demographics: { age: 9, gender: "female" } }
      ]);

      table = new app.Views.T({ collection });
      table.render();

      // should be based on name order
      table.$("thead th.column-name .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 0)).toEqual(["A", "B", "C"]);

      // sort by the callback method
      table.$("thead th.column-user-age .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 0)).toEqual(["B", "A", "C"]);
    });

    it("should allow columns to set a searchBy method", function() {
      function cellsByIndex(table, index) {
        return table.$(`tbody td:nth-child(${index + 1})`).map(function() {
          return $(this).text();
        }).get();
      }

      app.view.dataTable.row("R", {
        columns: [
          { attr: "name", title: "Name" },
          { title: "User Age", searchBy(model) { return model.get('demographics').gender; } }
        ],

        renderers: {
          "user-age"(node, config) {
            const d = this.model.get('demographics');
            return node.text(d.age);
          }
        }
      });

      app.view.dataTable("T", {
        rowClassName: "R"
      });

      collection.reset([
        { name: "A", demographics: { age: 7, gender: "male" } },
        { name: "B", demographics: { age: 5, gender: "male" } },
        { name: "C", demographics: { age: 9, gender: "female" } }
      ]);

      table = new app.Views.T({ collection });
      table.render();

      // all names are present
      table.$("thead th.column-name .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(cellsByIndex(table, 0)).toEqual(["A", "B", "C"]);

      // filter the table
      table.filter("female");
      expect(cellsByIndex(table, 0)).toEqual(["C"]);
    });

    describe("getting and setting visibility", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2" },
            { attr: "attr3", title: "Attr3" },
            { attr: "attr4", title: "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      function getVisibilities() {
        return _.map(table.columnsConfig(), column => table.columnVisibility(column.attr));
      }

      function getColspanLength() {
        return parseInt(table.$(".dataTables_empty").attr("colspan"), 10);
      }

      it("is able to modify visibility", function() {
        // initially all columns are visible
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);

        // hide Attr2
        table.columnVisibility("attr2", false);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr3", "Attr4"]);

        // hide Attr3
        table.columnVisibility("attr3", false);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr1 even though its already visible
        table.columnVisibility("attr1", true);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr2 and Attr 3
        table.columnVisibility("attr2", true);
        table.columnVisibility("attr3", true);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);
      });

      it("is able to modify multiple visibilities", function() {
        // initially all columns are visible
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);

        // hide Attr2, Attr3
        table.setColumnVisibilities({ attr2: false, attr3: false });
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr1, Attr4 even though already visible
        table.setColumnVisibilities({ attr1: true, attr4: true });
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr2 and Attr 3
        table.setColumnVisibilities({ attr2: true, attr3: true });
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);
      });

      it("returns the current visibility", function() {
        // initially all columns are visible
        expect(getVisibilities()).toEqual([true, true, true, true]);

        // hide Attr2
        table.columnVisibility("attr2", false);
        expect(getVisibilities()).toEqual([true, false, true, true]);

        // hide Attr3
        table.columnVisibility("attr3", false);
        expect(getVisibilities()).toEqual([true, false, false, true]);

        // show Attr1 even though its already visible
        table.columnVisibility("attr1", true);
        expect(getVisibilities()).toEqual([true, false, false, true]);

        // show Attr2 and Attr 3
        table.columnVisibility("attr2", true);
        table.columnVisibility("attr3", true);
        expect(getVisibilities()).toEqual([true, true, true, true]);
      });

      it("adjusts the colspan of the empty message to match visible columns", function() {
        // initially all columns are visible
        expect(getColspanLength()).toEqual(4);

        // hide Attr2
        table.columnVisibility("attr2", false);
        expect(getColspanLength()).toEqual(3);

        // hide Attr3
        table.columnVisibility("attr3", false);
        expect(getColspanLength()).toEqual(2);

        // show Attr1 even though its already visible
        table.columnVisibility("attr1", true);
        expect(getColspanLength()).toEqual(2);

        // show Attr2 and Attr 3
        table.columnVisibility("attr2", true);
        table.columnVisibility("attr3", true);
        expect(getColspanLength()).toEqual(4);
      });

      it("should raise when setting visibility to false on a column that is required", function() {
        expect(() => {
          app.view.dataTable.row("RError", {
            columns: [
              { attr: "attr5", title: "Attr5", required: true }
            ]
          });
          app.view.dataTable("TError", {
            rowClassName: "RError"
          });

          table = new app.Views.TError({ collection });
          table.render();
          table.columnVisibility("attr5", false);
        }).toThrowError(/can not disable visibility when column is required/);
      });
    });

    it("should allow columns to be reorderable by default", function() {
      const reorderableSpy = jasmine.createSpy("reorderableSpy");
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });
      app.view.dataTable("Def", {
        rowClassName: "Abc",
        _enableReorderableColumns: reorderableSpy
      });

      new app.Views.Def({ collection }).render();
      expect(reorderableSpy).toHaveBeenCalled();
    });

    it("should allow disabling of column reordering", function() {
      const reorderableSpy = jasmine.createSpy("reorderableSpy");
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });
      app.view.dataTable("Def", {
        rowClassName: "Abc",
        reorderableColumns: false,
        _enableReorderableColumns: reorderableSpy
      });

      new app.Views.Def({ collection }).render();
      expect(reorderableSpy).not.toHaveBeenCalled();
    });

    it("should default column resize to off", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });

      const table = new app.Views.Def({ collection }).render();

      expect(table.resizableColumns).toEqual(false, "Table resizableColumns default");
      expect(table._colReorder.s.allowResize).toEqual(false, "ColReorder allowResize");
      expect(table._colReorder.s.allowReorder).toEqual(true, "ColReorder allowReorder");
    });

    it("should allow columns to be resized with flag", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc",
        resizableColumns: true
      });

      const table = new app.Views.Def({ collection }).render();

      expect(table.resizableColumns).toEqual(true, "Table resizableColumns default");
      expect(table._colReorder.s.allowResize).toEqual(true, "ColReorder allowResize");
      expect(table._colReorder.s.allowReorder).toEqual(true, "ColReorder allowReorder");

      // these should set to off as they cause display issues
      expect(table._colReorder.s.bAddFixed).toEqual(false, "ColReorder bAddFixed");
      expect(table._colReorder.s.bResizeTableWrapper).toEqual(false, "ColReorder bResizeTableWrapper");
      expect(table._colReorder.s.allowHeaderDoubleClick).toEqual(false, "ColReorder allowHeaderDoubleClick");
    });

    it("should add dataTable-resizeableColumns class to resizable tables", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc",
        resizableColumns: true
      });

      const table = new app.Views.Def({ collection }).render();
      expect(table.$el.find("table").hasClass("dataTable-resizeableColumns")).toEqual(true, "Has class dataTable-resizeableColumns");
    });

    it("should not add dataTable-resizeableColumns class to non-resizable tables", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc",
        resizableColumns: false
      });

      const table = new app.Views.Def({ collection }).render();
      expect(table.$el.find("table").hasClass("dataTable-resizeableColumns")).toEqual(false, "Has class dataTable-resizeableColumns");
    });

    it("should add table-striped class to tables by default", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });

      const table = new app.Views.Def({ collection }).render();
      expect(table.$el.find("table").hasClass("table-striped")).toEqual(true, "class table-striped");
    });

    it("should not add table-striped class to tables if setting is false", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });

      app.view.dataTable("Def", {
        rowClassName: "Abc",
        striped: false
      });

      const table = new app.Views.Def({ collection }).render();
      expect(table.$el.find("table").hasClass("table-striped")).toEqual(false, "class table-striped");
    });

    it("should keep track of columns being reordered", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" },
          { attr: "location", title: "Location" },
          { attr: "bday", title: "Birthday" }
        ]
      });
      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });

      table = new app.Views.Def({ collection }).render();
      table.$el.appendTo("body");

      expect(_.pluck(table.columnsConfig(), "title")).toEqual(["Name", "Age", "Location", "Birthday"]);
      // move the Birthday column at index 3 to in front of Name column at index 0
      // note that we need to manually trigger the drag drop callback since we aren't actually dragging in the test
      table._colReorder.fnOrder([3, 0, 1, 2]);
      table._colReorder.s.dropCallback(3, 0);
      expect(_.pluck(table.columnsConfig(), "title")).toEqual(["Birthday", "Name", "Age", "Location"]);

      // ensure that our internal title to index mappings are up to date
      table.columnVisibility("name", false);
      expect(table.$("thead th").map(function() {
        return $(this).text();
      }).get()).toEqual(["Birthday", "Age", "Location"]);
    });

    describe("custom column order", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2" },
            { attr: "attr3", title: "Attr3" },
            { attr: "attr4", title: "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("should allow to change column order", function() {
        expect(_.pluck(table.columnsConfig(), "title")).toEqual(['Attr1', 'Attr2', 'Attr3', 'Attr4']);
        expect(table._columnManager._configGenerator.columnIndexById.get('attr1')).toEqual(0);

        table.columnOrder([2, 1, 3, 0]);
        expect(_.pluck(table.columnsConfig(), "title")).toEqual(['Attr3', 'Attr2', 'Attr4', 'Attr1']);
        expect(getHeaders(table)).toEqual(['Attr3', 'Attr2', 'Attr4', 'Attr1']);
        expect(table._columnManager._configGenerator.columnIndexById.get('attr1')).toEqual(3);
      });

      it("should restore column order", function() {
        table._colReorder.fnOrder([3, 0, 1, 2]);
        table._colReorder.s.dropCallback(3, 0);
        table._colReorder.fnOrder([0, 1, 3, 2]);
        table._colReorder.s.dropCallback(3, 2);
        expect(_.pluck(table.columnsConfig(), "title")).toEqual(['Attr4', 'Attr1', 'Attr3', 'Attr2']);
        expect(table._columnManager._configGenerator.columnIndexById.get('attr1')).toEqual(1);

        table.restoreColumnOrder();
        expect(_.pluck(table.columnsConfig(), "title")).toEqual(['Attr1', 'Attr2', 'Attr3', 'Attr4']);
        expect(getHeaders(table)).toEqual(['Attr1', 'Attr2', 'Attr3', 'Attr4']);
        expect(table._columnManager._configGenerator.columnIndexById.get('attr1')).toEqual(0);
      });
    });

    describe("autoscroll on dragging of columns", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2" },
            { attr: "attr3", title: "Attr3" },
            { attr: "attr4", title: "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
        $('body').append(table.$el);
        $('body').css('margin', 0);
        $('body').scrollLeft(0);
      });

      afterEach(function() {
        table.remove();
      });

      function stubDragMode(table) {
        table._colReorder.dom.drag = {
          css() {}
        };
        table._colReorder.dom.pointer = {
          css() {}
        };
      }

      function triggerMouseMoveEvent(table, options) {
        const event = jQuery.Event("mousemove.ColReorder");
        event.pageX = options.mouseX;

        // the below didn't work, so just calling the mouse move callback directly
        // $(document).trigger(event);
        table._colReorder._fnMouseMove(event);
      }

      describe("when table overflow is off - using browser scroll", function() {
        it("should scroll body right if dragging column and mouse is near right edge and more of table", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);
          expect($('body').scrollLeft()).toEqual(0);

          // make the table really wide
          table.$el.find("table").width(3000);
          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: $('body').outerWidth() - 50 });

          expect($('body').scrollLeft()).toEqual(15, "After the move event");
        });

        it("should not scroll body right if dragging column and mouse is beyond the edge buffer", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);
          expect($('body').scrollLeft()).toEqual(0);

          // make the table really wide
          table.$el.find("table").width(3000);
          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: $('body').outerWidth() - 101 });

          expect($('body').scrollLeft()).toEqual(0, "After the move event");
        });

        it("should not scroll body right if dragging column and mouse is at the edge but table is all the way in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);

          // now scroll to end of it
          $('body').scrollLeft(3000);
          const originalScroll = $('body').scrollLeft();

          expect($('body').scrollLeft()).toEqual(originalScroll, "Before the move event");

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: originalScroll + $('body').outerWidth() - 50 });

          expect($('body').scrollLeft()).toEqual(originalScroll, `After the move event should be ${originalScroll}`);
        });

        it("should scroll body left if dragging column and mouse is at the left edge and table is not all in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);
          $('body').scrollLeft(200);

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: 50 });

          expect($('body').scrollLeft()).toEqual(185, "After the move event");
        });

        it("should not scroll body left if dragging column and mouse is at the left edge and table is all in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);
          $('body').scrollLeft(0);

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: 50 });

          expect($('body').scrollLeft()).toEqual(0, "After the move event");
        });
      });

      describe("when table overflow is auto - scrollbar on table", function() {
        it("should scroll table right if dragging column and mouse is at the right edge and table is not all in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);
          const wrapper = table.$el.children("div:first");
          wrapper.css({ overflowX: "auto" });
          expect($('body').scrollLeft()).toEqual(0);
          expect(wrapper.scrollLeft()).toEqual(0);

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: $('body').outerWidth() - 50 });

          expect($('body').scrollLeft()).toEqual(0, "Don't move the window scroll");
          expect(wrapper.scrollLeft()).toEqual(15, "Should move the table wrapper scroll");
        });

        it("should not scroll table right if dragging column and mouse is at the right edge and but table is all in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);
          const wrapper = table.$el.children("div:first");
          wrapper.css({ overflowX: "auto" });
          expect($('body').scrollLeft()).toEqual(0);
          expect(wrapper.scrollLeft(3000));

          const originalScroll = wrapper.scrollLeft();

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: $('body').outerWidth() - 50 });

          expect($('body').scrollLeft()).toEqual(0, "Don't move the window scroll");
          expect(wrapper.scrollLeft()).toEqual(originalScroll, "Should move the table wrapper scroll");
        });

        it("should scroll table left if dragging column and mouse is at the left edge and table is not all in view", function() {
          expect(table._colReorder.s.allowReorder).toEqual(true);

          // make the table really wide
          table.$el.find("table").width(3000);
          const wrapper = table.$el.children("div:first");
          wrapper.css({ overflowX: "auto" });
          expect($('body').scrollLeft()).toEqual(0);
          expect(wrapper.scrollLeft(3000));

          const originalScroll = wrapper.scrollLeft();

          stubDragMode(table);
          triggerMouseMoveEvent(table, { mouseX: 50 });

          expect($('body').scrollLeft()).toEqual(0, "Don't move the window scroll");
          expect(wrapper.scrollLeft()).toEqual(originalScroll - 15, "Should move the table wrapper scroll");
        });
      });
    });

    describe("provide an interface to access the column configuration", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2" },
            { attr: "attr3", title: "Attr3" },
            { attr: "attr4", title: "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
      });

      it("should return the configuration with some additional properties", function() {
        const columnsConfig = table.columnsConfig();
        expect(columnsConfig.length).toEqual(4);

        const expectedAttrs = ["attr1", "attr2", "attr3", "attr4"];
        const expectedTitles = ["Attr1", "Attr2", "Attr3", "Attr4"];

        expect(_.pluck(columnsConfig, "attr")).toEqual(expectedAttrs);
        expect(_.pluck(columnsConfig, "title")).toEqual(expectedTitles);

        _.each(columnsConfig, c => {
          expect(c.renderer).toBeDefined();
          expect(c.nodeMatcher).toBeDefined();
        });
      });
    });

    describe("initial visibility and required property", function() {
      let columnsConfig;

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2", visible: true },
            { attr: "attr3", title: "Attr3", visible: false },
            { attr: "attr4", title: "Attr4", required: true },
            { attr: "attr5", title: "Attr5", required: false },
            { attr: "attr6", title: "Attr6", visible: false }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R"
        });

        table = new app.Views.T({ collection });
        table.render();
        columnsConfig = table.columnsConfig();
      });

      it("should default to visible and not required", function() {
        expect(_.has(columnsConfig[0], "required")).toEqual(true);
        expect(_.has(columnsConfig[0], "visible")).toEqual(true);
        expect(columnsConfig[0].required).toEqual(false);
        expect(columnsConfig[0].visible).toEqual(true);
      });

      it("should preserve the value of visible if provided", function() {
        expect(columnsConfig[1].visible).toEqual(true);
        expect(columnsConfig[2].visible).toEqual(false);
      });

      it("should preserve the value of required if provided", function() {
        expect(columnsConfig[3].required).toEqual(true);
        expect(columnsConfig[4].required).toEqual(false);
      });

      it("should throw an error if a column is not visible, but is required", function() {
        expect(() => {
          app.view.dataTable.row("RError", {
            columns: [
              { attr: "attr6", title: "Attr6", required: true, visible: false }
            ]
          });
          app.view.dataTable("TError", {
            rowClassName: "RError"
          });

          table = new app.Views.TError({ collection });
          table.render();
        }).toThrowError(/column can't be required, but not visible/);
      });

      it("should initially have certain columns hidden", function() {
        expect(table.columnVisibility("attr1")).toEqual(true);
        expect(table.columnVisibility("attr2")).toEqual(true);
        expect(table.columnVisibility("attr3")).toEqual(false);
        expect(table.columnVisibility("attr4")).toEqual(true);
        expect(table.columnVisibility("attr5")).toEqual(true);
        expect(table.columnVisibility("attr6")).toEqual(false);
      });

      it("should restore columns to their default visibility", function() {
        const defaultColumnVisibility = ["Attr1", "Attr2", "Attr4", "Attr5"];
        table.columnVisibility("attr1", false);
        table.columnVisibility("attr2", false);
        table.columnVisibility("attr3", true);
        table.columnVisibility("attr4", true);
        table.columnVisibility("attr5", false);
        expect(getHeaders(table)).toEqual(["Attr3", "Attr4"]);
        table.restoreColumnVisibility();
        expect(getHeaders(table)).toEqual(defaultColumnVisibility);
      });
    });

    it("should allow specific columns to be re rendered", function() {
      function cellsForColumn(view, attr) {
        return view.$(`tbody td.${attr}`).map(function() {
          return $.trim($(this).text());
        }).get();
      }

      app.view.dataTable.row("R", {
        columns: [
          { attr: "attr1", title: "Attr1", visible: true },
          { attr: "attr2", title: "Attr2", visible: false },
          { attr: "attr3", title: "Attr3", visible: true },
          { attr: "attr4", title: "Attr4", visible: false }
        ]
      });
      app.view.dataTable("T", {
        rowClassName: "R",
        sorting: [["attr1", "asc"]]
      });

      collection.add([
        { attr1: "A1", attr2: "A2", attr3: "A3", attr4: "A4" },
        { attr1: "B1", attr2: "B2", attr3: "B3", attr4: "B4" },
        { attr1: "C1", attr2: "C2", attr3: "C3", attr4: "C4" },
        { attr1: "D1", attr2: "D2", attr3: "D3", attr4: "D4" }
      ]);
      table = new app.Views.T({ collection });
      table.render();

      // enable columns that were hidden when initially rendered, which should now be populated
      table.columnVisibility("attr2", true);
      table.columnVisibility("attr4", true);
      expect(cellsForColumn(table, "column-attr2")).toEqual(["A2", "B2", "C2", "D2"]);
      expect(cellsForColumn(table, "column-attr4")).toEqual(["A4", "B4", "C4", "D4"]);

      // remove some content
      table.$("tbody td.column-attr2").html("");
      table.renderColumn("attr2");
      expect(cellsForColumn(table, "column-attr2")).toEqual(["A2", "B2", "C2", "D2"]);
    });

    describe("truncating columns", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns: [
            { attr: "attr1", title: "Attr1" },
            { attr: "attr2", title: "Attr2" },
            { attr: "attr3", title: "Attr3" },
            { attr: "attr4", title: "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName: "R",
          resizableColumns: true
        });

        table = new app.Views.T({ collection });
        table.render();
        $('body').append(table.$el);
      });

      afterEach(function() {
        table.remove();
      });

      function stubResizeMode(table) {
        table._colReorder.dom.drag = {
          css() {}
        };
        table._colReorder.dom.pointer = {
          css() {}
        };
        table._colReorder.dom.resize = true;
        table._colReorder.s.mouse.resizeElem = $('thead th').get(0);
        table._colReorder.s.mouse.startWidth = $('thead th').innerWidth();
        table._colReorder.s.mouse.startX = 0;
      }

      function triggerMouseMoveEvent(table, options) {
        const event = jQuery.Event("mousemove.ColReorder");
        event.pageX = options.mouseX;

        // the below didn't work, so just calling the mouse move callback directly
        // $(document).trigger(event);
        table._colReorder._fnMouseMove(event);
      }

      it("should set truncate columns flag to true by default", function() {
        expect(table._colReorder.s.allowResize).toEqual(true, "ColReorder allowResize");
        expect(table._colReorder.s.bTruncateHeaders).toEqual(true, "ColReorder bTruncateHeaders");
      });

      it("should apply css to all columns to allow for truncate if also allowed to resize columns", function() {
        const interceptors = table.$el.find("thead th div.DataTables_sort_interceptor");

        expect(interceptors.length).toEqual(4);
        interceptors.each(function() {
          expect($(this).attr('style')).toEqual("text-overflow: ellipsis; white-space: nowrap; overflow: hidden;");
        });
      });

      it("should not apply truncate css if not allowed to resize columns", function() {
        table.remove();

        app.view.dataTable("T", {
          rowClassName: "R",
          resizableColumns: false
        });

        table = new app.Views.T({ collection });
        table.render();
        $('body').append(table.$el);

        expect(table._colReorder.s.allowResize).toEqual(false, "ColReorder allowResize");
        expect(table._colReorder.s.bTruncateHeaders).toEqual(true, "ColReorder bTruncateHeaders");
        const interceptors = table.$el.find("thead th div.DataTables_sort_interceptor");

        expect(interceptors.length).toEqual(4);
        interceptors.each(function() {
          expect($(this).attr('style')).toEqual(undefined);
        });
      });

      it("should set the max width to the DataTables_sort_interceptor on resize", function() {
        const startWidth = $('thead th').innerWidth();

        stubResizeMode(table);
        triggerMouseMoveEvent(table, { mouseX: -10 });
        const endWidth = startWidth - 10;
        expect(parseInt($('thead th .DataTables_sort_interceptor').css('max-width'))).toEqual(endWidth, "max-width equal to new width of column (startWidth - 10)");
      });

      it("should remove padding between the sort interceptor and column", function() {
        const column = $('thead th');
        column.css("padding-right", "10px");
        const startWidth = column.innerWidth();

        stubResizeMode(table);
        triggerMouseMoveEvent(table, { mouseX: -10 });
        const endWidth = startWidth - 20;
        expect(parseInt($('thead th .DataTables_sort_interceptor').css('max-width'))).toEqual(endWidth, "max-width equal to new width of column minus the padding (startWidth - 10 - 10)");
      });

      it("should allow the DataTables_sort_interceptor to overflow", function() {
        stubResizeMode(table);
        triggerMouseMoveEvent(table, { mouseX: -30 });
        const interceptor = $('thead th .DataTables_sort_interceptor');
        expect(interceptor.get(0).scrollWidth > interceptor.width()).toEqual(true, "has overflow");
      });

      it("should respect min resize width on the sort interceptor", function() {
        stubResizeMode(table);
        triggerMouseMoveEvent(table, { mouseX: -3000 });
        const interceptor = $('thead th .DataTables_sort_interceptor');
        expect(parseInt(interceptor.css('max-width'))).toEqual(table._colReorder.s.minResizeWidth + 1, "respect min resize width");
      });
    });
  });

  describe("sorting", function() {
    function cellsByIndex(table, index) {
      return table.$(`tbody td:nth-child(${index + 1})`).map(function() {
        return $(this).text();
      }).get();
    }

    beforeEach(function() {
      app.view.dataTable.row("R", {
        columns: [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" },
          { attr: "zip", title: "Zip" }
        ]
      });

      collection.reset([
        { name: "Zebra", age: 1, zip: 90000 },
        { name: "Bob", age: 10, zip: 10000 },
        { name: "Joe", age: 8, zip: 33333 }
      ]);
    });

    it("should allow sorting to be provided using column index", function() {
      app.view.dataTable("ByIndex2", {
        rowClassName: "R",
        // zip ascending
        sorting: [[2, "asc"]]
      });

      table = new app.Views.ByIndex2({ collection }).render();
      expect(cellsByIndex(table, 2)).toEqual(["10000", "33333", "90000"]);

      app.view.dataTable("ByIndex1", {
        rowClassName: "R",
        // age descending
        sorting: [[1, "desc"]]
      });

      table = new app.Views.ByIndex1({ collection }).render();
      expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
    });

    it("should allow sorting to be provided using column attr", function() {
      app.view.dataTable("ByZip", {
        rowClassName: "R",
        // zip ascending
        sorting: [["zip", "asc"]]
      });

      table = new app.Views.ByZip({ collection }).render();
      expect(cellsByIndex(table, 2)).toEqual(["10000", "33333", "90000"]);

      app.view.dataTable("ByAge", {
        rowClassName: "R",
        // age descending
        sorting: [["age", "desc"]]
      });

      table = new app.Views.ByAge({ collection }).render();
      expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
    });

    describe("change sorting", function() {
      it("should allow to change sorting before table is rendered", function() {
        app.view.dataTable("ByIndex2", {
          rowClassName: "R",
          sorting: [[2, "asc"]]
        });

        table = new app.Views.ByIndex2({ collection });
        table.changeSorting([['age', 'asc']]);
        table.render();
        expect(cellsByIndex(table, 1)).toEqual(["1", "8", "10"]);
      });

      it("should allow to change sorting after table is rendered", function() {
        app.view.dataTable("ByIndex2", {
          rowClassName: "R",
          sorting: [[2, "asc"]]
        });

        table = new app.Views.ByIndex2({ collection }).render();
        expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
        spyOn(table.dataTable, 'fnSort').and.callThrough();
        table.changeSorting([['age', 'asc']]);
        expect(table.dataTable.fnSort).toHaveBeenCalled();
        expect(cellsByIndex(table, 1)).toEqual(["1", "8", "10"]);
      });

      it("should not re-sort table when sorting is unchanged", function() {
        app.view.dataTable("ByIndex2", {
          rowClassName: "R",
          sorting: [[2, "asc"]]
        });

        table = new app.Views.ByIndex2({ collection }).render();
        expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
        spyOn(table.dataTable, 'fnSort').and.callThrough();
        table.changeSorting([[2, "asc"]]);
        expect(table.dataTable.fnSort).not.toHaveBeenCalled();
      });
    });
  });

  describe("locking/unlocking controls", function() {
    beforeEach(function() {
      app.view.dataTable.row("R", {
        columns: [
          { bulk: true },
          { attr: "name", title: "Name" }
        ]
      });
      app.view.dataTable("LockUnlock", {
        rowClassName: "R",
        sorting: [[1, "desc"]]
      });
      collection.add([{ name: "A" }, { name: "B" }, { name: "C" }]);
      table = new app.Views.LockUnlock({ collection }).render();
    });

    it("should work for pagination ui", function() {
      table.lock("page", true);
      expect(table.$(".dataTables_length").css("visibility")).toEqual("hidden");
      expect(table.$(".dataTables_paginate").css("visibility")).toEqual("hidden");
      expect(table.lock("page")).toEqual(true);
      table.lock("page", false);
      expect(table.$(".dataTables_length").css("visibility")).toEqual("visible");
      expect(table.$(".dataTables_paginate").css("visibility")).toEqual("visible");
      expect(table.lock("page")).toEqual(false);
    });

    it("should work for pagination api", function() {
      table.lock("page", true);
      expect(() => {
        table.page("next");
      }).toThrowError(/pagination is locked/);

      table.lock("page", false);
      expect(() => {
        table.page("next");
      }).not.toThrow();
    });

    it("should work for sorting ui", function() {
      function getCells() {
        return table.$("tbody td.column-name").map(function() {
          return $(this).text();
        }).get();
      }
      expect(getCells()).toEqual(["C", "B", "A"]);
      table.lock("sort", true);
      table.$("thead th.column-name .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(getCells()).toEqual(["C", "B", "A"]);
      table.lock("sort", false);
      table.$("thead th.column-name .DataTables_sort_wrapper .DataTables_sort_interceptor").click();
      expect(getCells()).toEqual(["A", "B", "C"]);
    });

    it("should work for sorting api", function() {
      table.lock("sort", true);
      expect(() => {
        table.sort([[0, "asc"]]);
      }).toThrowError(/sorting is locked/);

      table.lock("sort", false);
      expect(() => {
        table.sort([[0, "asc"]]);
      }).not.toThrow();
    });

    it("should work for filter ui", function() {
      table.lock("filter", true);
      expect(table.$(".dataTables_filter").css("visibility")).toEqual("hidden");
      expect(table.lock("filter")).toEqual(true);
      table.lock("filter", false);
      expect(table.$(".dataTables_filter").css("visibility")).toEqual("visible");
      expect(table.lock("filter")).toEqual(false);
    });

    it("should work for filter api", function() {
      table.lock("filter", true);
      expect(() => {
        table.filter("stuff");
      }).toThrowError(/filtering is locked/);

      table.lock("filter", false);
      expect(() => {
        table.filter("stuff");
      }).not.toThrow();
    });

    it("should work for bulk ui", function() {
      expect(table.$(":checkbox:disabled").length).toEqual(0);
      table.lock("bulk", true);
      expect(table.$(":checkbox:disabled").length).toEqual(4);
      table.lock("bulk", false);
      expect(table.$(":checkbox:disabled").length).toEqual(0);
    });

    it("should work for bulk api", function() {
      table.lock("bulk", true);
      expect(() => {
        table.selectedModels();
      }).toThrowError(/bulk selection is locked/);
      expect(() => {
        table.selectAllVisible(true);
      }).toThrowError(/bulk selection is locked/);
      expect(() => {
        table.selectAllMatching();
      }).toThrowError(/bulk selection is locked/);
      expect(() => {
        table.matchingCount();
      }).toThrowError(/bulk selection is locked/);

      table.lock("bulk", false);
      expect(() => {
        table.selectedModels();
      }).not.toThrow();
      expect(() => {
        table.selectAllVisible(true);
      }).not.toThrow();
      expect(() => {
        table.selectAllMatching();
      }).not.toThrow();
      expect(() => {
        table.matchingCount();
      }).not.toThrow();
    });
  });

  describe("totalRecordsCount", function() {
    it("should return total number of records across all pages", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "id", title: "Id" }
        ]
      });
      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });
      const data = _.map(_.range(1, 100), id => ({
        id
      }));
      const table = new app.Views.Def({ collection }).render();
      expect(table.totalRecordsCount()).toEqual(0);
      collection.reset(data);
      expect(table.totalRecordsCount()).toEqual(99);
    });
  });

  describe("pageLimit", function() {
    it("should get the current page limit selection from fnSettings", function() {
      app.view.dataTable.row("Abc", {
        columns: [
          { attr: "id", title: "Id" }
        ]
      });
      app.view.dataTable("Def", {
        rowClassName: "Abc"
      });

      const table = new app.Views.Def({ collection }).render();
      table.dataTable.fnSettings()._iDisplayLength = 50;
      expect(table.pageLimit()).toEqual(50);
    });
  });
});
