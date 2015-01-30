var ColumnManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this._columnIndexByTitle = this._computeColumnIndexByTitle();
    this.configGenerator = new ColumnConfigGenerator(table, this._columnIndexByTitle);
    this.visibility = new Backbone.Model();
    this._initEvents();
  },

  applyVisibilityPreferences: function() {
    // for now we are assuming that all columns are initially visible, this will need to take into account
    // other things in the futures
    var prefs = {};
    _.each(this._columnIndexByTitle.keys(), function(title) {
      prefs[title] = true;
    });
    this.visibility.set(prefs);
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
      this.table.dataTable.fnSetColumnVis(this._columnIndexByTitle.get(title), state, false);
    }, this);
  },

  _computeColumnIndexByTitle: function() {
    var model = new Backbone.Model();
    _.each(this.table.columns, function(col, index) {
      col.title && model.set(col.title, index);
    }, this);
    return model;
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
