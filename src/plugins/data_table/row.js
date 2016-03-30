var Row = (function() {

  var Base = Backdraft.plugin("Base");

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.findCells(), node;
      var cleanConfigs = this.columnsConfig.map(function(currentValue,index){
        if (currentValue.bulk || ((currentValue.attr || currentValue.title) && currentValue.visible) ) {
          return currentValue;
        }
      }).filter(function(currentValue) {
         return currentValue !== undefined;
        }
      );
      _.each(cleanConfigs, function(config, index) {
        node = $(cells[index]);
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
