var Table = (function() {

  var Base = Backdraft.plugin("Base");

  function cidMap(collection) {
    return collection.map(function(model) {
      return { cid : model.cid };
    });
  }

  var Table = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      this.options = options || {};
      _.bindAll(this, "_onDraw", "_onRowCreated", "_onBulkHeaderClick");
      this.cache = new Base.Cache();
      this.rowClass = this.getRowClass();
      this.columns = (this.rowClass.prototype.columns.call) ? this.rowClass.prototype.columns.call(this) : this.rowClass.prototype.columns;
      // Check columns is an array
      if (!Array.isArray(this.columns)) {
        throw Error('Columns should be a valid array');
      }

      this._resetSelected();
      // inject our own events in addition to the users
      this.events = _.extend(this.events || {}, {
        "click .dataTable tbody tr" : "_onRowClick"
      });
      Table.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    filter : function() {
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // return the row object that is visible
    getVisibleRows : function() {
      return this.dataTable.$("tr", { filter : "applied" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    getSelectedModels : function() {
      return _.map(this.selected.rows, function(row) {
        return row.model;
      })
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this.trigger("change:stats");
      return this;
    },

    selectAll : function(state) {
      this.bulkCheckbox.prop("checked", state);
      this._resetSelected();
      _.each(this.getVisibleRows(), function(row) {
        this._setRowSelectedState(row, state);
      }, this);
      this.trigger("change:stats");
    },

    // private
    _resetSelected : function() {
      this.selected = {
        rows : {},
        count : 0
      };
    },

    _setRowSelectedState : function(row, state) {
      var existing = this.selected.rows[row.cid];
      if (state) {
        if (!existing) {
          this.selected.rows[row.cid] = row;
          this.selected.count += 1;
        } else {
          if (existing) {
            delete this.selected.rows[row.cid];
            this.selected.count = Math.max(0, this.selected.count -1);
          }
        }
      }
      row.setBulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._getDataTableConfig());
      if (this.collection.length) this.dataTable.fnAddData(cidMap(this.collection));
      var bulkCheckbox = this.$el.find("th :checkbox");
      if (bulkCheckbox.length) {
        this.bulkCheckbox = bulkCheckbox;
        this.bulkCheckbox.closest("th").click(this._onBulkHeaderClick);
      }
    },

    _getDataTableConfig : function() {
      return {
        bDeferRender : true,
        bPaginate : true,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
        fnDrawCallback : this._onDraw,
        aoColumns      : this._getColumnConfig(),
        aaSorting :  [ [ 0, 'asc' ] ]
      };
    },

    _getColumnConfig : function() {
      return _.map(this.columns, function(config) {
        if (config.bulk) {
          return this._columnBulk(config);
        } else if (config.attr) {
          return this._columnAttr(config);
        } else {
          return this._columnBase(config);
        }
      }, this);
    },

    _columnBulk : function(config) {
      return {
        bSortable: false,
        bSearchable: false,
        sTitle: "<input type='checkbox' />",
        sClass : "bulk",
        mData: null,
        mRender : function() {
          return "";
        }
      };
    },

    _columnAttr : function(config) {
      var self = this;
      return {
        bSortable: config.sort,
        bSearchable: config.search,
        sTitle: config.title,
        sClass : Row.getCSSClass(config.title),
        mData: function(source, type, val) {
          return self.collection.get(source).get(config.attr);
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

    _columnBase : function(config) {
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
          return self.collection.get(source);
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
    },

    // events

    _onBulkHeaderClick : function() {
      var state = this.bulkCheckbox.prop("checked");
      if (!$(event.target).is(this.bulkCheckbox)) state = !state;
      this.selectAll(state);
      return true;
    },

    _onDraw : function() {
      if (!this.dataTable) return;
      // figure out which rows are visible
      var visible = {}, row, cid;
      _.each(this.getVisibleRows(), function(r) {
        visible[r.cid] = r;
      });
      // unselect the ones that are no longer visible
      for (cid in this.selected.rows) {
        if (!visible[cid]) {
          this._setRowSelectedState(this.selected.rows[cid], false);
        }
      }
      this.trigger("change:stats");
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({ el : node, model : model });
      this.cache.set(model, row);
      // TODO: visibilityHint
      this.child("child" + row.cid, row).render();
    },

    _onRowClick : function(event) {

    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid })
      this.trigger("change:stats");
    }, 

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:stats");
    }, 

    _onReset : function(collection) {
      if (!this.dataTable) return;
      // clean up old data
      this.dataTable.fnClearTable(false);
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this.trigger("change:stats");
    }

  }, {

    finalize : function(name, tableClass, views) {
      // method for late resolution of row class, removes dependency 
      // on needing access to the entire app
      tableClass.prototype.getRowClass = function() {
        return views[tableClass.prototype.rowClassName];
      }
    }

  });

  return Table;

})();