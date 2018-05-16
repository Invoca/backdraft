import _ from "underscore";

import App from "./app";
import Backbone from "backbone";

function createAppClass(proto, name) {
  proto = _.extend({}, proto);

  // ensure that the Base plugin is always loaded
  if (_.isEmpty(proto.plugins)) {
    proto.plugins = ["Base"];
  } else if (!_.include(proto.plugins, "Base")) {
    proto.plugins.unshift("Base");
  }

  return Backbone.Model.extend.call(App, proto);
}

class AppRegistry {
  constructor() {
    this.instances = {};
  }

  get(name) {
    if (this.instances[name]) return this.instances[name];
    throw new Error(`App ${name} does not exist`);
  }

  createApp(name, appInstanceOrPrototype) {
    if (this.instances[name]) {
      throw new Error(`App ${name} is already defined`);
    }

    let appInstance = null;

    if (appInstanceOrPrototype instanceof App) {
      appInstance = appInstanceOrPrototype;
      appInstance.name = name;
    } else {
      const AppClass = createAppClass(_.extend({ name }, appInstanceOrPrototype));
      appInstance = new AppClass();
    }

    this.instances[name] = appInstance;

    return appInstance;
  }

  destroy(name) {
    this.get(name).destroy();
    delete this.instances[name];
  }

  destroyAll() {
    Object.keys(this.instances).forEach(name => {
      this.destroy(name);
    });
  }
}

export default AppRegistry;
