import _ from "underscore";

function getKey(key) {
  if (key.cid) return key.cid;
  if (_.isString(key)) return key;
  throw new Error("Invalid key type");
}

class Cache {

  constructor(...args) {
    this.initialize(...args);
  }

  initialize() {
    this.reset();
  }

  set(key, value) {
    this.data[getKey(key)] = value;
    return value;
  }

  unset(key) {
    key = getKey(key);
    const value = this.data[key];
    delete this.data[key];
    return value;
  }

  get(key) {
    return this.data[getKey(key)];
  }

  size() {
    return _.keys(this.data).length;
  }

  reset() {
    this.data = {};
  }

  each(iterator, context) {
    _.each(this.data, iterator, context);
  }
}

export default Cache;
