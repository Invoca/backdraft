import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "./utils/css";

import App from "./app";
import Plugin from "./plugin";
import createRegistry from "./app_registry";

import View from "./view";
import Collection from "./collection";
import Model from "./model";
import Router from "./router";

import ListView from "./listing/list";
import ItemView from "./listing/item";

import LocalDataTable from "./data_table/local_data_table";
import ServerSideDataTable from "./data_table/server_side_data_table";
import Row from "./data_table/row";
import Config from "./data_table/config";
import ColumnType from "./data_table/column_type";

import "./legacy/register_base_plugin";
import "./legacy/register_listing_plugin";
import "./register_data_table_plugin";

const Namespace = {
  Utils: {
    toCSSClass,
    toColumnCSSClass,
    extractColumnCSSClass
  },

  App,

  View,
  Collection,
  Model,
  Router,

  DataTable: {
    Config,
    ColumnType,
    Local: LocalDataTable,
    ServerSide: ServerSideDataTable,
    Row
  },

  Listing: {
    ListView,
    ItemView
  },

  plugin: Plugin.factory,
  app: createRegistry()
};

export default Namespace;
