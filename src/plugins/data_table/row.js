var Row = (function() {

  var Base = Backdraft.plugin("Base");
  var cssClass = /[^a-zA-Z_0-9\-]/g;

  function invokeRenderer(row, node, config) {
    var renderer;
    if (config.renderer) {
      renderer = config.renderer;
    } else if (config.bulk) {
      renderer = row.renderers.bulk;
    } else if (config.title) {
      renderer = row.renderers[config.title];
    } else {
      renderer = row.renderers.base;
    }
    (renderer || row.renderers.base).call(row, node, config);
  }

  function selectorForCell(config) {
    if (config.title) {
      return "." + Row.getCSSClass(config.title);
    } else if (config.bulk) {
      return ".bulk";
    }
  }

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.getCells(), node;
      _.each(this.columnsConfig, function(config) {
        node = cells.filter(selectorForCell(config));
        if (node.length) invokeRenderer(this, node, config);
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

    getCells : function() {
      return this.$el.find("td");
    },

    renderers : {

      base : function(cell, config) {
        var content = this.model.get(config.attr);
        cell.text(content);
      },

      bulk : function(cell, config) {
        if (this.checkbox) return;
        this.checkbox = $("<input>").attr("type", "checkbox");
        cell.html(this.checkbox);
      }

    }

  }, {

    finalize : function(name, rowClass) {
    },

    // create a valid CSS class name based on input
    getCSSClass : function(input) {
      return input.replace(cssClass, function() {
        return "-";
      });
    }

  });

  return Row;

})();