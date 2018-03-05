import Backbone from "backbone";
import _ from "underscore";

import ColumnConfigGenerator from "./column_config_generator";

class ColumnManager {
  constructor(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this.visibility = new Backbone.Model();
    this._configGenerator = new ColumnConfigGenerator(table);
    this._initEvents();
  }

  applyVisibilityPreferences() {
    const prefs = {};
    _.each(this.columnsConfig(), config => {
      if (config.id) {
        prefs[config.id] = config.visible;
      }
    });
    this.visibility.set(prefs);
  }

  columnAttrs() {
    return _.pluck(this.columnsConfig(), "attr");
  }

  dataTableColumnsConfig() {
    return this._configGenerator.dataTableColumns;
  }

  dataTableSortingConfig() {
    return this._configGenerator.dataTableSorting;
  }

  columnsConfig() {
    return this._configGenerator.columnsConfig;
  }

  columnConfigForId(id) {
    return this._configGenerator.columnConfigById.get(id);
  }

  columnsSwapped(fromIndex, toIndex) {
    this._configGenerator.columnsSwapped(fromIndex, toIndex);
    this.trigger("change:order");
  }

  columnsReordered() {
    this._configGenerator.columnsReordered();
  }

  changeSorting(sorting) {
    this._configGenerator._computeSortingConfig(sorting);
  }

  _initEvents() {
    this.visibility.on("change", function() {
      this._applyVisibilitiesToDataTable(this.visibility.changed);
      this.trigger("change:visibility", this._visibilitySummary());
    }, this);
  }

  _applyVisibilitiesToDataTable(columnIdStateMap) {
    _.each(columnIdStateMap, function(state, id) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexById.get(id), state, false);
    }, this);
  }

  _visibilitySummary() {
    const summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, (state, id) => {
      if (state) summary.visible.push(id);
      else       summary.hidden.push(id);
    });
    return summary;
  }
}

export default ColumnManager;
