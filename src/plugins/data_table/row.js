var Row = (function() {

  var Base = Backdraft.plugin("Base");

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.findCells(), node;
      _.each(this.columnsConfig, function(config) {
        node = cells.filter(config.nodeMatcher(config));
        if (node.length === 1) {
          config.renderer.call(this, node, config);
        } else if (node.length > 1) {
          throw new Error("multiple nodes were matched");
        }
      }, this);
    },

    bulkState : function(state) {
      // TODO: throw error when no checkbox
      if (!this.checkbox) return;

      if (arguments.length === 1) {
        // setter
        this.checkbox.prop("checked", state);
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
    }

  }, {

    finalize : function(name, rowClass) {
    }

  });

  return Row;

})();