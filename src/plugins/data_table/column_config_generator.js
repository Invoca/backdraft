var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table, columnIndexByTitle) {
    this.table = table;
    this._columnIndexByTitle = columnIndexByTitle;
  },

  columns: function() {
    var columnType, columnTypes = this.table.columnTypes();
    // based on available column types, generate definitions for each provided column
    return _.map(this.table.columns, function(config, index) {
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
      if (_.isString(columnIndex)) columnIndex = this._columnIndexByTitle.get(columnIndex);
      return [ columnIndex, direction ];
    }, this);
  }
});