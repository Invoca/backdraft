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

    app.view.dataTable = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Row;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
    }
  });

});