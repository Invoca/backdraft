import Plugin from "../../plugin";

import ColumnType from "./column_type";
import Row from "./row";
import LocalDataTable from "./data_table";
import ServerSideDataTable from "./server_side_data_table";

import initializeBootstrap from "./bootstrap";

import addBaseColumnType from "./column_types/base";
import addBulkColumnType from "./column_types/bulk";

import initializeColReorderPlugin from "./dataTables.colReorder";

Plugin.factory("DataTable", function(plugin) {

  plugin.initializer(function(app) {

    initializeBootstrap();
    initializeColReorderPlugin();

    app.view.dataTable = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views, app.view.dataTable.config, app.name);
    };

    app.view.dataTable.row = function(name, baseClassName, properties) {
      var baseClass = Row, renderers;
      if (arguments.length === 2) {
        properties = baseClassName;
      } else {
        baseClass = app.Views[baseClassName];
      }

      // special handling for inheritance of renderers
      properties.renderers = _.extend({}, baseClass.prototype.renderers, properties.renderers || {});

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
    };

    // storage for app wide configuration of the plugin
    app.view.dataTable.config = {
      columnTypes: []
    };

    app.view.dataTable.columnType = function(cb) {
      var columnType = new ColumnType();
      cb(columnType);
      app.view.dataTable.config.columnTypes.push(columnType);
    };

    // add standard column types
    addBaseColumnType(app);
    addBulkColumnType(app);
  });
});
