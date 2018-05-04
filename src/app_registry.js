import _ from "underscore";

import App from "./app";
import Backbone from "backbone";

const AppRegistryMixin = {
  get instances() {
    if (!this._instances) {
      this._instances = {};
    }

    return this._instances;
  },

  destroy(name) {
    this.ensureInstance(name).destroy();
    delete this.instances[name];
  },

  destroyAll() {
    Object.keys(this.instances).forEach(name => {
      this.destroy(name);
    });
  },

  ensureInstance(name) {
    if (this.instances[name]) return this.instances[name];
    throw new Error(`App ${name} does not exist`);
  }
};

export default function createRegistry() {
  const registry = (name, obj) => {
    if (!obj) {
      return registry.ensureInstance(name);
    } else if (_.isFunction(obj)) {
      obj(registry.ensureInstance(name));
    } else if (_.isObject(obj)) {
      // define app and create an instance of it
      if (registry.instances[name]) {
        throw new Error(`App ${name} is already defined`);
      }

      const proto = _.extend(obj, { name });
      const AppClass = Backbone.Model.extend.call(App, proto);

      const newApp = new AppClass();
      registry.instances[name] = newApp;

      return newApp;
    } else {
      throw new Error(`Invalid arguments: (${name}, ${JSON.stringify(obj)})`);
    }
  };
  _.extend(registry, AppRegistryMixin);

  return registry;
}
