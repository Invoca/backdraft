var ColumnType =  Backdraft.Utils.Class.extend({
  initialize: function() {
    this._getterSetter("configMatcher");
    this._getterSetter("nodeMatcher");
    this._getterSetter("definition");
    this._getterSetter("renderer");
  }
});
