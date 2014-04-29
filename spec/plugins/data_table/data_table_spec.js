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
      app.view.dataTable.row("abc", {});
      app.view.dataTable("def", {
        rowClassName : "abc"
      });
      expect(new app.Views.abc()).toEqual(jasmine.any(baseExports.View));
      expect(new app.Views.def({ collection : collection })).toEqual(jasmine.any(baseExports.View));
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

  describe("Local data store", function() {

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

    });

    describe("pagination", function() {

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

    describe("select all", function() {

      var data;

      beforeEach(function() {
        data = [];
        for (var iter = 0; iter < 100; ++iter) {
          data.push({ name : "hi " + iter });
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
        
        it("should only select models that are not filtered out", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(table.selectedModels().length).toEqual(0);
          table.selectAll(true)
          expect(table.selectedModels().length).toEqual(data.length);

          collection.add({ name : "monkey "});
          collection.add({ name : "monkey and more "});

          table.filter("monkey");
          table.selectAll(true)
          expect(table.selectedModels().length).toEqual(2);
        });

        it("should throw an exception if #selectAllComplete is called", function() {
          table = new app.Views.T({ collection : collection });
          expect(function() {
            table.selectAllComplete();            
          }).toThrowError("#selectAllComplete cannot be used when pagination is disabled");

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

          table.filter("hi 2")
          table.selectAll(true);
          expect(table.selectedModels().length).toEqual(10);
        });

        it("should select models that are not filtered out from all pages when calling #selectAllComplete", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          expect(table.selectedModels().length).toEqual(0);

          table.filter("hi 2");
          table.selectAll(true);
          table.selectAllComplete();
          expect(table.selectedModels().length).toEqual(19);
        });

        it("should throw an exception if selectAllComplete is called when there are no more paginated results", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.filter("hi 21");
          table.selectAll(true);

          // there is 1 page of results
          expect(table.selectedModels().length).toEqual(1);
          expect(function() {
            table.selectAllComplete();
          }).toThrowError("#selectAllComplete cannot be used when there are no additional paginated results");

          table.filter("not gonna find me");
          table.selectAll(true);

          // there are 0 pages of results
          expect(table.selectedModels().length).toEqual(0);
          expect(function() {
            table.selectAllComplete();
          }).toThrowError("#selectAllComplete cannot be used when there are no additional paginated results");

        });

      });

    });

  });

});



