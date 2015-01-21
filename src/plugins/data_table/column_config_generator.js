var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table, columnIndexByTitle) {
    this.table = table;
    this._columnIndexByTitle = columnIndexByTitle;
  },

  columns: function() {
    var configGen;
    return _.map(this.table.columns, function(config, index) {
      if (config.bulk)      configGen = this._columnBulk;
      else if (config.attr) configGen = this._columnAttr;
      else                  configGen = this._columnBase;

      return configGen.call(this, config);
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
  },

  _columnBulk: function(config) {
    var self = this;
    return {
      bSortable: config.sort,
      bSearchable: false,
      sTitle: "<input type='checkbox' />",
      sClass : "bulk",
      mData: function(source, type, val) {
        return self.table.collection.get(source);
      },
      mRender : function(data, type, full) {
        if (type === "sort" || type === "type") {
          return self.table.selectionHelper.has(data) ? 1 : -1;
        } else {
          return "";
        }
      }
    };
  },

  _columnAttr: function(config) {
    var self = this;
    return {
      bSortable: config.sort,
      bSearchable: config.search,
      sTitle: config.title,
      sClass : Row.getCSSClass(config.title),
      mData: function(source, type, val) {
        return self.table.collection.get(source).get(config.attr);
      },
      mRender : function(data, type, full) {
        // note data is based on the result of mData
        if (type === "display") {
          // nothing to display so that the view can provide its own UI
          return "";
        } else {
          return data;
        }
      }
    };
  },

  _columnBase: function(config) {
    var self = this, searchable = !_.isUndefined(config.searchBy), sortable = !_.isUndefined(config.sortBy);
    var ignore = function() {
      return "";
    };

    return {
      bSortable: sortable,
      bSearchable: searchable,
      sTitle: config.title,
      sClass : Row.getCSSClass(config.title),
      mData: function(source, type, val) {
        return self.table.collection.get(source);
      },
      mRender : function(data, type, full) {
        // note data is based on the result of mData
        if (type === "sort") {
          return (config.sortBy || ignore)(data);
        } else if (type === "type") {
          return (config.sortBy || ignore)(data);
        } else if (type === "display") {
          // renderers will fill content
          return ignore();
        } else if (type === "filter") {
          return (config.searchBy || ignore)(data);
        } else {
          // note dataTables can call in with undefined type
          return ignore();
        }
      }
    };
  }
});