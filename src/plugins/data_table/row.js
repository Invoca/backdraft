var Row = (function() {

  var Base = Backdraft.plugin("Base");
  var cssClass = /[^a-zA-Z_\-]/g;

  function invokeRenderer(row, node, config) {
    var renderer;
    if (config.bulk) {
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

    constructor : function() {
      Row.__super__.constructor.apply(this, arguments);
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.getCells(), node;
      _.each(this.columns, function(config) {
        node = cells.filter(selectorForCell(config));
        if (node.length) invokeRenderer(this, node, config);
      }, this);
    },

    renderWithHint : function(hint) {
      // TODO
    },

    renderColumn : function(config) {
      var node = this.$el.find(selectorForCell(config));
      invokeRenderer(this, node, config);
    },

    setBulkState : function(state) {
      this.checkbox.prop("checked", state);
      this.$el.toggleClass("selected", state);
    },

    getCells : function() {
      return this.$el.find("td");
    }

  }, {

    finalize : function(name, rowClass) {
      // renderers are optional for a class
      var renderers = rowClass.prototype.renderers || {};
      // allow overriding of default renderers
      rowClass.prototype.renderers = _.extend({}, this.renderers, renderers)
    },

    // create a valid CSS class name based on input
    getCSSClass : function(input) {
      return input.replace(cssClass, function() {
        return "-";
      });
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

  });

  return Row;

})();