var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table) {
    this.table = table;
    this._userConfig = _.clone(_.result(table.rowClass.prototype, "columns"));
    if (!_.isArray(this._userConfig)) throw new Error("Invalid column configuration provided");
    this.columnIndexByTitle = this._computeColumnIndexByTitle();
  },

  columns: function() {
    var columnType, columnTypes = this.table.columnTypes();
    // based on available column types, generate definitions for each provided column
    return _.map(this._userConfig, function(config, index) {
      columnType = _.find(columnTypes, function(type) {
        return type.callbacks.matcher(config);
      });

      if (!columnType) {
        throw new Error("could not find matching column type: " + JSON.stringify(config));
      }

      return columnType.callbacks.definition(this.table, config);
    }, this);
  },

  sorting: function() {
    var columnIndex, direction;
    return _.map(this.table.sorting, function(sortConfig) {
      columnIndex = sortConfig[0];
      direction = sortConfig[1];

      // column index can be provided as the column title, convert to index
      if (_.isString(columnIndex)) columnIndex = this.columnIndexByTitle.get(columnIndex);
      return [ columnIndex, direction ];
    }, this);
  },

  _computeColumnIndexByTitle: function() {
    var model = new Backbone.Model();
    _.each(this._userConfig, function(col, index) {
      col.title && model.set(col.title, index);
    }, this);
    return model;
  }
});