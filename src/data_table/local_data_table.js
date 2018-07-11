import $ from "jquery";
import _ from "underscore";
import "bootstrap";
import "jquery-deparam";
import "./datatables";

import View from "../view";
import Cache from "../cache";

import ColumnManager from "./column_manager";

import SelectionManager from "./selection_manager";
import LockManager from "./lock_manager";

import FilterView from "./filter_view";

import { extractColumnCSSClass, toColumnCSSClass } from "../utils/css";

import cidMap from "./cid_map";
import Config from "./config";
import "jquery-deparam";

class LocalDataTable extends View {
  constructor(options) {
    super(options);

    this.options = options || {};

    // copy over certain properties from options to the table itself
    _.extend(this, _.pick(this.options, ["selectedIds", "paginate"]));
    _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw",
      "_onColumnVisibilityChange", "_onColumnReorder");

    this.cache = new Cache();
    this.selectionManager = new SelectionManager();
    this.rowClass = this.options.rowClass || this._resolveRowClass();
    this.config = this.options.config || (this._configFromPlugin && this._configFromPlugin()) || new Config();
    this._applyDefaults();
    this._columnManager = new ColumnManager(this);
    this._lockManager = new LockManager(this);

    this.listenTo(this.collection, "add", this._onAdd);
    this.listenTo(this.collection, "remove", this._onRemove);
    this.listenTo(this.collection, "reset", this._onReset);
  }

  availableColumnTypes() {
    return this.config.columnTypes;
  }

  // apply filtering
  filter(...args) {
    this._lockManager.ensureUnlocked("filter");
    this.dataTable.fnFilter(...args);
  }

  // change pagination
  page(...args) {
    this._lockManager.ensureUnlocked("page");
    return this.dataTable.fnPageChange(...args);
  }

  // sort specific columns
  sort(...args) {
    this._lockManager.ensureUnlocked("sort");
    return this.dataTable.fnSort(...args);
  }

  selectedModels() {
    this._lockManager.ensureUnlocked("bulk");
    return this.selectionManager.models();
  }

  render() {
    this.$el.html(this.template);
    this._dataTableCreate();
    this._initBulkHandling();
    this._enableRowHighlight();
    this.paginate && this._initPaginationHandling();
    this._triggerChangeSelection();
    this.paginate && this._setupPaginationHistory();
    this.trigger("render");
    this._afterRender();
    return this;
  }

  renderColumn(id) {
    const config = this._columnManager.columnConfigForId(id);
    if (!config) {
      throw new Error("column not found");
    }
    this.cache.each(row => {
      row.renderColumnByConfig(config);
    });
  }

  selectAllVisible(state) {
    this._lockManager.ensureUnlocked("bulk");
    this.bulkCheckbox.prop("checked", state);
    _.each(this._visibleRowsOnCurrentPage(), function(row) {
      this._setRowSelectedState(row.model, row, state);
    }, this);
    this._triggerChangeSelection({ selectAllVisible: state });
  }

  selectAllMatching() {
    this._lockManager.ensureUnlocked("bulk");
    if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
    _.each(this._allMatchingModels(), function(model) {
      this._setRowSelectedState(model, this.cache.get(model), true);
    }, this);
    this._triggerChangeSelection();
  }

  matchingCount() {
    this._lockManager.ensureUnlocked("bulk");
    return this.dataTable.fnSettings().aiDisplay.length;
  }

  totalRecordsCount() {
    this._lockManager.ensureUnlocked("bulk");
    return this.dataTable.fnSettings().fnRecordsTotal();
  }

  pageLimit() {
    return this.dataTable.fnSettings()._iDisplayLength;
  }

  columnRequired(state, id) {
    if (!state && this._columnManager.columnConfigForId(id).required) {
      throw new Error("can not disable visibility when column is required");
    }
  }

  columnVisibility(attr, state) {
    if (arguments.length === 1) {
      // getter
      return this._columnManager.visibility.get(attr);
    } else {
      this.columnRequired(state, attr);
      this._columnManager.visibility.set(attr, state);
      state && this.renderColumn(attr);
    }
  }

  // takes a hash of { columnAttr: columnState, ... }
  setColumnVisibilities(columns) {
    _.each(columns, this.columnRequired, this);
    this._columnManager.visibility.set(columns);
    _.each(columns, function(state, attr) {
      state && this.renderColumn(attr);
    }, this);
  }

  restoreColumnVisibility() {
    _.each(this.columnsConfig(), function(column) {
      if (column.id) {
        this.columnVisibility(column.id, column.visible);
      }
    }, this);
  }

  columnOrder(order) {
    if (this._reorderableColumnsEnabled()) {
      this._changeColumnOrder(order);
    }
  }

  restoreColumnOrder() {
    if (this._reorderableColumnsEnabled()) {
      this._changeColumnOrder({ reset: true });
    }
  }

  changeSorting(sorting) {
    this._columnManager.changeSorting(sorting);
    if (this.dataTable) {
      const normalizeSortingColumn = sort => _.first(sort, 2);
      sorting = _.map(this._columnManager.dataTableSortingConfig(), normalizeSortingColumn);
      let currentSorting = _.map(this.dataTable.fnSettings().aaSorting, normalizeSortingColumn);
      if (!_.isEqual(currentSorting, sorting)) {
        this.dataTable.fnSort(sorting);
      }
    }
  }

  lock(name, state) {
    if (arguments.length === 1) {
      // getter
      return this._lockManager.lock(name);
    } else if (arguments.length === 2) {
      // setter
      this._lockManager.lock(name, state);
    } else {
      throw new Error("#lock requires a name and/or a state");
    }
  }

  columnsConfig() {
    return this._columnManager.columnsConfig();
  }

  configGenerator() {
    return this._columnManager._configGenerator;
  }

  disableFilters(errorMessage) {
    const columns = this.columnsConfig();
    for (const c in columns) {
      if (!columns[c].filter) continue;
      this.child(`filter-${columns[c].id}`).disableFilter(errorMessage);
    }
  }

  enableFilters() {
    const columns = this.columnsConfig();
    for (const c in columns) {
      if (!columns[c].filter) continue;
      this.child(`filter-${columns[c].id}`).enableFilter();
    }
  }

  updateAjaxSource() {
    // get ajax url
    const ajaxURL = this.dataTable.fnSettings().sAjaxSource;
    // get the endpoint of ajax url
    const splitUrl = ajaxURL.split("?");
    const endpoint = splitUrl[0];

    // Early exit if no params
    if (!splitUrl[1]) {
      return;
    }

    // get parameters of ajax url
    const params = $.deparam(splitUrl[1]);

    // make ext_filter_json param the same as the current url, now with new filters
    params.ext_filter_json = JSON.stringify(this.configGenerator()._getUrlFilterParams());

    // Build new url with old endpoint but new params
    const newURL = `${endpoint}?${$.param(params)}`;

    // Update datatable ajax source
    this.dataTable.fnSettings().sAjaxSource = newURL;

    // trigger "filter:column" event
    this._onColumnFilter();
  }

  columnElements(selector) {
    const selectorString = selector || "";
    return this.$("table").find(`thead tr th${selectorString}`);
  }

  // Private APIs

  _enableReorderableColumns() {
    const self = this;
    self._colReorder = new $.fn.dataTable.ColReorder(this.dataTable, {
      fnReorderCallback(fromIndex, toIndex) {
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
  }

  _renderGrandTotalsRow() {
    let hasGrandTotalsCell = false;
    // if dataTable is available AND we have a totals row
    if (this.dataTable && this.totalsRow) {
      // If we don't have a footer rendered, render it
      if (this.dataTable.find("tfoot").length < 1) {
        this.dataTable.append("<tfoot><tr></tr></tfoot>");
      }

      // Clear the footer
      const $grandTotalsRow = this.dataTable.find("tfoot tr");
      $grandTotalsRow.html("");

      // Iterate over the current columns config
      this.columnsConfig().forEach(col => {
        if (this.columnVisibility(col.id) || col.bulk) {
          const node = $("<td>");
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
      });
    }
  }

  _renderHeaderGroup() {
    if (!_.isEmpty(this.rowClass.prototype.columnGroupDefinitions)) {
      const columnGroups = this.rowClass.prototype.columnGroupDefinitions;
      let tr = this.$("table").find('thead tr.header-groups-row');
      if (tr.length === 0) {
        tr = $('<tr class="header-groups-row">');
      } else {
        tr.empty();
      }

      const uniqueHeaderGroupDataIndex = {};

      _.each(this._columnManager._visibilitySummary().visible, col => {
        const columnConfig = _.findWhere(this._columnManager.columnsConfig(), { attr: col });
        let headerGroupDataIndex = columnConfig.headerGroupDataIndex;
        let columnGroupConfig = _.findWhere(columnGroups, { "headerGroupDataIndex": headerGroupDataIndex });

        if (!columnGroupConfig || !headerGroupDataIndex) {
          console.log(`Unable to find a matching headerGroupDataIndex for ${columnConfig.attr}`);
          columnGroupConfig = { colspan: 1, headerName: '' };
          headerGroupDataIndex = columnConfig.title;
        }

        if (columnGroupConfig && !uniqueHeaderGroupDataIndex[headerGroupDataIndex]) {
          uniqueHeaderGroupDataIndex[headerGroupDataIndex] = true;
          tr.append(`<th colspan="${columnGroupConfig.colspan}" class="header-groups">${columnGroupConfig.headerName}</th>`);
        }
      });

      this.$("table").find('thead').prepend(tr);
    }
  }

  // Changes or resets the column order.
  // When called with no args, returns the current order.
  // Call with { reset : true } to have it restore column order to initial configuration
  // Provide array of indexes as first argument to have it reordered by that
  _changeColumnOrder(order) {
    if (this._colReorder) {
      const columnsOrig = _.clone(this.dataTable.fnSettings().aoColumns);
      if (_.isArray(order)) {
        this._colReorder.fnOrder(order);
      } else if (_.has(order, 'reset') && order.reset) {
        this._colReorder.fnReset();
      } else {
        return this._colReorder.fnOrder();
      }

      // restore columnsConfig order to match the underlying order from dataTable
      const columnsConfig = this.columnsConfig();
      const columnsConfigOrig = _.clone(columnsConfig);
      // reset config
      columnsConfig.splice(0, columnsConfig.length);
      // fill in config in correct order
      _.each(this.dataTable.fnSettings().aoColumns, tableColumn => {
        const oldIndex = columnsOrig.indexOf(tableColumn);
        if (oldIndex !== -1) {
          columnsConfig.push(columnsConfigOrig[oldIndex]);
        }
      });

      this._columnManager.columnsReordered();
    }
  }

  _allMatchingModels() {
    // returns all models matching the current filter criteria, regardless of pagination
    // since we are using deferred rendering, the dataTable.$ and dataTable._ methods don't return all
    // matching data since some of the rows may not have been rendered yet.
    // here we use the the aiDisplay property to get indicies of the data matching the current filtering
    // and return the associated models
    return _.map(this.dataTable.fnSettings().aiDisplay, function(index) {
      return this.collection.at(index);
    }, this);
  }

  _applyDefaults() {
    _.defaults(this, {
      sorting: [[0, this.paginate ? "desc" : "asc"]]
    });

    if (!this.objectName.plural) {
      throw new Error("plural object name must be provided");
    } else if (!this.objectName.singular) {
      throw new Error("singular object name must be provided");
    }
  }

  // returns row objects that have not been filtered out and are on the current page
  _visibleRowsOnCurrentPage() {
    // non-paginated tables will return all rows, ignoring the page param
    const visibleRowsCurrentPageArgs = { filter: "applied", page: "current" };
    return this.dataTable.$("tr", visibleRowsCurrentPageArgs).map((index, node) => $(node).data("row"));
  }

  _setRowSelectedState(model, row, state) {
    this.selectionManager.process(model, state);
    // the row may not exist yet as we utilize deferred rendering. we track the model as
    // selected and make the ui reflect this when the row is finally created
    row && row.bulkState(state);
  }

  _dataTableCreate() {
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
      this.$("table").addClass("dataTable-resizeableColumns");
    }

    if (this.striped) {
      this.$("table").addClass("table-striped");
    }
  }

  _areAllVisibleRowsSelected() {
    let allSelected;
    const visibleRows = this._visibleRowsOnCurrentPage();
    if (visibleRows.length) {
      allSelected = _.all(visibleRows, row => row.bulkState() === true);
    } else {
      // have no selections does not count as having all selected
      allSelected = false;
    }
    return allSelected;
  }

  // when changing between pages / filters we set the header bulk checkbox state based on whether all newly visible rows are selected or not
  // note: we defer execution as the "page" and "filter" events are called before new rows are swapped in
  // this allows our code to run after the all the new rows are inserted
  _bulkCheckboxAdjust() {
    if (!this.bulkCheckbox) return;
    _.defer(() => {
      this.bulkCheckbox.prop("checked", this._areAllVisibleRowsSelected());
    });
  }

  // Do not enable when  columnGroupDefinitions is defined and not empty.
  _reorderableColumnsEnabled() {
    return this.reorderableColumns && _.isEmpty(this.rowClass.prototype.columnGroupDefinitions);
  }

  _initPaginationHandling() {
    this.dataTable.on("page", this._bulkCheckboxAdjust);
  }

  _setupPaginationHistory() {
    this.dataTable.on("page", () => {
      let page = this.dataTable.fnPagingInfo().iPage;
      if (page !== this._parsePageNumberFromQueryString() - 1) {
        history.pushState({}, "pagination", this._createQueryStringWithPageNumber(page + 1));
      }
    });
    window.onpopstate = () => {
      this._goToPageFromQueryString();
    };
  }

  _afterRender() {
    if (this.paginate) {
      this._goToPageFromQueryString();
    }
  }

  _goToPageFromQueryString() {
    let pageNumber = this._parsePageNumberFromQueryString() - 1;
    if (pageNumber >= 0) {
      this.page(pageNumber);
    }
  }

  _urlParameters() {
    return $.deparam(window.location.href.split("?")[1] || "");
  }

  _createQueryStringWithPageNumber(pageNumber) {
    let urlParameters = this._urlParameters();
    urlParameters.page = pageNumber;
    return "?" + $.param(urlParameters);
  }

  _parsePageNumberFromQueryString() {
    let parameters = this._urlParameters();
    let page = parseInt(parameters.page);
    if (isNaN(page)) {
      return 1;
    } else {
      return page;
    }
  }

  _initBulkHandling() {
    const bulkCheckbox = this.$el.find(this.BULK_COLUMN_HEADER_CHECKBOX_SELECTOR);
    if (!bulkCheckbox.length) return;
    this.bulkCheckbox = bulkCheckbox;
    this.bulkCheckbox.click(this._onBulkHeaderClick);
    this.dataTable.on("click", this.BULK_COLUMN_CHECKBOXES_SELECTOR, this._onBulkRowClick);
    this.dataTable.on("filter", this._bulkCheckboxAdjust);
  }

  _enableRowHighlight() {
    this.dataTable.on("click", this.ROWS_SELECTOR, this._onRowHighlightClick);
  }

  _onRowHighlightClick(event) {
    const el = $(event.target).closest("tr");
    const currentState = el.hasClass("highlighted");
    $(event.target).closest("tbody").find('tr').toggleClass('highlighted', false);
    el.toggleClass("highlighted", !currentState);
  }

  _dataTableConfig() {
    let displayStart = (this._parsePageNumberFromQueryString() - 1) * this.paginateLength;
    let recordTotal = displayStart + this.paginateLength;
    return {
      sDom: this.layout,
      bDeferRender: true,
      bPaginate: this.paginate,
      aLengthMenu: this.paginateLengthMenu,
      iDisplayLength: this.paginateLength,
      iDisplayStart: displayStart,
      iRecordsTotal: recordTotal,
      iRecordsDisplay: recordTotal,
      bInfo: true,
      fnCreatedRow: this._onRowCreated,
      aoColumns: this._columnManager.dataTableColumnsConfig(),
      aaSorting: this._columnManager.dataTableSortingConfig(),
      fnDrawCallback: this._onDraw,
      oLanguage: {
        sEmptyTable: this.emptyText
      }
    };
  }

  _triggerChangeSelection(extraData) {
    const data = _.extend(extraData || {}, { count: this.selectionManager.count() });
    this.trigger("change:selected", data);
  }

  _setupSelect2PaginationAttributes() {
    this.$('select')
      .attr('data-plugin', 'select2')
      .css('width', '5em');
  }

  // DataTables does not provide a good way to programmatically disable sorting, so we:
  // 1) remove the default sorting event handler that dataTables adds
  // 2) Create a div and put the header in it.  We need to do this so sorting doesn't conflict with filtering
  // on the click events.
  // 3) insert our own event handler on the div that stops the event if we are locked
  // 4) re-insert the dataTables sort event handler
  _installSortInterceptors() {
    const self = this;
    this.dataTable.find("thead th").each(function(index) {
      $(this).off("click.DT");
      $(this).off("keypress.DT");

      const wrapper = $("<div class='DataTables_sort_wrapper'><div class='DataTables_sort_interceptor'></div></div>");
      $(this).contents().appendTo(wrapper.find(".DataTables_sort_interceptor"));
      $(this).append(wrapper);
      // handle clicking on div as sorting
      $('.DataTables_sort_interceptor', this).on("click", event => {
        if (self.lock("sort")) {
          event.stopImmediatePropagation();
        } else {
          history.pushState({}, "pagination", self._createQueryStringWithPageNumber(1));
        }
      });
      // default sort handler for column with index
      self.dataTable.fnSortListener($('.DataTables_sort_wrapper', this), index);
    });
  }

  // Sets up filtering for the dataTable
  _setupFiltering() {
    const table = this;
    const cg = table.configGenerator();

    // Close active filter menu if user clicks on document
    $("body").on("click", e => {
      $("[data-toggle='filter-popover']").each(function() {
        if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $(".popover").has(e.target).length === 0) {
          $(this).popover("hide");
        }
      });
    });

    // We make a filter for each column header
    table.dataTable.find("thead th").each(function(index) {
      // here we use the CSS in the header to get the column config by attr
      // there isn't a better way to do this currently
      let col;
      const columnClassName = extractColumnCSSClass(this.className);
      if (columnClassName) {
        cg.columnsConfig.forEach(currentColConfig => {
          if (currentColConfig.id && toColumnCSSClass(currentColConfig.id) === columnClassName) {
            col = currentColConfig;
          }
        });
      } else {
        // TODO: FAIL!!!
      }

      if (col) {
        // We only make the filter controls if there's a filter element in the column manager
        if (col.filter) {
          table.child(`filter-${col.id}`, new FilterView({
            column: col,
            table,
            head: this,
            className: "dropdown DataTables_filter_wrapper"
          }));
          $(this).append(table.child(`filter-${col.id}`).render().$el);
        }
      }
    });
  }

  // events
  _onColumnReorder() {
    this.trigger("reorder");
    this._renderGrandTotalsRow();
  }

  _onDraw() {
    this.trigger("draw", arguments);
    this._renderGrandTotalsRow();
    this._renderHeaderGroup();
  }

  _onColumnVisibilityChange(summary) {
    this.dataTable.find(".dataTables_empty").attr("colspan", summary.visible.length);
    this._renderGrandTotalsRow();
    this._renderHeaderGroup();
  }

  _onBulkHeaderClick(event) {
    const state = this.bulkCheckbox.prop("checked");
    this.selectAllVisible(state);
    // don't let dataTables sort this column on the click of checkbox
    event.stopPropagation();
  }

  _onBulkRowClick(event) {
    const checkbox = $(event.target);
    const row = checkbox.closest("tr").data("row");
    const checked = checkbox.prop("checked");
    // ensure that when a single row checkbox is unchecked, we uncheck the header bulk checkbox
    if (!checked) this.bulkCheckbox.prop("checked", false);
    this._setRowSelectedState(row.model, row, checked);
    this._triggerChangeSelection();
    event.stopPropagation();
  }

  _onRowCreated(node, data) {
    const model = this.collection.get(data);
    // eslint-disable-next-line new-cap
    const row = new this.rowClass({
      el: node,
      model,
      columnsConfig: this.columnsConfig()
    });
    this.cache.set(model, row);
    this.child(`child${row.cid}`, row).render();
    // due to deferred rendering, the model associated with the row may have already been selected, but not rendered yet.
    this.selectionManager.has(model) && row.bulkState(true);
  }

  _onAdd(model) {
    if (!this.dataTable) return;
    this.dataTable.fnAddData({ cid: model.cid });
    this._triggerChangeSelection();
  }

  _onRemove(model) {
    if (!this.dataTable) return;
    const cache = this.cache;
    const row = cache.get(model);
    this.dataTable.fnDeleteRow(row.el, () => {
      cache.unset(model);
      row.close();
    });
    this.selectionManager.process(model, false);
    this._triggerChangeSelection();
  }

  _onReset(collection) {
    if (!this.dataTable) return;
    this.dataTable.fnClearTable();
    this.cache.each(row => {
      row.close();
    });
    this.cache.reset();
    // populate with preselected items
    this.selectionManager = new SelectionManager();
    _.each(this.selectedIds, function(id) {
      // its possible that a selected id is provided for a model that doesn't actually exist in the table, ignore it
      const selectedModel = this.collection.get(id);
      selectedModel && this._setRowSelectedState(selectedModel, null, true);
    }, this);

    // add new data
    this.dataTable.fnAddData(cidMap(collection));
    this._triggerChangeSelection();
  }

  _onColumnFilter() {
    this.trigger("filter:column");
  }
}

_.extend(LocalDataTable.prototype, {
  BULK_COLUMN_HEADER_CHECKBOX_SELECTOR: "th:first.bulk :checkbox",
  BULK_COLUMN_CHECKBOXES_SELECTOR: "td:first-child.bulk :checkbox",
  ROWS_SELECTOR: "tbody tr",
  template: '<table cellpadding="0" class="table"></table>',
  paginate: true,
  paginateLengthMenu: [10, 25, 50, 100],
  paginateLength: 10,
  selectedIds: [],
  filteringEnabled: false,
  layout: "<'row'<'col-xs-6'l><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
  striped: true,
  reorderableColumns: true,
  resizableColumns: false,
  objectName: {
    singular: "row",
    plural: "rows"
  }
});

export default LocalDataTable;
