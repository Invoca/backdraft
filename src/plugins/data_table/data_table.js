Backdraft.plugin("DataTable", function(plugin) {

  {%= inline("src/plugins/data_table/row.js") %}
  {%= inline("src/plugins/data_table/table.js") %}

  plugin.initializer(function(app) {

    app.view.dataTable = function(name, properties) {
      app.Views[name] = Table.extend(properties);
      Table.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, properties) {
      app.Views[name] = Row.extend(properties);
      Row.finalize(name, app.Views[name], app.Views);
    }
  });

});