var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var LocalDataTable = Base.View.extend({
    BULK_COLUMN_HEADER_CHECKBOX_SELECTOR : "th:first.bulk :checkbox",
    BULK_COLUMN_CHECKBOXES_SELECTOR : "td:first-child.bulk :checkbox",
    ROWS_SELECTOR: "tbody tr",
    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw",
          "_onColumnVisibilityChange", "_onColumnReorder");
      this.cache = new Base.Cache();
      this.selectionManager = new SelectionManager();
      this.rowClass = this.options.rowClass || this._resolveRowClass();
      this._applyDefaults();
      this._columnManager = new ColumnManager(this);
      this._lockManager = new LockManager(this);
      LocalDataTable.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    // apply filtering
    filter : function() {
      this._lockManager.ensureUnlocked("filter");
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // change pagination
    page : function() {
      this._lockManager.ensureUnlocked("page");
      return this.dataTable.fnPageChange.apply(this.dataTable, arguments);
    },

    // sort specific columns
    sort : function() {
      this._lockManager.ensureUnlocked("sort");
      return this.dataTable.fnSort.apply(this.dataTable, arguments);
    },

    selectedModels : function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.selectionManager.models();
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this._initBulkHandling();
      this._enableRowHighlight();
      this.paginate && this._initPaginationHandling();
      this._triggerChangeSelection();
      this.trigger("render");
      return this;
    },

    renderColumn: function(id) {
      var config = this._columnManager.columnConfigForId(id);
      if (!config) {
        throw new Error("column not found");
      }
      this.cache.each(function(row) {
        row.renderColumnByConfig(config);
      });
    },

    selectAllVisible : function(state) {
      this._lockManager.ensureUnlocked("bulk");
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row.model, row, state);
      }, this);
      this._triggerChangeSelection({ selectAllVisible: state });
    },

    selectAllMatching : function() {
      this._lockManager.ensureUnlocked("bulk");
      if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
      _.each(this._allMatchingModels(), function(model) {
        this._setRowSelectedState(model, this.cache.get(model), true);
      }, this);
      this._triggerChangeSelection();
    },

    matchingCount : function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.dataTable.fnSettings().aiDisplay.length;
    },

    totalRecordsCount: function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.dataTable.fnSettings().fnRecordsTotal();
    },

    columnRequired: function(state, id) {
      if (!state && this._columnManager.columnConfigForId(id).required) {
        throw new Error("can not disable visibility when column is required");
      }
    },

    columnVisibility: function(attr, state) {
      if (arguments.length === 1) {
        // getter
        return this._columnManager.visibility.get(attr);
      } else {
        this.columnRequired(state, attr);
        this._columnManager.visibility.set(attr, state);
        state && this.renderColumn(attr);
      }
    },

    // takes a hash of { columnAttr: columnState, ... }
    setColumnVisibilities: function(columns) {
      _.each(columns, this.columnRequired, this);
      this._columnManager.visibility.set(columns);
      _.each(columns, function(state, attr) {
        state && this.renderColumn(attr);
      }, this);
    },

    restoreColumnVisibility: function() {
      _.each(this.columnsConfig(), function(column) {
        if (column.id) {
          this.columnVisibility(column.id, column.visible);
        }
      }, this);
    },

    columnOrder: function(order) {
      if (this._reorderableColumnsEnabled()) {
        this._changeColumnOrder(order);
      }
    },

    restoreColumnOrder: function() {
      if (this._reorderableColumnsEnabled()) {
        this._changeColumnOrder({ reset: true});
      }
    },

    changeSorting: function(sorting) {
      this._columnManager.changeSorting(sorting);
      if (this.dataTable) {
        var normalizeSortingColumn = function(sort) { return _.first(sort, 2); };
        sorting = _.map(this._columnManager.dataTableSortingConfig(), normalizeSortingColumn);
        currentSorting = _.map(this.dataTable.fnSettings().aaSorting, normalizeSortingColumn);
        if (!_.isEqual(currentSorting, sorting)) {
          this.dataTable.fnSort(sorting);
        }
      }
    },

    lock: function(name, state) {
      if (arguments.length === 1) {
        // getter
        return this._lockManager.lock(name);
      } else if (arguments.length === 2) {
        // setter
        this._lockManager.lock(name, state);
      } else {
        throw new Error("#lock requires a name and/or a state");
      }
    },

    columnsConfig: function() {
      return this._columnManager.columnsConfig();
    },

    configGenerator: function() {
      return this._columnManager._configGenerator;
    },

    disableFilters: function(errorMessage) {
      var columns = this.columnsConfig();
      for (var c in columns) {
        if (!columns[c].filter) continue;
        this.child("filter-" + columns[c].id).disableFilter(errorMessage);
      }
    },

    enableFilters: function() {
      var columns = this.columnsConfig();
      for (var c in columns) {
        if (!columns[c].filter) continue;
        this.child("filter-" + columns[c].id).enableFilter();
      }
    },

    updateAjaxSource: function() {
      // get ajax url
      var ajaxURL = this.dataTable.fnSettings().sAjaxSource;
      // get the endpoint of ajax url
      var splitUrl = ajaxURL.split("?");
      var endpoint = splitUrl[0];

      // Early exit if no params
      if (!splitUrl[1]) {
        return;
      }

      // get parameters of ajax url
      var params = $.deparam(splitUrl[1]);

      // make ext_filter_json param the same as the current url, now with new filters
      params.ext_filter_json = JSON.stringify(this.configGenerator()._getUrlFilterParams());

      // Build new url with old endpoint but new params
      var newURL = endpoint + "?"+ $.param(params);

      // Update datatable ajax source
      this.dataTable.fnSettings().sAjaxSource = newURL;

      // trigger "filter:column" event
      this._onColumnFilter();
    },

    // Private APIs

    _enableReorderableColumns: function() {
      var self = this;
      self._colReorder = new $.fn.dataTable.ColReorder(this.dataTable, {
        fnReorderCallback: function(fromIndex, toIndex) {
          // notify that columns have been externally rearranged
          self._columnManager.columnsSwapped(fromIndex, toIndex);
          // pass event up
          self._onColumnReorder();
        },
        bAddFixed: false,
        bResizeTableWrapper: false,
        allowHeaderDoubleClick: false,
        allowResize: self.resizableColumns,
        // iFixedColumns configures how many columns should be unmovable starting from left
        // if the first column is the bulk column we make it unmovable
        iFixedColumns: this.$el.find(this.BULK_COLUMN_HEADER_CHECKBOX_SELECTOR).length
      });
    },

    _renderGrandTotalsRow: function() {
      var hasGrandTotalsCell = false;
      // if dataTable is available AND we have a totals row
      if (this.dataTable && this.totalsRow) {
        // If we don't have a footer rendered, render it
        if (this.dataTable.find("tfoot").length < 1) {
          this.dataTable.append("<tfoot><tr></tr></tfoot>");
        }

        // Clear the footer
        var $grandTotalsRow = this.dataTable.find("tfoot tr");
        $grandTotalsRow.html("");

        // Iterate over the current columns config
        this.columnsConfig().forEach(function(col) {
          if (this.columnVisibility(col.id) || col.bulk) {
            var node = $("<td>");
            // If column is a non totals column, draw "Grand totals" on the first one and the rest are empty
            if (this.isNontotalsColumn && this.isNontotalsColumn(col)) {
              if (hasGrandTotalsCell) {
                $grandTotalsRow.append(node);
              } else {
                hasGrandTotalsCell = true;
                col.grandTotalRenderer ? col.grandTotalRenderer.apply(this.totalsRow, [node, col]) : node.text("Grand Total");
                $grandTotalsRow.append(node);
              }
            } else {
              (col.grandTotalRenderer || col.renderer).apply(this.totalsRow, [node, col]);
              $grandTotalsRow.append(node);
            }
          }
        }.bind(this));
      }
    },

    _renderHeaderGroup: function() {
      if (!_.isEmpty(this.rowClass.prototype.columnGroupDefinitions)) {
        var columnGroups = this.rowClass.prototype.columnGroupDefinitions;
        var tr = this.$("table").find('thead tr.header-groups-row');
        if (tr.length === 0) {
          tr = $('<tr class="header-groups-row">');
        } else {
          tr.empty();
        }

        var uniqueHeaderGroupDataIndex = {};

        _.each(this._columnManager._visibilitySummary().visible, function(col) {
          var columnConfig = _.findWhere(this._columnManager.columnsConfig(), { attr: col });
          var headerGroupDataIndex = columnConfig.headerGroupDataIndex;
          var columnGroupConfig = _.findWhere(columnGroups, { "headerGroupDataIndex" : headerGroupDataIndex } );

          if (!columnGroupConfig || !headerGroupDataIndex) {
            Backdraft.Utils.log('Unable to find a matching headerGroupDataIndex for ' + columnConfig.attr);
            columnGroupConfig = { colspan: 1, headerName: '' };
            headerGroupDataIndex = columnConfig.title;
          }

          if (columnGroupConfig && !uniqueHeaderGroupDataIndex[headerGroupDataIndex]) {
            uniqueHeaderGroupDataIndex[headerGroupDataIndex] = true;
            tr.append('<th colspan="' + columnGroupConfig.colspan + '" class="header-groups">' + columnGroupConfig.headerName + '</th>');
          }
        }.bind(this));

        this.$("table").find('thead').prepend(tr);
      }
    },

    // Changes or resets the column order.
    // When called with no args, returns the current order.
    // Call with { reset : true } to have it restore column order to initial configuration
    // Provide array of indexes as first argument to have it reordered by that
    _changeColumnOrder: function(order) {
      if (this._colReorder) {
        var columnsOrig = _.clone(this.dataTable.fnSettings().aoColumns);
        if (_.isArray(order)) {
          this._colReorder.fnOrder(order);
        } else if (_.has(order, 'reset') && order.reset) {
          this._colReorder.fnReset();
        } else {
          return this._colReorder.fnOrder();
        }

        // restore columnsConfig order to match the underlying order from dataTable
        var columnsConfig = this.columnsConfig();
        var columnsConfigOrig = _.clone(columnsConfig);
        // reset config
        columnsConfig.splice(0, columnsConfig.length);
        // fill in config in correct order
        _.each(this.dataTable.fnSettings().aoColumns, function(tableColumn) {
          var oldIndex = columnsOrig.indexOf(tableColumn);
          if (oldIndex != -1) {
            columnsConfig.push(columnsConfigOrig[oldIndex]);
          }
        });

        this._columnManager.columnsReordered();
      }
    },

    _allMatchingModels : function() {
      // returns all models matching the current filter criteria, regardless of pagination
      // since we are using deferred rendering, the dataTable.$ and dataTable._ methods don't return all
      // matching data since some of the rows may not have been rendered yet.
      // here we use the the aiDisplay property to get indicies of the data matching the current filtering
      // and return the associated models
      return _.map(this.dataTable.fnSettings().aiDisplay, function(index) {
        return this.collection.at(index);
      }, this);
    },

    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true,
        paginateLengthMenu : [ 10, 25, 50, 100 ],
        paginateLength : 10,
        selectedIds : [],
        filteringEnabled: false,
        layout : "<'row'<'col-xs-6'l><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
        reorderableColumns: true,
        resizableColumns: false,
        objectName: {
          singular: "row",
          plural: "rows"
        }
      });
      _.defaults(this, {
        sorting : [ [ 0, this.paginate ? "desc" : "asc" ] ]
      });

      if (!this.objectName.plural) {
        throw new Error("plural object name must be provided");
      } else if (!this.objectName.singular) {
        throw new Error("singular object name must be provided");
      }
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      // non-paginated tables will return all rows, ignoring the page param
      var visibleRowsCurrentPageArgs = { filter : "applied", page : "current" };
      return this.dataTable.$("tr", visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    },

    _setRowSelectedState : function(model, row, state) {
      this.selectionManager.process(model, state);
      // the row may not exist yet as we utilize deferred rendering. we track the model as
      // selected and make the ui reflect this when the row is finally created
      row && row.bulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._dataTableConfig());
      this._setupSelect2PaginationAttributes();
      this._installSortInterceptors();
      this.filteringEnabled && this._setupFiltering();
      if (this._reorderableColumnsEnabled()) {
        this._enableReorderableColumns();
      }
      this._columnManager.on("change:visibility", this._onColumnVisibilityChange);
      this._columnManager.applyVisibilityPreferences();
      this._renderHeaderGroup();

      if (this.collection.length) this._onReset(this.collection);
      // if resizeable, add resizeable class
      if (this._colReorder && this._colReorder.s.allowResize) {
        this.$("table").addClass("dataTable-resizeableColumns")
      }
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

    // Do not enable when  columnGroupDefinitions is defined and not empty.
    _reorderableColumnsEnabled : function() {
      return this.reorderableColumns && _.isEmpty(this.rowClass.prototype.columnGroupDefinitions);
    },

    _initPaginationHandling : function() {
      this.dataTable.on("page", this._bulkCheckboxAdjust);
    },

    _initBulkHandling : function() {
      var bulkCheckbox = this.$el.find(this.BULK_COLUMN_HEADER_CHECKBOX_SELECTOR);
      if (!bulkCheckbox.length) return;
      this.bulkCheckbox = bulkCheckbox;
      this.bulkCheckbox.click(this._onBulkHeaderClick);
      this.dataTable.on("click", this.BULK_COLUMN_CHECKBOXES_SELECTOR, this._onBulkRowClick);
      this.dataTable.on("filter", this._bulkCheckboxAdjust);
    },

    _enableRowHighlight: function() {
      this.dataTable.on("click", this.ROWS_SELECTOR, this._onRowHighlightClick);
    },

    _onRowHighlightClick: function(event) {
     var el = $(event.target).closest("tr"),
         currentState = el.hasClass("highlighted");
     $(event.target).closest("tbody").find('tr').toggleClass('highlighted',false);
     el.toggleClass("highlighted", !currentState);
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
        aoColumns : this._columnManager.dataTableColumnsConfig(),
        aaSorting : this._columnManager.dataTableSortingConfig(),
        fnDrawCallback : this._onDraw,
        oLanguage: {
          sEmptyTable: this.emptyText
        }
      };
    },

    _triggerChangeSelection: function(extraData) {
      var data = _.extend(extraData || {}, { count : this.selectionManager.count() });
      this.trigger("change:selected", data);
    },

    _setupSelect2PaginationAttributes: function () {
      this.$('select').
          attr('data-plugin', 'select2').
          css('width', '5em');
    },

    // DataTables does not provide a good way to programmatically disable sorting, so we:
    // 1) remove the default sorting event handler that dataTables adds
    // 2) Create a div and put the header in it.  We need to do this so sorting doesn't conflict with filtering
    // on the click events.
    // 3) insert our own event handler on the div that stops the event if we are locked
    // 4) re-insert the dataTables sort event handler
    _installSortInterceptors: function() {
      var self = this;
      this.dataTable.find("thead th").each(function(index) {
        $(this).off("click.DT");
        $(this).off("keypress.DT");

        var wrapper = $("<div class='DataTables_sort_wrapper'><div class='DataTables_sort_interceptor'></div></div>");
        $(this).contents().appendTo(wrapper.find(".DataTables_sort_interceptor"));
        $(this).append(wrapper);
        // handle clicking on div as sorting
        $('.DataTables_sort_interceptor', this).on("click", function(event) {
          if (self.lock("sort")) {
            event.stopImmediatePropagation();
          }
        });
        // default sort handler for column with index
        self.dataTable.fnSortListener($('.DataTables_sort_wrapper', this), index);
      });
    },

    // Sets up filtering for the dataTable
    _setupFiltering: function() {
      var table = this;
      var cg = table.configGenerator();

      // Close active filter menu if user clicks on document
      $(document).click(function (event) {
        var targetIsMenu = $(event.target).hasClass('filterMenu');
        var targetIsButton = $(event.target).hasClass('btn');
        var parentIsMenu = false;
        if (event.target.offsetParent) {
          parentIsMenu = $(event.target.offsetParent).hasClass('filterMenu');
        }

        var canSlideUp = table.activeFilterMenu && ( !(targetIsMenu || parentIsMenu) || targetIsButton);
        if (canSlideUp) {
          table.activeFilterMenu.slideUp(100);
          table.activeFilterMenu = null;
        }
      });

      // We make a filter for each column header
      table.dataTable.find("thead th").each(function (index) {
        // here we use the CSS in the header to get the column config by attr
        // there isn't a better way to do this currently
        var col;
        var columnClassName = Backdraft.Utils.extractColumnCSSClass(this.className);
        if (columnClassName) {
          cg.columnsConfig.forEach(function(currentColConfig){
            if (currentColConfig.id && Backdraft.Utils.toColumnCSSClass(currentColConfig.id) === columnClassName) {
              col = currentColConfig;
            }
          })
        }
        else {
          // TODO: FAIL!!!
        }

        if (col) {
          // We only make the filter controls if there's a filter element in the column manager
          if (col.filter) {
            table.child("filter-"+col.id, new DataTableFilter({
              column: col,
              table: table,
              head: this,
              className: "dropdown DataTables_filter_wrapper"
            }));
            $(this).append(table.child("filter-"+col.id).render().$el);
          }
        }
      });
    },

    // events
    _onColumnReorder : function() {
      this.trigger("reorder");
      this._renderGrandTotalsRow();
    },

    _onDraw : function() {
      this.trigger("draw", arguments);
      this._renderGrandTotalsRow();
      this._renderHeaderGroup();
    },

    _onColumnVisibilityChange: function(summary) {
      this.dataTable.find(".dataTables_empty").attr("colspan", summary.visible.length);
      this._renderGrandTotalsRow();
      this._renderHeaderGroup();
    },

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
      this._triggerChangeSelection();
      event.stopPropagation();
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({
        el : node,
        model : model,
        columnsConfig: this.columnsConfig()
      });
      this.cache.set(model, row);
      this.child("child" + row.cid, row).render();
      // due to deferred rendering, the model associated with the row may have already been selected, but not rendered yet.
      this.selectionManager.has(model) && row.bulkState(true);
    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid });
      this._triggerChangeSelection();
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.selectionManager.process(model, false);
      this._triggerChangeSelection();
    },

    _onReset : function(collection) {
      if (!this.dataTable) return;
      this.dataTable.fnClearTable();
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // populate with preselected items
      this.selectionManager = new SelectionManager();
      _.each(this.selectedIds, function(id) {
        // its possible that a selected id is provided for a model that doesn't actually exist in the table, ignore it
        var selectedModel = this.collection.get(id);
        selectedModel && this._setRowSelectedState(selectedModel, null, true);
      }, this);

      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this._triggerChangeSelection();
    },

    _onColumnFilter: function() {
      this.trigger("filter:column");
    }

  }, {

    finalize : function(name, tableClass, views, pluginConfig, appName) {
      if (tableClass.prototype.rowClassName) {
        // method for late resolution of row class, removes dependency on needing access to the entire app
        tableClass.prototype._resolveRowClass = function() {
          return views[tableClass.prototype.rowClassName];
        };
      }

      // return all registered column types
      tableClass.prototype.availableColumnTypes = function() {
        return pluginConfig.columnTypes;
      };

      tableClass.prototype._triggerGlobalEvent = function(eventName, args) {
        $("body").trigger(appName + ":" + eventName, args);
      };
    }

  });

  return LocalDataTable;

})();
