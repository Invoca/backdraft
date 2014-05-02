var Table = (function() {

  var Base = Backdraft.plugin("Base");

  var SelectionHelper = Backdraft.Utils.Class.extend({

    initialize : function() {
      this._count = 0;
      this._rowsByCid = {};
    },

    count : function() {
      return this._count;
    },

    models : function() {
      return _.map(this._rowsByCid, function(row) {
        return row.model;
      });
    },

    process : function(row, state) {
      var existing = this._rowsByCid[row.cid];
      if (state) {
        if (!existing) {
          // add new entry
          this._rowsByCid[row.cid] = row;
          this._count += 1;
        }
      } else {
        if (existing) {
          // purge existing entry
          delete this._rowsByCid[row.cid];
          this._count = Math.max(0, this._count -1);
        }
      }
    }

  });

  var Table = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    // non-paginated tables will return all rows, ignoring the page param
    _visibleRowsCurrentPageArgs : { filter : "applied", page : "current" },

    constructor : function(options) {
      X = this;
      this.options = options || {};
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust");
      this.cache = new Base.Cache();
      this.rowClass = this.getRowClass();
      this.columns = this.rowClass.prototype.columns;
      this._applyDefaults();
      this.selectionHelper = new SelectionHelper();
      // inject our own events in addition to the users
      this.events = _.extend(this.events || {}, {
        "click .dataTable tbody tr" : "_onRowClick"
      });
      Table.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    // apply filtering
    filter : function() {
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // change pagination
    changePage : function() {
      if (!this.paginate) throw new Error("#changePage requires the table be enabled for pagination");
      return this.dataTable.fnPageChange.apply(this.dataTable, arguments);
    },

    // sort specific columns
    sort : function() {
      return this.dataTable.fnSort.apply(this.dataTable, arguments);
    },

    selectedModels : function() {
      return this.selectionHelper.models();
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this._initBulkHandling();
      this.paginate && this._initPaginationHandling();
      this.trigger("change:selections");
      return this;
    },

    selectAll : function(state) {
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row, state);
      }, this);
      this.trigger("change:selections");
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true
      });
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      return this.dataTable.$("tr", this._visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    },

    _setRowSelectedState : function(row, state) {
      this.selectionHelper.process(row, state);
      row.bulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._dataTableConfig());
      if (this.collection.length) this.dataTable.fnAddData(cidMap(this.collection));
    },

    _allVisibleRowsSelected : function() {
      var allSelected, visibleRows = this._visibleRowsOnCurrentPage();
      if (visibleRows.length) {
        allSelected = _.all(visibleRows, function(row) {
          return row.bulkState() == true;
        });
      } else {
        // have no selections does not count as having all selected
        allSelected = false;
      }
      return allSelected;
    },

    // when changing between pages / filters we set the header bulk checkbox state based on whether all newly visible rows are selected or not
    // note: we defer execution as the "page" and "filter" events are called before new rows are swapped in
    // this allows our code to run after the all the new rows are inserted
    _bulkCheckboxAdjust : function() {
      var self = this;
      _.defer(function() {
        self.bulkCheckbox.prop("checked", self._allVisibleRowsSelected());
      });
    },

    _initPaginationHandling : function() {
      this.dataTable.on("page", this._bulkCheckboxAdjust);
    },

    _initBulkHandling : function() {
      var bulkCheckbox = this.$el.find("th.bulk :checkbox");
      if (!bulkCheckbox.length) return
      this.bulkCheckbox = bulkCheckbox;
      this.bulkCheckbox.closest("th").click(this._onBulkHeaderClick);
      this.dataTable.on("click", "td.bulk :checkbox", this._onBulkRowClick);
      this.dataTable.on("filter", this._bulkCheckboxAdjust);
    },

    _dataTableConfig : function() {
      return {
        bDeferRender : false,
        bPaginate : this.paginate,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
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

    _onBulkHeaderClick : function(event) {
      var state = this.bulkCheckbox.prop("checked");
      if (!$(event.target).is(this.bulkCheckbox)) state = !state;
      this.selectAll(state);
      return true;
    },

    _onBulkRowClick : function(event) {
      var checkbox = $(event.target), row = checkbox.closest("tr").data("row"), checked = checkbox.prop("checked");
      // ensure that when a single row checkbox is unchecked, we uncheck the header bulk checkbox
      if (!checked) this.bulkCheckbox.prop("checked", false);
      this._setRowSelectedState(row, checked);
      this.trigger("change:selections");
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
      this.trigger("change:selections");
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:selections");
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
      this.trigger("change:selections");
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
  General:
  - redo the interface for selectAll??
  - names for get/set nount verb
  - counting selected items and tests
  - selected test for serverside
  - do we needa do anything with the bulk select checkbox when the pagination size is changed - same thing as when transition to next page?? check current page all selected

  ServerSide





Questions:







Done:
  basic - when something basic filtered, unselect, and get rid of header checkbox. ANY change to filter, should remove the all selected header checkbox
  local paginated - nuke the complete select,
                    also when navigating from page to page, if all of the rows are checked apply header checkmark, but by default clear it out when transitioning
                    X.dataTable.on("page", function() { setTimeout(function() { console.log(X._visibleRowsOnCurrentPage()); }, 1); });
  Should we even bother with the selectComplete on a local paginated page??? - Nope, we nuked it
  for search change, should we just run same code as pagination change? - yep done
  don't apply the checkbox if there are no results
  unselecting based on filtering, usage of getVisibleRows
  - fix usage of uncheck vs un-check
  - handle clicks on previous in pagination that have no more previos. same with next
  How to force reload of data on ajax? - reload method
  - figure out how to force a reload of data when new params come in.
  - expose method to set additional params

















*/

