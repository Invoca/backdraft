import _ from "underscore";

class SelectionManager {

  constructor() {
    this._count = 0;
    this._cidMap = {};
  }

  count() {
    return this._count;
  }

  models() {
    return _.values(this._cidMap);
  }

  process(model, state) {
    const existing = this._cidMap[model.cid];
    if (state) {
      if (!existing) {
        // add new entry
        this._cidMap[model.cid] = model;
        this._count += 1;
      }
    } else {
      if (existing) {
        // purge existing entry
        delete this._cidMap[model.cid];
        this._count = Math.max(0, this._count -1);
      }
    }
  }

  has(model) {
    return !!this._cidMap[model.cid];
  }
}

export default SelectionManager;
