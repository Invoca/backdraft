var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var DEFAULT_JST_DELIMS = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  var DataTableFilter = Base.View.extend({
    filterTemplate : _.template('\
      <div class="toggle-filter-button" data-toggle="dropdown">\
        <span class="<%= filterButtonClass %>"></span>\
      </div>\
    ', null, DEFAULT_JST_DELIMS),

    filterMenuTemplate : _.template('\
      <div class="filterMenu dropdown-menu <%= listClass %>">\
        <% if (filter.type === "string") { %>\
          <input class="filter-string" id ="value" type="text" placeholder="Search <%= title %>" />\
        <% } else if (filter.type === "numeric") { %>\
          <ul>\
            <li> &gt; <input id="gt" class="filter-numeric" type="text" /></li> \
            <li> &lt; <input id="lt" class="filter-numeric" type="text"/></li> \
            <li> = <input id="eq" class="filter-numeric" type="text" /></li> \
          </ul>\
        <% } else if (filter.type === "list") { %>\
          <ul>\
            <% _.each(filter.options, function(element, index) { %>\
              <li>\
                <label>\
                  <input class="list" id="value" type="checkbox" name="<%= attr %>" value="<%= element %>" /> \
                  <%= element %>\
                </label>\
              </li>\
            <% }) %>\
          </ul>\
        <% } %>\
        <button class="btn btn-primary btn-sm btn-filter" name="button" type="submit" title="">Filter</button>\
        <button class="btn btn-primary btn-sm btn-clear" name="button" type="submit" title="">Clear</button>\
      </div>\
    ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
      "click input": "_onInputClick",
      "change input": "_onInputChange",
      "click .btn-filter": "_onFilterClick",
      "click .btn-clear": "_onClearClick"
    },

    initialize: function(options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";
    },

    render: function() {
      this.$el.html( this.filterTemplate( { filterButtonClass : this.filterButtonClass } ));
      // build filter menu
      this._buildFilterMenu();
      return this;
    },

    _buildFilterMenu: function() {
      // handle listClass
      var listClass = "";
      if (this.filter.type === "list") {
        if (this.filter.options.length > 30) {
          listClass = " triple";
        } else if (this.filter.options.length > 15) {
          listClass = " double";
        } else {
          listClass = " single";
        }
      }

      // append filter menu to filter wrapper
      this.$el.append(
        this.filterMenuTemplate({
          filter: this.filter,
          title: this.title,
          attr: this.attr,
          listClass: listClass
        })
      );
    },

    _onToggleClick: function(event) {
      var table = this.table;
      event.stopImmediatePropagation();
      var currentFilterMenu = $('.filterMenu', this.$el);
      if ((table.activeFilterMenu) && (table.activeFilterMenu.is(currentFilterMenu))) {
        table.activeFilterMenu.slideUp(100);
        table.activeFilterMenu = null;
      } else if (table.activeFilterMenu) {
        table.activeFilterMenu.slideUp(100, function () {
          table.activeFilterMenu = currentFilterMenu;
          table.activeFilterMenu.slideDown(200);
        });
      } else {
        table.activeFilterMenu = currentFilterMenu;
        table.activeFilterMenu.slideDown(200);
      }
    },

    _onInputClick: function(event) {
      event.target.focus();
      event.stopImmediatePropagation();
    },

    _onFilterClick: function() {
      $("input[type=text]", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    },

    _onClearClick: function() {
      $("input[type=text]", this.head).val("");
      $("input[type=checkbox]", this.head).attr("checked", false);
      $("input", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    },

    _onInputChange: function(event) {
      var filterIcon = $("span", this.$el);
      var filterInput = event.target;
      var inputID = filterInput.id;
      // handle list filters
      if (this.filter.type === "list") {
        if (filterInput.checked) {
          this.filter[inputID] = this.filter[inputID] || [];
          this.filter[inputID].push(filterInput.value);
          this.table._toggleIcon(filterIcon, true);
        }
        // remove filter from column manager if it is defined
        else if (this.filter[inputID]) {
          var index = this.filter[inputID].indexOf(filterInput.value);
          if (index > -1)
            this.filter[inputID].splice(index, 1);
          if (this.filter[filterInput.id].length === 0) {
            this.filter[inputID] = null;
            this.table._toggleIcon(filterIcon, false);
          }
        }
        // handle standard text and numeric input filters
      } else if (filterInput.value === "") {
        this.filter[inputID] = null;
        this.table._toggleIcon(filterIcon, false);
      } else {
        this.filter[inputID] = filterInput.value;
        this.table._toggleIcon(filterIcon, true);
      }
    }
  });

  var LocalDataTable = Base.View.extend({

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
      this.paginate && this._initPaginationHandling();
      this._triggerChangeSelection();
      return this;
    },

    renderColumn: function(title) {
      var config = this._columnManager.columnConfigForTitle(title);
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

    columnVisibility: function(title, state) {
      if (arguments.length === 1) {
        // getter
        return this._columnManager.visibility.get(title);
      } else {
        if (!state && this._columnManager.columnConfigForTitle(title).required) {
          throw new Error("can not disable visibility when column is required");
        }
        this._columnManager.visibility.set(title, state);
        state && this.renderColumn(title);
      }
    },

    restoreColumnVisibility: function() {
      _.each(this.columnsConfig(), function(column) {
        if (column.title) {
          this.columnVisibility(column.title, column.visible);
        }
      }, this);
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

    // Private APIs

    _enableReorderableColumns: function() {
      var self = this;
      new $.fn.dataTable.ColReorder(this.dataTable, {
        fnReorderCallback: function(fromIndex, toIndex) {
          // notify that columns have been externally rearranged
          self._columnManager.columnsSwapped(fromIndex, toIndex);
          // pass event up
          self._onColumnReorder();
        }
      });
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
      this._installSortInterceptors();
      this.filteringEnabled && this._setupFiltering();
      this.reorderableColumns && this._enableReorderableColumns();
      this._columnManager.on("change:visibility", this._onColumnVisibilityChange);
      this._columnManager.applyVisibilityPreferences()
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
        aoColumns : this._columnManager.dataTableColumnsConfig(),
        aaSorting : this._columnManager.dataTableSortingConfig(),
        fnDrawCallback : this._onDraw
      };
    },

    _triggerChangeSelection: function(extraData) {
      var data = _.extend(extraData || {}, { count : this.selectionManager.count() });
      this.trigger("change:selected", data);
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
        // put the header text in a div
        var nDiv = document.createElement('div');
        nDiv.className = "DataTables_sort_wrapper";
        $(this).contents().appendTo(nDiv);
        this.appendChild(nDiv);
        // handle clicking on div as sorting
        $('.DataTables_sort_wrapper', this).on("click", function(event) {
          if (self.lock("sort")) {
            event.stopImmediatePropagation();
          }
        });
        // default sort handler for column with index
        self.dataTable.fnSortListener($('.DataTables_sort_wrapper', this), index);
      });
    },

    // This toggles a filter icon between filters set icon and no filters set icon
    _toggleIcon: function(icon, enabled) {
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
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
        // here we use the text in the header to get the column config by title
        // there isn't a better way to do this currently
        var title = this.outerText;
        var col = cg.columnConfigByTitle.attributes[title];

        if (col) {
          // We only make the filter controls if there's a filter element in the column manager
          if (col.filter) {
            table.child("filter-"+col.attr, new DataTableFilter({
              column: col,
              table: table,
              head: this,
              className: "dropdown DataTables_filter_wrapper"
            }));
            $(this).append(table.child("filter-"+col.attr).render().$el);
          }
        }
      });
    },

    // events
    _onColumnReorder : function() {
      this.trigger("reorder");
    },

    _onDraw : function() {
      this.trigger("draw", arguments);
    },

    _onColumnVisibilityChange: function(summary) {
      this.dataTable.find(".dataTables_empty").attr("colspan", summary.visible.length);
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
      this.dataTable.fnAddData({ cid : model.cid })
      this._triggerChangeSelection();
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
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
      }
    }

  });

  return LocalDataTable;

})();
