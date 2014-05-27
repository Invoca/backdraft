Backdraft.plugin("DataTable", function(plugin) {

  function cidMap(collection) {
    return collection.map(function(model) {
      return { cid : model.cid };
    });
  }

  {%= inline("src/plugins/data_table/bootstrap.js") %}
  {%= inline("src/plugins/data_table/row.js") %}
  {%= inline("src/plugins/data_table/data_table.js") %}
  {%= inline("src/plugins/data_table/server_side_data_table.js") %}

  plugin.initializer(function(app) {

    app.view.dataTable = function(name, properties) {
      var klass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      app.Views[name] = klass.extend(properties);
      klass.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, properties) {
      app.Views[name] = Row.extend(properties);
      Row.finalize(name, app.Views[name], app.Views);
    }
  });

});