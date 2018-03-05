import Class from "./utils/class";
import { toCSSClass, toColumnCSSClass, extractColumnCSSClass } from "./utils/css";

import Plugin from "./plugin";
import App from "./app";

const BackdraftNamespace = {
  Utils: {
    Class,
    toCSSClass,
    toColumnCSSClass,
    extractColumnCSSClass
  },

  plugin: Plugin.factory,
  app: App.factory
};

import "./plugins/base/register_base_plugin";
import "./plugins/listing/register_listing_plugin";
import "./plugins/data_table/register_data_table_plugin";

export default BackdraftNamespace;
