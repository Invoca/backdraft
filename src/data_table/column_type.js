class ColumnType {
  constructor() {
    this._getterSetter("configMatcher");
    this._getterSetter("nodeMatcher");
    this._getterSetter("definition");
    this._getterSetter("renderer");
  }

  _getterSetter(prop) {
    this._store || (this._store = {});

    this[prop] = function(value) {
      if (arguments.length === 1) {
        this._store[prop] = value;
      } else {
        return this._store[prop];
      }
    };
  }
}

export default ColumnType;
