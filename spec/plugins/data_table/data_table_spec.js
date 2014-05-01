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

    describe("bulk selection", function() {

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
        
        it("should not unselect models that are filtered out", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(table.selectedModels().length).toEqual(0);
          table.selectAll(true)
          expect(table.selectedModels().length).toEqual(data.length);

          collection.add({ name : "monkey "});
          collection.add({ name : "monkey and more "});

          table.filter("monkey");
          table.selectAll(true);
          expect(table.selectedModels().length).toEqual(data.length + 2);
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
          table.selectAll(true);

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
          table.selectAll(true);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("page", function() {
            _.defer(function() {
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
              done()
            });
          });

          table.changePage("next");
        });

        it("should check the header bulk checkbox when a page transitions and the next page has all rows already selected", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.selectAll(true);
          table.changePage("next");
          table.selectAll(true);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("page", function() {
            _.defer(function() {
              table.changePage("previous");
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
            });
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

        it("should not expose #selectAllComplete", function() {
          table = new app.Views.T({ collection : collection });
          expect(table.selectAllComplete).toBeUndefined();
        });

        it("should check/uncheck the header bulk checkbox when #selectAll is called", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
          table.selectAll(true);
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
          table.selectAll(false);
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        });
        
        it("should uncheck the header bulk checkbox when a row's checkbox is unchecked", function() {
          table = new app.Views.T({ collection : collection });
          // need to append to body in order to do clicks on checkboxes
          $("body").append(table.render().$el);

          table.selectAll(true)

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        });

        it("should uncheck the header bulk checkbox when a filter is applied and the result set doesn't have all rows already selected", function(done) {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.filter("89");
          table.selectAll(true);

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
          table.selectAll(true);

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
          table.selectAll(true);
          expect(table.$(".backdraft-selected").length).toEqual(data.length);

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$(".backdraft-selected").length).toEqual(data.length - 1);
        });

      });

    });

  });

});



