import Class from "../../utils/class";

var SelectionManager = Class.extend({

  initialize : function() {
    this._count = 0;
    this._cidMap = {};
  },

  count : function() {
    return this._count;
  },

  models : function() {
    return _.values(this._cidMap);
  },

  process : function(model, state) {
    var existing = this._cidMap[model.cid];
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
  },

  has : function(model) {
    return !!this._cidMap[model.cid];
  }

});

export default SelectionManager;
