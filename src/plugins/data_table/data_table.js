var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var LocalDataTable = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw", "_onColumnVisibilityChange");
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

    // Private APIs

    _enableReorderableColumns: function() {
      var self = this;
      new $.fn.dataTable.ColReorder(this.dataTable, {
        fnReorderCallback: function(fromIndex, toIndex) {
          // notify that columns have been externally rearranged
          self._columnManager.columnsSwapped(fromIndex, toIndex);
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
      this._createFilterControls();
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

    // dataTables does not provide a good way to programmatically disable sorting, so we:
    // 1) remove the default sorting event handler that dataTables adds
    // 2) Create a div and put the header in it.  We need to do this so sorting doesn't conflict with filtering
    // on the click events.
    // 3) insert our own event handler on the div that stops the event if we are locked
    // 4) re-insert the dataTables sort event handler
    // currently there's a bug where this resets when a column is moved.
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

    // Creates the filter controls for the dataTable in thead th
    // Supports:
    //  * String search, with a single input box
    //  * Numeric search, with three input boxes for >, <, =
    //  * List search, with a checklist
    _createFilterControls: function() {
      var cg = this._columnManager._configGenerator;
      var that = this;

      this.dataTable.find("thead th").each(function (index) {
        var title = this.outerText;
        var col = cg.columnConfigByTitle.attributes[title];
        var filter = col.filter;
        var listClass = "single";

        if (filter) {
          // if the column has a filter element, create filter controls
          if (filter.type == "string") {
            // if filter type is search, create input
            $(this).append('<input class="search" id ="value" type="text" placeholder="Search ' + title + '" />');
          } else if (filter.type == "numeric") {
            // if filter type is numeric, create multiple labeled inputs
            $(this).append('<ul> <li>&gt; <input id="gt" class="numeric" type="text" /></li>'+
                '<li>&lt; <input id="lt" class="numeric" type="text"/></li>'+
                '<li> = <input id="eq" class="numeric" type="text" /></li> </ul>');
          } else if (filter.type == "list") {
            // handle long lists in multiple columns
            if (filter.options.length > 30)
              listClass = "triple"
            else if (filter.options.length > 15)
              listClass = "double";
            // if filter type is checklist, create checklist
            var checkList = '<ul>';
            for (var i = 0; i < filter.options.length; i++) {
              checkList += '<li><label><input class="list" id="value" type="checkbox" name="'+col.attr+'" value="'+filter.options[i]+'" /> '+
                  filter.options[i]+'</label></li>';
            }
            checkList += '</ul>';
            $(this).append(checkList);
          }

          // need to manually focus on inputs because we disabled the click event for thead
          // when installing sort interceptors
          $('input', this).on("click", function () {
            this.focus();
          });
          $('input', this).on('focusout change', function() {
            if (filter.type == "list") {
              if (this.checked) {
                filter[this.id] = filter[this.id] || [];
                filter[this.id].push(this.value);
              }
              else {
                var index = filter[this.id].indexOf(this.value);
                if (index > -1)
                  filter[this.id].splice(index, 1);
                if (filter[this.id].length == 0)
                  filter[this.id] = null;
              }
            } else if (this.value == "") {
              filter[this.id] = null;
            } else {
              filter[this.id] = this.value;
            }
            that.dataTable._fnAjaxUpdate();
          });

          // create filtering wrapper div
          var wrapperDiv = document.createElement('div');
          wrapperDiv.className = "DataTables_filter_wrapper";
          var wrapperID = 'wrapper-'+col.attr;
          wrapperDiv.id = wrapperID;
          wrapperDiv.innerHTML = 'Filter';

          // create filtering menu div
          var filterDiv = document.createElement('div');
          filterDiv.className = "filterMenu "+listClass;
          var filterID = 'menu-'+col.attr;
          filterDiv.id = filterID;
          wrapperDiv.appendChild(filterDiv);

          // put filtering controls in filter div and put wrapper div in header
          if (filter.type == "string")
            $('input', this).appendTo(filterDiv)
          else
            $('ul', this).appendTo(filterDiv);
          this.appendChild(wrapperDiv);

          // handle hovering on wrapperDiv
          $('.DataTables_filter_wrapper', this).hover(function() {
            $('.filterMenu', this).slideDown(200);
          }, function() {
            $('.filterMenu', this).slideUp(50);
          });
        }
      });
    },

    // events

    _onReorder : function() {
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
