var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table) {
    this.table = table;
    this.columnIndexByTitle = new Backbone.Model();
    this.columnConfigByTitle = new Backbone.Model();
    this._computeColumnConfig();
    this._computeColumnLookups();
    this._computeSortingConfig();
  },

  columnsSwapped: function(fromIndex, toIndex) {
    // move the config around and recompute lookup models
    var removed = this.columnsConfig.splice(fromIndex, 1)[0];
    this.columnsConfig.splice(toIndex, 0, removed);
    this._computeColumnLookups();
  },

  columnsReordered: function() {
    this._computeColumnLookups();
  },

  _computeColumnConfig: function() {
    this.dataTableColumns = [];
    this.columnsConfig = _.clone(_.result(this.table.rowClass.prototype, "columns"));
    if (!_.isArray(this.columnsConfig)) throw new Error("Invalid column configuration provided");
    this.columnsConfig = _.reject(this.columnsConfig, function(columnConfig) {
      if (!columnConfig.present) {
        return false;
      } else {
        return !columnConfig.present();
      }
    });

    _.each(this._determineColumnTypes(), function(columnType, index) {
      var config = this.columnsConfig[index];
      var definition = columnType.definition()(this.table, config);

      if (!_.has(config, "required")) {
        config.required = false;
      }
      if (!_.has(config, "visible")) {
        config.visible = true;
      }

      if (config.required === true && config.visible === false) {
        throw new Error("column can't be required, but not visible");
      }

      this.dataTableColumns.push(definition);
      config.nodeMatcher = columnType.nodeMatcher();
      // use column type's default renderer if the config doesn't supply one
      if (!config.renderer) config.renderer = columnType.renderer();
    }, this);
  },

  _computeSortingConfig: function(sorting) {
    var columnIndex, direction;
    var sortingInfo = sorting || this.table.sorting;
    this.dataTableSorting = _.map(sortingInfo, function(sortConfig) {
      columnIndex = sortConfig[0];
      direction = sortConfig[1];

      // column index can be provided as the column title, convert to index
      if (_.isString(columnIndex)) columnIndex = this.columnIndexByTitle.get(columnIndex);
      return [ columnIndex, direction ];
    }, this);
  },

  _computeColumnLookups: function() {
    this.columnIndexByTitle.clear();
    this.columnConfigByTitle.clear();
    _.each(this.columnsConfig, function(col, index) {
      if (col.title) {
        this.columnIndexByTitle.set(col.title, index);
        this.columnConfigByTitle.set(col.title, col);
      }
    }, this);
  },

  _determineColumnTypes: function() {
    // match our table's columns to available column types
    var columnType, availableColumnTypes = this.table.availableColumnTypes();
    return _.map(this.columnsConfig, function(config, index) {
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
