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
      if (config.attr) {
        prefs[config.attr] = config.visible;
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

  columnConfigForAttr: function(attr) {
    return this._configGenerator.columnConfigByAttr.get(attr);
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

  _applyVisibilitiesToDataTable: function(attrStateMap) {
    _.each(attrStateMap, function(state, attr) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexByAttr.get(attr), state, false);
    }, this);
  },

  _visibilitySummary: function() {
    var summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, function(state, attr) {
      if (state) summary.visible.push(attr);
      else       summary.hidden.push(attr);
    });
    return summary;
  }
});
