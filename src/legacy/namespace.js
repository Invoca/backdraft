import Class from "./utils/class";
import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "../utils/css";

import Plugin from "./plugin";
import App from "./app";

import View from "../view";
import Collection from "../collection";
import Model from "../model";
import Router from "../router";

import ListView from "../listing/list";
import ItemView from "../listing/item";

import "./register_base_plugin";
import "./register_listing_plugin";
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

  Listing: {
    ListView,
    ItemView
  },

  plugin: Plugin.factory,
  app: App.factory
};

export default Namespace;
