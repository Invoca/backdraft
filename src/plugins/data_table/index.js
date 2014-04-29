Backdraft.plugin("DataTable", function(plugin) {

  function cidMap(collection) {
    return collection.map(function(model) {
      return { cid : model.cid };
    });
  }

  $.fn.dataTableExt.oApi.fnPagingInfo = function (oSettings) {
    return {
      "iStart":         oSettings._iDisplayStart,
      "iEnd":           oSettings.fnDisplayEnd(),
      "iLength":        oSettings._iDisplayLength,
      "iTotal":         oSettings.fnRecordsTotal(),
      "iFilteredTotal": oSettings.fnRecordsDisplay(),
      "iPage":          oSettings._iDisplayLength === -1 ?
          0 : Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
      "iTotalPages":    oSettings._iDisplayLength === -1 ?
          0 : Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
    };
  };

  {%= inline("src/plugins/data_table/row.js") %}
  {%= inline("src/plugins/data_table/data_table.js") %}
  {%= inline("src/plugins/data_table/server_side_data_table.js") %}

  plugin.initializer(function(app) {

    app.view.dataTable = function(name, properties) {
      var klass = properties.serverSide ? ServerSideDataTable : Table;
      app.Views[name] = klass.extend(properties);
      klass.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, properties) {
      app.Views[name] = Row.extend(properties);
      Row.finalize(name, app.Views[name], app.Views);
    }
  });

});