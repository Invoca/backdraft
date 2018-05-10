import _ from "underscore";

import App from "./app";
import Backbone from "backbone";

class AppRegistry {
  constructor() {
    this.instances = {};
  }

  register(name, obj) {
    if (!obj) {
      return this.ensureInstance(name);
    } else if (_.isFunction(obj)) {
      obj(this.ensureInstance(name));
    } else if (_.isObject(obj)) {
      return this.createApp(name, obj);
    } else {
      throw new Error(`Invalid arguments: (${name}, ${JSON.stringify(obj)})`);
    }
  }

  createApp(name, obj) {
    if (this.instances[name]) {
      throw new Error(`App ${name} is already defined`);
    }

    const proto = _.extend({}, obj, { name });

    // ensure that the Base plugin is always loaded
    if (_.isEmpty(proto.plugins)) {
      proto.plugins = ["Base"];
    } else if (!_.include(proto.plugins, "Base")) {
      proto.plugins.unshift("Base");
    }

    const AppClass = Backbone.Model.extend.call(App, proto);

    const newApp = new AppClass();
    this.instances[name] = newApp;

    return newApp;
  }

  destroy(name) {
    this.ensureInstance(name).destroy();
    delete this.instances[name];
  }

  destroyAll() {
    Object.keys(this.instances).forEach(name => {
      this.destroy(name);
    });
  }

  ensureInstance(name) {
    if (this.instances[name]) return this.instances[name];
    throw new Error(`App ${name} does not exist`);
  }
}

export default AppRegistry;
