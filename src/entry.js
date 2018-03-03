import _ from "underscore";

import BackdraftNamespace from "./backdraft_namespace";

// use squiggly braces for underscore templating so we don't conflict with ruby templating
_.templateSettings = {
  evaluate    : /{{([\s\S]+?)}}/g,
  interpolate : /{{=([\s\S]+?)}}/g,
  escape      : /{{-([\s\S]+?)}}/g
};

export default BackdraftNamespace;
