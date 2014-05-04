var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var SelectionHelper = Backdraft.Utils.Class.extend({

    initialize : function() {
      this._count = 0;
      this._cidMap = {};
    },

    count : function() {
      return this._count;
    },

    models : function() {
      return _.values(this._cidMap);
    },

    process : function(model, state) {
      var existing = this._cidMap[model.cid];
      if (state) {
        if (!existing) {
          // add new entry
          this._cidMap[model.cid] = model;
          this._count += 1;
        }
      } else {
        if (existing) {
          // purge existing entry
          delete this._cidMap[model.cid];
          this._count = Math.max(0, this._count -1);
        }
      }
    },

    has : function(model) {
      return !!this._cidMap[model.cid];
    }

  });

  var LocalDataTable = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    // non-paginated tables will return all rows, ignoring the page param
    _visibleRowsCurrentPageArgs : { filter : "applied", page : "current" },

    constructor : function(options) {
      X = this;
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
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
      LocalDataTable.__super__.constructor.apply(this, arguments);
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
      this.trigger("change:selected");
      return this;
    },

    selectAllVisible : function(state) {
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row.model, row, state);
      }, this);
      this.trigger("change:selected");
    },

    selectAllMatching : function() {
      if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
      _.each(this._allMatchingModels(), function(model) {
        this._setRowSelectedState(model, this.cache.get(model), true);
      }, this);
    },

    _allMatchingModels : function() {
      // returns all models matching the current filter criteria, regardless of pagination
      // since we are using deferred rendering, the dataTable.$ and dataTable._ methods don't return all 
      // matching data since some of the rows may not have been rendered yet.
      // here we use the the aiDisplay property to get indecies of the data matching the currenting filtering
      // and return the associated models
      return _.map(this.dataTable.fnSettings().aiDisplay, function(index) {
        return this.collection.at(index);
      }, this);
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true,
        selectedIds : []
      });
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      return this.dataTable.$("tr", this._visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    },

    _setRowSelectedState : function(model, row, state) {
      this.selectionHelper.process(model, state);
      // the row may not exist yet as we utilize deferred rendering. we track the model as 
      // selected and make the ui reflect this when the row is finally created
      row && row.bulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._dataTableConfig());
      if (this.collection.length) this._onReset(this.collection);
    },

    _areAllVisibleRowsSelected : function() {
      var allSelected, visibleRows = this._visibleRowsOnCurrentPage();
      if (visibleRows.length) {
        allSelected = _.all(visibleRows, function(row) {
          return row.bulkState() === true;
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
        self.bulkCheckbox.prop("checked", self._areAllVisibleRowsSelected());
      });
    },

    _initPaginationHandling : function() {
      this.dataTable.on("page", this._bulkCheckboxAdjust);
    },

    _initBulkHandling : function() {
      var bulkCheckbox = this.$el.find("th.bulk :checkbox");
      if (!bulkCheckbox.length) return
      this.bulkCheckbox = bulkCheckbox;
      this.bulkCheckbox.click(this._onBulkHeaderClick);
      this.dataTable.on("click", "td.bulk :checkbox", this._onBulkRowClick);
      this.dataTable.on("filter", this._bulkCheckboxAdjust);
    },

    _dataTableConfig : function() {
      return {
        bDeferRender : true,
        bPaginate : this.paginate,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
        aoColumns      : this._getColumnConfig(),
        aaSorting :  [ [ 0, this.paginate ? "desc" : "asc" ] ]
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
      var self = this;
      return {
        bSortable: true,
        bSearchable: false,
        sTitle: "<input type='checkbox' />",
        sClass : "bulk",
        mData: function(source, type, val) {
          return self.collection.get(source);
        },
        mRender : function(data, type, full) {
          if (type === "sort" || type === "type") {
            return self.selectionHelper.has(data) ? 1 : -1;
          } else {
            return "";            
          }
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
      this.selectAllVisible(state);
      // don't let dataTables sort this column on the click of checkbox
      event.stopPropagation();
    },

    _onBulkRowClick : function(event) {
      var checkbox = $(event.target), row = checkbox.closest("tr").data("row"), checked = checkbox.prop("checked");
      // ensure that when a single row checkbox is unchecked, we uncheck the header bulk checkbox
      if (!checked) this.bulkCheckbox.prop("checked", false);
      this._setRowSelectedState(row.model, row, checked);
      this.trigger("change:selected");
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({ el : node, model : model });
      this.cache.set(model, row);
      // TODO: visibilityHint
      this.child("child" + row.cid, row).render();
      // due to deferred rendering, the model associated with the row may have already been selected, but not rendered yet.
      this.selectionHelper.has(model) && row.bulkState(true);
    },

    _onRowClick : function(event) {

    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid })
      this.trigger("change:selected");
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:selected");
    },

    _onReset : function(collection) {
      if (!this.dataTable) return;
      // clean up old data
      this.dataTable.fnClearTable(false);
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // populate with preselected items
      this.selectionHelper = new SelectionHelper();
      _.each(this.selectedIds, function(id) {
        this._setRowSelectedState(this.collection.get(id), null, true);
      }, this);

      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this.trigger("change:selected");
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

  return LocalDataTable;

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
  - names for get/set nount verb
  - counting selected items and tests
  - selected test for serverside
  - selectAllVisible is not selecting the checkbox in header
  - allow preselected ids
  - add default sorting to make selected appear first
  - bulk clearing of allallall selection, like nuke the selected helper data
  - get servside support selectedIds, make sure we are clearing the selection helper correctly since we override some methods



  ServerSide








Questions:







Done:
  basic - when something basic filtered, unselect, and get rid of header checkbox. ANY change to filter, should remove the all selected header checkbox
  local paginated - nuke the complete select,
                    also when navigating from page to page, if all of the rows are checked apply header checkmark, but by default clear it out when transitioning
                    X.dataTable.on("page", function() { setTimeout(function() { console.log(X._visibleRowsOnCurrentPage()); }, 1); });
  Should we even bother with the selectAllMatching on a local paginated page??? - Nope, we nuked it
  for search change, should we just run same code as pagination change? - yep done
  don't apply the checkbox if there are no results
  unselecting based on filtering, usage of getVisibleRows
  - fix usage of uncheck vs un-check
  - handle clicks on previous in pagination that have no more previos. same with next
  How to force reload of data on ajax? - reload method
  - figure out how to force a reload of data when new params come in.
  - expose method to set additional params
  - provide option of selected ids
  - in the reset handler
      loop through all ids in array of selected, and add models to the selectionHelper
  trigger change in selection event when selectAllMatching(true) is done




InsightForm

  - Create CampaignSelector
      
      // this handles updates, but what about initial state, maybe the first time we can force a rebroadcast of values, which would call serverParams and render into place?
      - when model changes from filtercontrols, call .serverParams() on table

      childviews
        - Alexis' FilterControls

        - ServerSide DataTable
            exposes toJSON
              var selectAllMatchingParams = this.selectAllMatching();
              if (selectAllMatchingParams) {
                return { complete : selectAllMatchingParams };
              } else {
                return { items : this.selectedModels() }
              }
      - exposes #isValid
      - exposes #toJSON()
          return table.toJSON();





  - CampaignSelector is added to the InsightForm


  












*/

