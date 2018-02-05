import Backbone from "backbone";

var Model = (function() {

  var Model = Backbone.Model.extend({

    // notify change listeners, but with current values
    reTriggerChanges : function() {
      for (var attr in this.attributes) {
        this.trigger("change:" + attr, this, this.get(attr), {});
      }
      this.trigger("change", this, {});
    }

  });

  return Model;

})();

export default Model;
