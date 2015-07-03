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

    _.each(this.columnsConfig, function(column) {
      column.visibleDefault = _.has(column, "visible") ? column.visible : true;
    });

    this._applySavedState();

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
  },

  _applySavedState: function() {
    var reportSettings = this.table.options.reportSettings;
    var column;
    if (reportSettings) {
      _.each(reportSettings.columnAdds, function(columnName) {
        column = this._findColumnByAttr(columnName);
        if (column) {
          column.visible = true;
        }
      }, this);

      _.each(reportSettings.columnSubtracts, function(columnName) {
        column = this._findColumnByAttr(columnName);
        if (column) {
          column.visible = false;
        }
      }, this);

      this._reorderColumns(reportSettings.columnOrder);
    }
  },

  _reorderColumns: function(columnOrder) {
    var column, columnPositions = {}, reorderedColumns = [];
    if (columnOrder && columnOrder.length > 0) {
      _.each(columnOrder, function(columnName, index) {
        columnPositions[columnName] = index;
      });

      // insert columns in the specified order
      _.each(columnOrder, function(columnName) {
        column = this._findColumnByAttr(columnName);
        if (column) {
          reorderedColumns.push(column);
        }
      }, this);

      // insert remaining columns with unspecified order
      _.each(this.columnsConfig, function(column, index) {
        if (columnPositions[column.attr] == undefined) {
          reorderedColumns.splice(index, 0, column);
        }
      });

      this.columnsConfig = reorderedColumns;
    }
  },

  _findColumnByAttr: function(columnAttr) {
    return _.find(this.columnsConfig, function(column) { return column.attr == columnAttr; });
  },

  _sortingInfo: function() {
    var reportSettings = this.table.options.reportSettings, savedSorting, sortInfo = this.table.sorting;
    if (reportSettings && reportSettings.sorting) {
      try {
        if (_.isString(reportSettings.sorting)) {
          savedSorting = JSON.parse(reportSettings.sorting);
        } else {
          savedSorting = reportSettings.sorting;
        }
      } catch(e) {
        // ignore JSON error, use default sorting
      }

      if (_.isArray(savedSorting)) {
        var validColumns = true;
        var columnAttrs = _.pluck(this.columnsConfig, 'attr');
        // replace column attributes with indexes
        savedSorting = _.map(savedSorting, function(sortColumn) {
          if (validColumns) {
            var colAttr = sortColumn[0];
            var colIdx = _.indexOf(columnAttrs, colAttr);
            if (colIdx != -1) {
              return [colIdx, sortColumn[1]];
            } else {
              validColumns = false;
            }
          }
          return sortColumn;
        }, this);

        if (validColumns) {
          // valid saved sorting state, use it instead of default
          sortInfo = savedSorting;
        }
      }
    }

    return sortInfo;
  }
});
