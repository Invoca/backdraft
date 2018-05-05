import _ from "underscore";

import Plugin from "./plugin";

import ColumnType from "./data_table/column_type";
import Row from "./data_table/row";
import LocalDataTable from "./data_table/local_data_table";
import ServerSideDataTable from "./data_table/server_side_data_table";
import Config from "./data_table/config";

import setupEnvironment from "./data_table/setup_environment";

function finalizeLocalTable(tableClass, app) {
  if (tableClass.prototype.rowClassName) {
    // method for late resolution of row class, removes dependency on needing access to the entire app
    tableClass.prototype._resolveRowClass = function() { return app.Views[tableClass.prototype.rowClassName]; };
  }

  tableClass.prototype._configFromPlugin = function() { return app.view.dataTable.config; };
}

function finalizeServerSideTable(tableClass, app) {
  tableClass.prototype.appName = app.name;
}

Plugin.factory("DataTable", plugin => {
  plugin.exports({
    LocalDataTable,
    ServerSideDataTable,
    Row
  });

  plugin.initializer(app => {
    setupEnvironment();

    app.view.dataTable = function(name, baseClassName, properties) {
      let baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      } else {
        baseClass = app.Views[baseClassName];
      }

      const tableClass = baseClass.extend(properties);
      finalizeLocalTable(tableClass, app);
      if (properties.serverSide) {
        finalizeServerSideTable(tableClass, app);
      }

      app.Views[name] = tableClass;
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
    };

    // storage for app wide configuration of the plugin
    app.view.dataTable.config = new Config();

    app.view.dataTable.columnType = function(cb) {
      const columnType = new ColumnType();
      cb(columnType);
      app.view.dataTable.config.addColumnType(columnType);
    };
  });
});
