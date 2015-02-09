var ColumnManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this._userColumnConfig = _.clone(_.result(table.rowClass.prototype, "columns"));
    if (!_.isArray(this._userColumnConfig)) throw new Error("Invalid column configuration provided");
    this._configGenerator = new ColumnConfigGenerator(table, this._userColumnConfig);
    this.columnConfig = this._configGenerator.columns();
    this.sortingConfig = this._configGenerator.sorting();
    this.visibility = new Backbone.Model();
    this._initEvents();
  },

  applyVisibilityPreferences: function() {
    // for now we are assuming that all columns are initially visible, this will need to take into account
    // other things in the futures
    var prefs = {};
    _.each(this._configGenerator.columnIndexByTitle.keys(), function(title) {
      prefs[title] = true;
    });
    this.visibility.set(prefs);
  },

  columnAttrs: function() {
    return _.pluck(this._userColumnConfig, "attr");
  },

  _initEvents: function() {
    this.visibility.on("change", function() {
      this._applyVisibilitiesToDataTable(this.visibility.changed);
      this.trigger("change:visibility", this._visibilitySummary());
    }, this);
  },

  _applyVisibilitiesToDataTable: function(titleStateMap) {
    _.each(titleStateMap, function(state, title) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexByTitle.get(title), state, false);
    }, this);
  },

  _visibilitySummary: function() {
    var summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, function(state, title) {
      if (state) summary.visible.push(title);
      else       summary.hidden.push(title);
    });
    return summary;
  }
});
