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
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw");
      this.cache = new Base.Cache();
      this.rowClass = this.options.rowClass || this._resolveRowClass();
      this.columns = _.result(this.rowClass.prototype, 'columns');
      if (!_.isArray(this.columns)) throw new Error('Columns should be a valid array');
      this._applyDefaults();
      this._processSortingConfig();
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
      this.trigger("change:selected", { count : this.selectionHelper.count() });
      return this;
    },

    selectAllVisible : function(state) {
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row.model, row, state);
      }, this);
      var info = { count : this.selectionHelper.count() };
      if (state) {
        info.selectAllVisible = true;
      }
      this.trigger("change:selected", info);
    },

    selectAllMatching : function() {
      if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
      _.each(this._allMatchingModels(), function(model) {
        this._setRowSelectedState(model, this.cache.get(model), true);
      }, this);
      this.trigger("change:selected", { count : this.selectionHelper.count() });
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

    matchingCount : function() {
      return this.dataTable.fnSettings().aiDisplay.length;
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true,
        paginateLengthMenu : [ 10, 25, 50, 100 ],
        paginateLength : 10,
        selectedIds : [],
        layout : "<'row'<'col-xs-6'l><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
      });
      _.defaults(this, {
        sorting : [ [ 0, this.paginate ? "desc" : "asc" ] ]
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
      if (!self.bulkCheckbox) return;
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
        sDom : this.layout,
        bDeferRender : true,
        bPaginate : this.paginate,
        aLengthMenu : this.paginateLengthMenu,
        iDisplayLength : this.paginateLength,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
        aoColumns : this._getColumnConfig(),
        aaSorting : this.sorting,
        fnDrawCallback : this._onDraw
      };
    },

    _onDraw : function() {
      this.trigger("draw", arguments);
    },

    _processSortingConfig: function() {
      var columnIndex, direction, columnTitleIndices = _.pluck(this.columns, "title");
      this.sorting =  _.map(this.sorting, function(sortConfig) {
        columnIndex = sortConfig[0];
        direction = sortConfig[1];

        // column index can be provided as the column title, convert to index
        if (_.isString(columnIndex)) columnIndex = _.indexOf(columnTitleIndices, columnIndex);
        return [ columnIndex, direction ];
      });
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
        bSortable: config.sort,
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
      this.trigger("change:selected", { count : this.selectionHelper.count() });
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
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:selected", { count : this.selectionHelper.count() });
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
        // its possible that a selected id is provided for a model that doesn't actually exist in the table, ignore it
        var selectedModel = this.collection.get(id);
        selectedModel && this._setRowSelectedState(selectedModel, null, true);
      }, this);

      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    }

  }, {

    finalize : function(name, tableClass, views) {
      if (!tableClass.prototype.rowClassName) return;
      // method for late resolution of row class, removes dependency on needing access to the entire app
      tableClass.prototype._resolveRowClass = function() {
        return views[tableClass.prototype.rowClassName];
      };
    }

  });

  return LocalDataTable;

})();
