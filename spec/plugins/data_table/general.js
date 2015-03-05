describe("DataTable Plugin", function() {
  var app;
  var baseExports;
  var collection;
  var table;

  function getHeaders(table) {
    return table.$("thead tr th").map(function() {
      return $(this).text();
    }).get();
  }

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
    baseExports = Backdraft.plugin("Base");
  });

  describe("factories and constructors", function() {
    it("should expose #dataTable and #dataTable.row", function() {
      app.view.dataTable.row("abc", { columns : [] });
      app.view.dataTable("def", {
        rowClassName : "abc"
      });
      expect(new app.Views.abc({ columnsConfig: [] })).toEqual(jasmine.any(baseExports.View));
      expect(new app.Views.def({ collection: collection })).toEqual(jasmine.any(baseExports.View));
    });

    it("should allow rows to be subclassed", function() {
      app.view.dataTable.row("abc", {
        baseMethod : function() {
          return "i am base";
        }
      });

      app.view.dataTable.row("new_abc", "abc", {
        baseMethod : function() {
          return "i am the new base";
        }
      });

      expect(app.Views.new_abc.prototype.baseMethod()).toEqual("i am the new base");
    });

    it("should allow tables to be subclassed", function() {
      app.view.dataTable.row("abc", { columns : [] });
      app.view.dataTable("def", {
        rowClassName : "abc",
        baseMethod : function() {
          return "i am base";
        }
      });
      app.view.dataTable("new_def", "def", {
        baseMethod : function() {
          return "i am the new base";
        }
      });

      expect(app.Views.new_def.prototype.baseMethod()).toEqual("i am the new base");
    });

    it("should allow rowClass to be provided as an argument instad of rowClassName", function() {
      app.view.dataTable.row("abc", {
        columns : [
          { attr : "name", title : "I came from a rowClass argument" }
        ]
      });
      app.view.dataTable("def", { });
      table = new app.Views.def({ collection: collection, rowClass: app.Views.abc }).render();
      expect(getHeaders(table)).toEqual(["I came from a rowClass argument"]);
    });
  });

  describe("renderers", function() {
    describe("attr based", function() {
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

      it("should not insert them as html", function() {
        collection.add({ name : "<b>hihi</b>" });
        expect(table.$("tbody tr td:first").html()).toEqual("&lt;b&gt;hihi&lt;/b&gt;");
      });
    });

    describe("bulk", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { bulk : true }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("should insert a checkbox", function() {
        collection.add({});
        expect(table.$("tbody tr td:first :checkbox").length).toEqual(1);
      });
    });

    describe("user defined by title matching", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { title : "Name" },
            { title : "Age", attr : "age_value" }
          ],
          renderers : {
            // pure html, not based on model
            "Name" : function(node, config) {
              node.html('<a href="#">I AM LINK</a>');
            },
            "Age" : function(node, config) {
              node.addClass("age").text(this.model.get(config.attr));
            }
          }
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("invoke them correctly", function() {
        collection.add({ age_value : 30 });
        var cells = table.$("tbody td");
        expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
        expect(cells.eq(1).hasClass("age")).toEqual(true);
        expect(cells.eq(1).text()).toEqual("30");
      });
    });

    describe("user defined by config renderer property", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            {
              title : "Name",
              renderer: function(node, config) {
                node.html('<a href="#">I AM LINK</a>');
              }
            },
            {
              title : "Age",
              attr : "age_value",
              renderer: function(node, config) {
                node.addClass("age").text(this.model.get(config.attr));
              }
            }
          ]
        });

        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("invoke them correctly", function() {
        collection.add({ age_value : 30 });
        var cells = table.$("tbody td");
        expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
        expect(cells.eq(1).hasClass("age")).toEqual(true);
        expect(cells.eq(1).text()).toEqual("30");
      });
    });

    describe("subclassed renderers", function() {
      beforeEach(function() {
        app.view.dataTable.row("abc", {
          renderers: {
            "Monkey": function(node, config) {
              return "Monkey";
            },
            "Chicken": function(node, config) {
              return "Chicken";
            }
          }
        });
      });

      it("should inherit renderers when a subclass does not provide a renderers property", function() {
        app.view.dataTable.row("new_abc", "abc", {
        });

        expect(app.Views.new_abc.prototype.renderers["Monkey"]()).toEqual("Monkey");
        expect(app.Views.new_abc.prototype.renderers["Chicken"]()).toEqual("Chicken");
      });

      it("should inherit renderers when a subclass does provide a renderers property", function() {
        app.view.dataTable.row("new_abc", "abc", {
          renderers: {
            "Zebra": function(node, config) {
              return "Zebra";
            },
            "Monkey": function(node, config) {
              return "OVERRIDE Monkey";
            }
          }
        });

        expect(app.Views.new_abc.prototype.renderers["Zebra"]()).toEqual("Zebra");
        expect(app.Views.new_abc.prototype.renderers["Monkey"]()).toEqual("OVERRIDE Monkey");
        expect(app.Views.new_abc.prototype.renderers["Chicken"]()).toEqual("Chicken");
      });
    });
  });

  describe("columns", function(){
    it("can only be provided as an array or a function that returns an array", function(){
      var passingArray = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : [
            { bulk : true }
          ]
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      var passingFn = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : function() {
            return [
              { bulk : true }
            ];
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      var failing = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : function() {
            return { bulk : true };
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      expect(passingArray).not.toThrow();
      expect(passingFn).not.toThrow();
      expect(failing).toThrow();
    });

    it("should allow columns to provide a #present method controlling whether they are included", function() {
      var yes = function() {
        return true;
      };
      var no = function() {
        return false;
      };
      app.view.dataTable.row("R", {
        columns : [
          { attr : "attr1", title : "Attr1", present: yes },
          { attr : "attr2", title : "Attr2", present: no },
          { attr : "attr3", title : "Attr3", present: no },
          { attr : "attr4", title : "Attr4", present: yes },
          { attr : "attr5", title : "Attr5" }
        ]
      });
      app.view.dataTable("T", {
        rowClassName : "R"
      });

      table = new app.Views.T({ collection : collection });
      table.render();

      expect(getHeaders(table)).toEqual(["Attr1", "Attr4", "Attr5"]);
    })

    describe("getting and setting visibility", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "attr1", title : "Attr1" },
            { attr : "attr2", title : "Attr2" },
            { attr : "attr3", title : "Attr3" },
            { attr : "attr4", title : "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      function getVisibilities() {
        return _.map(["Attr1", "Attr2", "Attr3", "Attr4"], function(title) {
          return table.columnVisibility(title);
        });
      }

      function getColspanLength() {
        return parseInt(table.$(".dataTables_empty").attr("colspan"), 10);
      }

      it("is able to modify visibility", function() {
        // initially all columns are visible
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);

        // hide Attr2
        table.columnVisibility("Attr2", false);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr3", "Attr4"]);

        // hide Attr3
        table.columnVisibility("Attr3", false);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr1 even though its already visible
        table.columnVisibility("Attr1", true);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr4"]);

        // show Attr2 and Attr 3
        table.columnVisibility("Attr2", true);
        table.columnVisibility("Attr3", true);
        expect(getHeaders(table)).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);
      });

      it("returns the current visibility", function() {
        // initially all columns are visible
        expect(getVisibilities()).toEqual([true, true, true, true]);

        // hide Attr2
        table.columnVisibility("Attr2", false);
        expect(getVisibilities()).toEqual([true, false, true, true]);

        // hide Attr3
        table.columnVisibility("Attr3", false);
        expect(getVisibilities()).toEqual([true, false, false, true]);

        // show Attr1 even though its already visible
        table.columnVisibility("Attr1", true);
        expect(getVisibilities()).toEqual([true, false, false, true]);

        // show Attr2 and Attr 3
        table.columnVisibility("Attr2", true);
        table.columnVisibility("Attr3", true);
        expect(getVisibilities()).toEqual([true, true, true, true]);
      });

      it("adjusts the colspan of the empty message to match visible columns", function() {
        // initially all columns are visible
        expect(getColspanLength()).toEqual(4);

        // hide Attr2
        table.columnVisibility("Attr2", false);
        expect(getColspanLength()).toEqual(3);

        // hide Attr3
        table.columnVisibility("Attr3", false);
        expect(getColspanLength()).toEqual(2);

        // show Attr1 even though its already visible
        table.columnVisibility("Attr1", true);
        expect(getColspanLength()).toEqual(2);

        // show Attr2 and Attr 3
        table.columnVisibility("Attr2", true);
        table.columnVisibility("Attr3", true);
        expect(getColspanLength()).toEqual(4);
      });
    });

    it("should allow columns to be reorderable", function() {
      var reorderableSpy = jasmine.createSpy("reorderableSpy");
      app.view.dataTable.row("abc", {
        columns : [
          { attr: "name", title: "Name" },
          { attr: "age", title: "Age" }
        ]
      });
      app.view.dataTable("def", {
        rowClassName : "abc",
        reorderableColumns: true,
        _enableReorderableColumns: reorderableSpy
      });

      new app.Views.def({ collection : collection }).render();
      expect(reorderableSpy).toHaveBeenCalled();
    });

    describe("provide an interface to access the column configuration", function() {
      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "attr1", title : "Attr1" },
            { attr : "attr2", title : "Attr2" },
            { attr : "attr3", title : "Attr3" },
            { attr : "attr4", title : "Attr4" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("should return the configuration with some additional properties", function() {
        var columnsConfig = table.columnsConfig();
        expect(columnsConfig.length).toEqual(4);

        var expectedAttrs = ["attr1", "attr2", "attr3", "attr4"];
        var expectedTitles = ["Attr1", "Attr2", "Attr3", "Attr4"];

        expect(_.pluck(columnsConfig, "attr")).toEqual(expectedAttrs);
        expect(_.pluck(columnsConfig, "title")).toEqual(expectedTitles);

        _.each(columnsConfig, function(c) {
          expect(c.renderer).toBeDefined();
          expect(c.nodeMatcher).toBeDefined();
        });
      });
    });

    describe("initial visibility and required property", function() {
      var columnsConfig;

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "attr1", title : "Attr1" },
            { attr : "attr2", title : "Attr2", visible: true },
            { attr : "attr3", title : "Attr3", visible: false },
            { attr : "attr4", title : "Attr4", required: true },
            { attr : "attr5", title : "Attr5", required: false }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
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
        expect(function() {
          app.view.dataTable.row("RError", {
            columns : [
              { attr : "attr6", title : "Attr6", required: true, visible: false },
            ]
          });
          app.view.dataTable("TError", {
            rowClassName : "RError"
          });

          table = new app.Views.TError({ collection : collection });
          table.render();
        }).toThrowError(/column can't be required, but not visible/);
      });
    });
  });

  describe("sorting", function() {
    function cellsByIndex(table, index) {
      return table.$("tbody td:nth-child(" + (index + 1) + ")").map(function() {
        return $(this).text();
      }).get();
    }

    beforeEach(function() {
      app.view.dataTable.row("R", {
        columns : [
          { attr : "name", title : "Name" },
          { attr : "age",  title : "Age" },
          { attr : "zip",  title : "Zip" }
        ]
      });

      collection.reset([
        { name: "Zebra", age: 1,  zip: 90000 },
        { name: "Bob",   age: 10, zip: 10000 },
        { name: "Joe",   age: 8,  zip: 33333 }
      ]);
    });

    it("should allow sorting to be provided using column index", function() {
      app.view.dataTable("ByIndex2", {
        rowClassName : "R",
        // zip ascending
        sorting: [ [ 2, "asc" ] ]
      });

      table = new app.Views.ByIndex2({ collection : collection }).render();
      expect(cellsByIndex(table, 2)).toEqual(["10000", "33333", "90000"]);

      app.view.dataTable("ByIndex1", {
        rowClassName : "R",
        // age descending
        sorting: [ [ 1, "desc" ] ]
      });

      table = new app.Views.ByIndex1({ collection : collection }).render();
      expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
    });

    it("should allow sorting to be provided using column name", function() {
      app.view.dataTable("ByZip", {
        rowClassName : "R",
        // zip ascending
        sorting: [ [ "Zip", "asc" ] ]
      });

      table = new app.Views.ByZip({ collection : collection }).render();
      expect(cellsByIndex(table, 2)).toEqual(["10000", "33333", "90000"]);

      app.view.dataTable("ByAge", {
        rowClassName : "R",
        // age descending
        sorting: [ [ "Age", "desc" ] ]
      });

      table = new app.Views.ByAge({ collection : collection }).render();
      expect(cellsByIndex(table, 1)).toEqual(["10", "8", "1"]);
    });
  });

  describe("locking/unlocking controls", function() {
    beforeEach(function() {
      app.view.dataTable.row("R", {
        columns : [
          { bulk: true },
          { attr : "name", title : "Name" }
        ]
      });
      app.view.dataTable("LockUnlock", {
        rowClassName : "R",
        sorting: [[1, "desc"]]
      });
      collection.add([ { name: "A" }, { name: "B"}, { name: "C" } ]);
      table = new app.Views.LockUnlock({ collection : collection }).render();
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
      expect(function() {
        table.page("next");
      }).toThrowError(/pagination is locked/);

      table.lock("page", false);
      expect(function() {
        table.page("next");
      }).not.toThrow();
    });

    it("should work for sorting ui", function() {
      function getCells() {
        return table.$("tbody td.Name").map(function() {
          return $(this).text()
        }).get();
      }
      expect(getCells()).toEqual(["C", "B", "A"]);
      table.lock("sort", true);
      table.$("thead th.Name").click();
      expect(getCells()).toEqual(["C", "B", "A"]);
      table.lock("sort", false);
      table.$("thead th.Name").click();
      expect(getCells()).toEqual(["A", "B", "C"]);
    });

    it("should work for sorting api", function() {
      table.lock("sort", true);
      expect(function() {
        table.sort([ [0,"asc"] ]);
      }).toThrowError(/sorting is locked/);

      table.lock("sort", false);
      expect(function() {
        table.sort([ [0,"asc"] ]);
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
      expect(function() {
        table.filter("stuff");
      }).toThrowError(/filtering is locked/);

      table.lock("filter", false);
      expect(function() {
        table.filter("stuff");
      }).not.toThrow();
    });

    it("should work for bulk ui", function() {
      expect(table.$(":checkbox:disabled").length).toEqual(0)
      table.lock("bulk", true);
      expect(table.$(":checkbox:disabled").length).toEqual(4)
      table.lock("bulk", false);
      expect(table.$(":checkbox:disabled").length).toEqual(0)
    });

    it("should work for bulk api", function() {
      table.lock("bulk", true);
      expect(function() {
        table.selectedModels();
      }).toThrowError(/bulk selection is locked/);
      expect(function() {
        table.selectAllVisible(true);
      }).toThrowError(/bulk selection is locked/);
      expect(function() {
        table.selectAllMatching();
      }).toThrowError(/bulk selection is locked/);
      expect(function() {
        table.matchingCount();
      }).toThrowError(/bulk selection is locked/);

      table.lock("bulk", false);
      expect(function() {
        table.selectedModels();
      }).not.toThrow()
      expect(function() {
        table.selectAllVisible(true);
      }).not.toThrow()
      expect(function() {
        table.selectAllMatching();
      }).not.toThrow()
      expect(function() {
        table.matchingCount();
      }).not.toThrow()
    });

  });
});
