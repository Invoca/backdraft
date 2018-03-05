import Class from "./utils/class";
import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "../utils/css";

import Plugin from "./plugin";
import App from "./app";

const Namespace = {
  Utils: {
    Class,
    toCSSClass,
    toColumnCSSClass,
    extractColumnCSSClass
  },

  plugin: Plugin.factory,
  app: App.factory
};

import "./register_base_plugin";
import "./register_listing_plugin";
import "./register_data_table_plugin";

export default Namespace;
