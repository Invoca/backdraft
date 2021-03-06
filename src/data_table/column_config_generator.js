import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import "jquery-deparam";

import { toCSSClass } from "../utils/css";

class ColumnConfigGenerator {
  constructor(table) {
    this.table = table;
    this.columnIndexById = new Backbone.Model();
    this.columnConfigById = new Backbone.Model();
    this._computeColumnConfig();
    this._computeColumnLookups();
    this._computeSortingConfig();
  }

  columnsSwapped(fromIndex, toIndex) {
    // move the config around and recompute lookup models
    const removed = this.columnsConfig.splice(fromIndex, 1)[0];
    this.columnsConfig.splice(toIndex, 0, removed);
    this._computeColumnLookups();
  }

  columnsReordered() {
    this._computeColumnLookups();
  }

  _getUrlFilterParams() {
    const urlParamString = window.location.href.split("?")[1];
    if (urlParamString && $.deparam(urlParamString) && ($.deparam(urlParamString).filter_json || $.deparam(urlParamString).ext_filter_json)) {
      return JSON.parse($.deparam(urlParamString).filter_json || $.deparam(urlParamString).ext_filter_json);
    } else {
      return [];
    }
  }

  _computeColumnConfig() {
    this.dataTableColumns = [];
    this.columnsConfig = _.clone(_.result(this.table.rowClass.prototype, "columns"));
    if (!_.isArray(this.columnsConfig)) throw new Error("Invalid column configuration provided");
    this.columnsConfig = _.reject(this.columnsConfig, columnConfig => {
      if (!columnConfig.present) {
        return false;
      } else {
        return !columnConfig.present();
      }
    });
    this.columnsConfig = this._addAttrsToColumnsWhenMissing(this.columnsConfig);

    // make the bulk column the first one if present
    this.columnsConfig = _.sortBy(this.columnsConfig, columnConfig => !columnConfig.bulk);

    this._getUrlFilterParams().forEach((element, index, array) => {
      const columnConfigIndex = _.findIndex(this.columnsConfig, { attr: element.attr });
      if (columnConfigIndex >= 0) {
        this.columnsConfig[columnConfigIndex].filter[element.comparison] = element.value;
      }
    });

    _.each(this._determineColumnTypes(), function(columnType, index) {
      const config = this.columnsConfig[index];
      const definition = columnType.definition()(this.table, config);

      if (!_.has(config, "required")) {
        config.required = false;
      }
      if (!_.has(config, "visible")) {
        config.visible = true;
      }

      if (config.required === true && config.visible === false) {
        throw new Error("column can't be required, but not visible");
      }

      this.dataTableColumns.push(definition);
      config.nodeMatcher = columnType.nodeMatcher();
      // use column type's default renderer if the config doesn't supply one
      if (!config.renderer) config.renderer = columnType.renderer();
    }, this);
  }

  _computeSortingConfig(sorting) {
    let columnIndex;
    let direction;
    const sortingInfo = sorting || this.table.sorting;
    this.dataTableSorting = _.map(sortingInfo, function(sortConfig) {
      columnIndex = sortConfig[0];
      direction = sortConfig[1];

      // column index can be provided as the column id, so convert to index
      if (_.isString(columnIndex)) {
        const foundColumnIndex = this.columnIndexById.get(columnIndex);
        if (typeof foundColumnIndex === "undefined") {
          throw new Error(`Could not find columnIndex by column ID: ${columnIndex}`);
        }

        columnIndex = foundColumnIndex;
      }

      return [columnIndex, direction];
    }, this);
  }

  _computeColumnLookups() {
    this.columnIndexById.clear();
    this.columnConfigById.clear();
    _.each(this.columnsConfig, function(col, index) {
      if (col.id) {
        this.columnIndexById.set(col.id, index);
        this.columnConfigById.set(col.id, col);
      }
    }, this);
  }

  _determineColumnTypes() {
    // match our table's columns to available column types
    const availableColumnTypes = this.table.availableColumnTypes();
    return _.map(this.columnsConfig, (config, index) => {
      const columnType = _.find(availableColumnTypes, type => type.configMatcher()(config));

      if (!columnType) {
        throw new Error(`could not find matching column type: ${JSON.stringify(config)}`);
      } else {
        return columnType;
      }
    });
  }

  _addAttrsToColumnsWhenMissing(columnsConfig) {
    _.each(columnsConfig, columnConfig => {
      if (columnConfig.attr || columnConfig.title) {
        columnConfig.id = columnConfig.attr || toCSSClass(columnConfig.title);
      }
    });

    return columnsConfig;
  }
}

export default ColumnConfigGenerator;
