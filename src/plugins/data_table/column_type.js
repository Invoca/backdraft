var ColumnType =  Backdraft.Utils.Class.extend({
  initialize: function() {
    this._store = {};
    this._getterSetter("configMatcher");
    this._getterSetter("nodeMatcher");
    this._getterSetter("definition");
    this._getterSetter("renderer");
  },

  _getterSetter: function(prop) {
    this[prop] = function(value) {
      if (arguments.length === 1) {
        this._store[prop] = value;
      } else {
        return this._store[prop];
      }
    }
  }
});
