var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table) {
    this.table = table;
    this._computeColumnConfig();
    this._computeColumnIndexByTitle();
    this._computeSortingConfig();
  },

  _computeColumnConfig: function() {
    this.dataTableColumns = [];
    this.columns = _.clone(_.result(this.table.rowClass.prototype, "columns"));
    if (!_.isArray(this.columns)) throw new Error("Invalid column configuration provided");
    var columnType, columnTypes = this.table.columnTypes();
    // based on available column types, generate definitions for each provided column
    _.each(this.columns, function(config, index) {
      columnType = _.find(columnTypes, function(type) {
        return type.callbacks.matcher(config);
      });
      if (!columnType) throw new Error("could not find matching column type: " + JSON.stringify(config));
      this.dataTableColumns.push(columnType.callbacks.definition(this.table, config));
    }, this);
  },

  _computeSortingConfig: function() {
    var columnIndex, direction;
    this.dataTableSorting = _.map(this.table.sorting, function(sortConfig) {
      columnIndex = sortConfig[0];
      direction = sortConfig[1];

      // column index can be provided as the column title, convert to index
      if (_.isString(columnIndex)) columnIndex = this.columnIndexByTitle.get(columnIndex);
      return [ columnIndex, direction ];
    }, this);
  },

  _computeColumnIndexByTitle: function() {
    this.columnIndexByTitle = new Backbone.Model();
    _.each(this.columns, function(col, index) {
      col.title && this.columnIndexByTitle.set(col.title, index);
    }, this);
  }
});