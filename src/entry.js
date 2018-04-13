import _ from "underscore";

import BackdraftNamespace from "./backdraft_namespace";

import "./plugins/base/base";
import "./plugins/listing/index";
import "./plugins/data_table/index";

// use squiggly braces for underscore templating so we don't conflict with ruby templating
_.templateSettings = {
  evaluate: /{{([\s\S]+?)}}/g,
  interpolate: /{{=([\s\S]+?)}}/g,
  escape: /{{-([\s\S]+?)}}/g
};

export default BackdraftNamespace;
