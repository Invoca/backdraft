import _ from "underscore";

import Plugin from "./plugin";

import ColumnType from "./data_table/column_type";
import Row from "./data_table/row";
import LocalDataTable from "./data_table/local_data_table";
import ServerSideDataTable from "./data_table/server_side_data_table";

import initializeBootstrap from "./data_table/bootstrap";

import addBaseColumnType from "./data_table/column_types/base";
import addBulkColumnType from "./data_table/column_types/bulk";

import initializeColReorderPlugin from "./data_table/dataTables.colReorder";

Plugin.factory("DataTable", plugin => {

  plugin.initializer(app => {

    initializeBootstrap();
    initializeColReorderPlugin();

    app.view.dataTable = function(name, baseClassName, properties) {
      let baseClass;
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
      let baseClass = Row;
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
      const columnType = new ColumnType();
      cb(columnType);
      app.view.dataTable.config.columnTypes.push(columnType);
    };

    // add standard column types
    addBulkColumnType(app);
    addBaseColumnType(app);
  });
});
