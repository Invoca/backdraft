import Class from "./legacy/utils/class";
import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "./utils/css";

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

import "./legacy/register_base_plugin";
import "./legacy/register_listing_plugin";
import "./register_data_table_plugin";

const Namespace = {
  Utils: {
    Class,
    toCSSClass,
    toColumnCSSClass,
    extractColumnCSSClass
  },

  View,
  Collection,
  Model,
  Router,

  DataTable: {
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
