var ColumnManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this.visibility = new Backbone.Model();
    this._configGenerator = new ColumnConfigGenerator(table);
    this._initEvents();
  },

  applyVisibilityPreferences: function() {
    var prefs = {};
    _.each(this.columnsConfig(), function(config) {
      if (config.id) {
        prefs[config.id] = config.visible;
      }
    });
    this.visibility.set(prefs);
  },

  columnAttrs: function() {
    return _.pluck(this.columnsConfig(), "attr");
  },

  dataTableColumnsConfig: function() {
    return this._configGenerator.dataTableColumns;
  },

  dataTableSortingConfig: function() {
    return this._configGenerator.dataTableSorting;
  },

  columnsConfig: function() {
    return this._configGenerator.columnsConfig;
  },

  columnConfigForId: function(id) {
    return this._configGenerator.columnConfigById.get(id);
  },

  columnsSwapped: function(fromIndex, toIndex) {
    this._configGenerator.columnsSwapped(fromIndex, toIndex);
    this.trigger("change:order");
  },

  columnsReordered: function() {
    this._configGenerator.columnsReordered();
  },

  changeSorting: function(sorting) {
    this._configGenerator._computeSortingConfig(sorting);
  },

  _initEvents: function() {
    this.visibility.on("change", function() {
      this._applyVisibilitiesToDataTable(this.visibility.changed);
      this.trigger("change:visibility", this._visibilitySummary());
    }, this);
  },

  _applyVisibilitiesToDataTable: function(columnIdStateMap) {
    _.each(columnIdStateMap, function(state, id) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexById.get(id), state, false);
    }, this);
  },

  _visibilitySummary: function() {
    var summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, function(state, id) {
      if (state) summary.visible.push(id);
      else       summary.hidden.push(id);
    });
    return summary;
  }
});
