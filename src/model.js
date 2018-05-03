import Backbone from "backbone";

class Model extends Backbone.Model {
  // notify change listeners, but with current values
  reTriggerChanges() {
    for (const attr in this.attributes) {
      this.trigger(`change:${attr}`, this, this.get(attr), {});
    }
    this.trigger("change", this, {});
  }
}

export default Model;
