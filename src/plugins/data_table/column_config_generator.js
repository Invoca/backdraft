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
    this.columns = _.reject(this.columns, function(columnConfig) {
      if (!columnConfig.present) {
        return false;
      } else {
        return !columnConfig.present();
      }
    });

    _.each(this._determineColumnTypes(), function(columnType, index) {
      var columnConfig = this.columns[index];
      var definition = columnType.definition()(this.table, columnConfig);

      if (!_.has(columnConfig, "required")) {
        columnConfig.required = false;
      }
      if (!_.has(columnConfig, "visible")) {
        columnConfig.visible = true;
      }

      if (columnConfig.required === true && columnConfig.visible === false) {
        throw new Error("column can't be required, but not visible");
      }

      this.dataTableColumns.push(definition);
      columnConfig.nodeMatcher = columnType.nodeMatcher();
      // use column type's default renderer if the config doesn't supply one
      if (!columnConfig.renderer) columnConfig.renderer = columnType.renderer();
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
  },

  _determineColumnTypes: function() {
    // match our table's columns to available column types
    var columnType, availableColumnTypes = this.table.availableColumnTypes();
    return _.map(this.columns, function(config, index) {
      var columnType = _.find(availableColumnTypes, function(type) {
        return type.configMatcher()(config);
      });

      if (!columnType) {
        throw new Error("could not find matching column type: " + JSON.stringify(config));
      } else {
        return columnType;
      }
    });
  }
});