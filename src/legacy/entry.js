import _ from "underscore";

import Namespace from "./namespace";
const BackdraftNamespace = Namespace;

// use squiggly braces for underscore templating so we don't conflict with ruby templating
_.templateSettings = {
  evaluate: /{{([\s\S]+?)}}/g,
  interpolate: /{{=([\s\S]+?)}}/g,
  escape: /{{-([\s\S]+?)}}/g
};

export default BackdraftNamespace;
