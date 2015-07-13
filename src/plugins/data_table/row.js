var Row = (function() {

  var Base = Backdraft.plugin("Base");

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.$el.data("row", this);
      this._bulkSate = null;
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
      if (!this.checkbox) return;

      if (arguments.length === 1) {
        // setter
        this.checkbox.prop("checked", state);
        this._bulkSate = state;
        this.$el.toggleClass("backdraft-selected", state);
      } else {
        // getter
        return this._bulkSate;
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
    }

  }, {

    finalize : function(name, rowClass) {
    }

  });

  return Row;

})();