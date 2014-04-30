describe("DataTable Plugin", function() {

  var app;
  var baseExports;
  var collection;

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

  describe("factories", function() {

    it("should expoose #dataTable and #dataTable.row", function() {
      app.view.dataTable.row("abc", {columns: []});
      app.view.dataTable("def", {
        rowClassName : "abc"
      });
      expect(new app.Views.abc()).toEqual(jasmine.any(baseExports.View));
      expect(new app.Views.def({ collection : collection })).toEqual(jasmine.any(baseExports.View));
    });

  });

  describe("rendering", function() {

    describe("collection changes", function() {

      var table;

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

      describe("collection is reset", function() {

        beforeEach(function() {
          collection.reset([ { name : "Bob" }, { name : "Joe" } ]);
        });

        it("should render a view for every single model in the collection", function() {
          var rows = table.$("tbody tr");
          expect(rows.length).toEqual(2);
          expect(rows.eq(0).find("td").html()).toEqual("Bob");
          expect(rows.eq(1).find("td").html()).toEqual("Joe");
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

    describe("renderers", function() {

      var table;

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

      describe("column picker", function(){
        beforeEach(function(){
          app.view.dataTable.row("R", {
            columns: [
              { bulk: true },
              { attr: "name", title: "Name" },
              { columnPicker: true }
            ]
          });
          app.view.dataTable("T", {
            rowClassName: "R"
          });
          collection.add({name: 'Test'});
          table = new app.Views.T({ collection : collection });
          table.render();
        });

        it("should add a column picker to the datatable", function(){
          expect(table.$('#column_picker').length).toBeGreaterThan(0);
        });

        it("it should toggle a column visibility when clicked", function(){
          expect(table.$('th.Name').length).toBeGreaterThan(0);
          // Toggle column
          table.$('.column-picker').click();
          expect(table.$('th.Name').length).toBe(0);
          // Toggle it back on
          table.$('.column-picker').click();
          expect(table.$('th.Name').length).toBeGreaterThan(0);
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
      });

      describe("user defined", function() {

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

        it("should insert a checkbox", function() {
          collection.add({ age_value : 30 });
          var cells = table.$("tbody td");
          expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
          expect(cells.eq(1).hasClass("age")).toEqual(true);
          expect(cells.eq(1).text()).toEqual("30");
        });

      });

    });

  });

});