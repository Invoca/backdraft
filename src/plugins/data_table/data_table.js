var Table = (function() {

  var Base = Backdraft.plugin("Base");

  var SelectionHelper = Backdraft.Utils.Class.extend({

    initialize : function() {
      // change to track models
      // render with bulk set correctly
    }

  });

  var Table = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      X = this;
      this.options = options || {};
      _.bindAll(this, "_onDraw", "_onRowCreated", "_onBulkHeaderClick");
      this.cache = new Base.Cache();
      this.rowClass = this.getRowClass();
      this.columns = this.rowClass.prototype.columns;
      this._applyDefaults();
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

    // return the row objects that have not been filtered out
    getVisibleRows : function() {
      return this.dataTable.$("tr", { filter : "applied" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      return this.dataTable.$("tr", { filter : "applied", page : "current" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    // returns row objects that have not been filtered out and are on all pages
    _visibleRowsOnAllPages : function() {
      if (!this.paginate) throw new Error("#_visibleRowsOnAllPages should only be used for paginated tables");
      return this.dataTable.$("tr", { filter : "applied" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    selectedModels : function() {
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
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row, state);
      }, this);
      this.trigger("change:stats");
    },

    selectAllComplete : function() {
      if (!this.paginate) throw new Error("#selectAllComplete cannot be used when pagination is disabled");
      if (this.dataTable.fnPagingInfo().iTotalPages <= 1) throw new Error("#selectAllComplete cannot be used when there are no additional paginated results");

      _.each(this._visibleRowsOnAllPages(), function(row) {
        this._setRowSelectedState(row, true);
      }, this);
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true
      });
    },

    _resetSelected : function() {
      this.selected = {
        rows : {},
        count : 0
      };
    },

    _setRowSelectedState : function(row, state) {
      // for paginated tables, the row may not have been rendered yet
      // TODO: selected math adjustments need to be done regardless of row or not, move logic outside of if (row)
      
      if (row) {
        var existing = this.selected.rows[row.cid];
        if (state) {
          if (!existing) {
            this.selected.rows[row.cid] = row;
            this.selected.count += 1;
          }
        } else {
          if (existing) {
            delete this.selected.rows[row.cid];
            this.selected.count = Math.max(0, this.selected.count -1);
          }
        }

        row.setBulkState(state);
      }
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
        bDeferRender : false,
        bPaginate : this.paginate,
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

/*
  No pagination
    - select all - should select only what is visible on the screen, as some rows may have been filtered. all rows are rendered upfront since there is no pagination
    - no gmail style

  Pagination - local
    - select all (first time)  - should select only only what is visible on the screen - we don't want to select other pages.
    - select all (gmail style) - should only appear if there is more than 1 page of paginated data
                               - should select all models on all filter applied paginated pages, even if some have not been rendered. not sure how to find these models. 
                                 it may be easier to disable deferred rendering and use the visibleRow method we have. so lets say you filter 100 results to 34, 
                                 hit select all, we will select 10 visible ones. say you want all all. the 34 results will be selected

  ServerSide (pagination is implied)
    - disable datatables filtering as it's default issues too many ajax
    - select all (first time)  - should select whats in the collection, since its server side, everything in the collection is what we have.
    - select all (gmail style) - should only appear if there is more than 1 page of paginated data
                               - need to persist current filters and return those instead of selected ids.



TODO 
  - selecting single is not adjusting selected counts or adding rows/models
  - define selectAllComplete method
      - no pagination - throw exception
      - local paginated - throw exception if there is no more paginated pages
                        - select using visible
      - remote paginated - throw exception if there is no more paginated pages
                         - persist current filters
  - clear selectAllComplete data on fnDrawCallback or fnInfoCallback
  - getVisibleRows is returning other pages in case of local pagination, all ones that have been created

Questions:
  When should we unselect the "all selected" ones?
    - as soon as anything is changed
  On a local paginated page, if you select a bunch of things and then move to another page, should those previous options be persisted?
    - for the complete all case, we will nuke it
    - but what about just selection of that page, what should we do with header, leave it checked?



*/