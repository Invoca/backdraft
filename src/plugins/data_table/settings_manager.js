var SettingsManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    this.table = table;
    this.reportSettings = table.options.reportSettings;
    this.table.on("render", this._onTableRender, this);
  },

  _cacheSettingsState : function(state) {
    this.settingsState = state || this._getCurrentSettingsState();
  },

  _onTableRender: function() {
    if (this.reportSettings && !this.settingsState) {
      this._cacheSettingsState();
      this.table.on("draw", this._onTableDraw, this);
      this.table._columnManager.on("change:visibility", this._onColumnVisibilityChange, this);
      this.table._columnManager.on("change:order", this._onColumnOrderChange, this);
    }
  },

  _getCurrentSettingsState: function() {
    return {
      columnVisibility: _.reduce(this.table.columnsConfig(), function(memo, column) {
        memo[column.attr] = this.table.columnVisibility(column.title);
        return memo;
      }, {}, this),
      columnOrder: _.map(this.table.columnsConfig(), function(column) { return column.attr; }),
      sorting: _.clone(this.table.dataTable.fnSettings().aaSorting)
    };
  },

  _onTableDraw: function() {
    currentSettings = this._getCurrentSettingsState();
    if (!_.isEqual(this.settingsState.sorting, currentSettings.sorting)) {
      var sortConfig = _.map(currentSettings.sorting, function(sortColumn) {
        var columnIdx = sortColumn[0];
        var column = this.table.columnsConfig()[columnIdx];
        return [column.attr, sortColumn[1]];
      }, this);
      this._saveSettings({ sorting: JSON.stringify(sortConfig) }, currentSettings);
    }
  },

  _onColumnVisibilityChange: function() {
    currentSettings = this._getCurrentSettingsState();
    if (!_.isEqual(this.settingsState.columnVisibility, currentSettings.columnVisibility)) {
      var changedColumns = this.table._columnManager.visibility.changedAttributes();
      _.each(changedColumns, function(visible, colTitle) {
        var column = this.table._columnManager.columnConfigForTitle(colTitle);
        var updates = {
          column_name: column.attr,
          default_value: column.visibleDefault == undefined || column.visibleDefault ? 1 : 0,
          current_value: visible ? 1 : 0
        };
        this._saveSettings(updates, currentSettings);
      }, this);
    }
  },

  _onColumnOrderChange: function() {
    currentSettings = this._getCurrentSettingsState();
    if (!_.isEqual(this.settingsState.columnOrder, currentSettings.columnOrder)) {
      this._saveSettings({ column_order: currentSettings.columnOrder }, currentSettings);
    }
  },

  _saveSettings: function(settingsUpdate, currentSettings) {
    $.ajax({
      url  : this.reportSettings.updateUrl,
      method: 'POST',
      data : _.extend({
        ajax          : 1,
        format        : 'json',
        report_type   : this.reportSettings.reportType
      }, settingsUpdate)
    });
    this._cacheSettingsState(currentSettings);
  }
});
