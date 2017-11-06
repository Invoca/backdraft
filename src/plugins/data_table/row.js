var Row = (function() {

  var Base = Backdraft.plugin("Base");

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.isTotals = options.totals;
      this.hasUniques = this._hasUniqueValues();
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.findCells(), node;
      _.each(this.columnsConfig, function(config) {
        node = cells.filter(config.nodeMatcher(config));
        this._invokeRenderer(config, node);
      }, this);
    },

    renderColumnByConfig: function(config) {
      var node = this.findCells().filter(config.nodeMatcher(config));
      this._invokeRenderer(config, node);
    },

    bulkState : function(state) {
      // TODO: throw error when no checkbox
      if (!this.checkbox) return;

      if (arguments.length === 1) {
        // setter
        this.checkbox.prop("checked", state).change();
        this.$el.toggleClass("backdraft-selected", state);
      } else {
        // getter
        return this.checkbox.prop("checked");
      }
    },

    findCells: function() {
      return this.$el.find("td");
    },

    renderers : {
    },

    _invokeRenderer: function(config, node) {
      if (node.length === 1) {
        config.renderer.call(this, node, config);
      } else if (node.length > 1) {
        throw new Error("multiple nodes were matched");
      }
    },

    _hasUniqueValues: function() {
      var hasUniques = false;

      if (this.isTotals) {
        var columns = this.model.keys();

        _.each(columns, function (column) {
          if (column && columns.indexOf(column + ".unique") !== -1) {
            var columnVal = this.model.get(column);
            if (!(columnVal instanceof Array) && columnVal != this.model.get(column + '.unique')) {
              hasUniques = true;
              return false;
            }
          }
        }.bind(this));
      }

      return hasUniques;
    },

  }, {

    finalize : function(name, rowClass) {
    }

  });

  return Row;

})();
