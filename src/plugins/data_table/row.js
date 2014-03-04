var Row = (function() {

  var Base = Backdraft.plugin("Base");

  function invokeRenderer(row, node, config) {
    var renderer;
    if (config.bulk) {
      renderer = this.renderers.bulk;
    } else if (config.title) {
      renderer = this.renderers[config.title];
    } else {
      renderer = this.renderers.base;
    }
    renderer.call(row, cell, config);
  }

  var Row = Base.View.extend({

    constructor : function() {
      Row.__super__.constructor.apply(this, arguments);
      this.$el.data("view", this);
    },

    render : function() {

    },

    renderWithHint : function(hint) {
      //
    },

    renderColumn : function(config) {
      var node = this.$el.find("." + columnClassFromTitle(config.title));
      invokeRenderer(this, node, config);
    },

    setBulkState : function(state) {
      this.checkbox.prop("checked", state);
      this.$el.toggleClass("selected", state);
    }

  }, {

    renderers : {

      base : function(cell, config) {
        var content = this.model.get(config.attr);
        cell.html(content);
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