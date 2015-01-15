describe("DataTable Plugin", function() {
  var app;
  var baseExports;
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
    baseExports = Backdraft.plugin("Base");
  });

  describe("factories and constructors", function() {
    it("should expose #dataTable and #dataTable.row", function() {
      app.view.dataTable.row("abc", { columns : [] });
      app.view.dataTable("def", {
        rowClassName : "abc"
      });
      expect(new app.Views.abc()).toEqual(jasmine.any(baseExports.View));
      expect(new app.Views.def({ collection : collection })).toEqual(jasmine.any(baseExports.View));
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
          { bulk : "true" },
          { attr : "name", title : "I came from a rowClass argument" }
        ]
      });
      app.view.dataTable("def", { });
      table = new app.Views.def({ collection: collection, rowClass: app.Views.abc });

      expect(table.columns.length).toEqual(2);
      expect(table.columns[0].bulk).toEqual("true");
      expect(table.columns[1].title).toEqual("I came from a rowClass argument");
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
            { bulk : "true" }
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
            { bulk : "true" }
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
              { bulk : "true" }
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
            return { bulk : "true" };
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

    describe("visibility", function() {
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

      function getHeaders() {
        return table.$("thead tr th").map(function() {
          return $(this).text();
        }).get();
      }

      function getVisibilities() {
        var titles = _.pluck(table.columns, "title");
        return _.map(titles, function(title) {
          return table.columnVisibility(title);
        });
      }

      function getColspanLength() {
        return parseInt(table.$(".dataTables_empty").attr("colspan"), 10);
      }

      it("is able to modify visibility", function() {
        // initially all columns are visible
        expect(getHeaders()).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);

        // hide Attr2
        table.columnVisibility("Attr2", false);
        expect(getHeaders()).toEqual(["Attr1", "Attr3", "Attr4"]);

        // hide Attr3
        table.columnVisibility("Attr3", false);
        expect(getHeaders()).toEqual(["Attr1", "Attr4"]);

        // show Attr1 even though its already visible
        table.columnVisibility("Attr1", true);
        expect(getHeaders()).toEqual(["Attr1", "Attr4"]);

        // show Attr2 and Attr 3
        table.columnVisibility("Attr2", true);
        table.columnVisibility("Attr3", true);
        expect(getHeaders()).toEqual(["Attr1", "Attr2", "Attr3", "Attr4"]);
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
});
