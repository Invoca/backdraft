import Backbone from "backbone";
import _ from "underscore";

class View extends Backbone.View {
  get children() {
    if (!this._children) {
      this._children = {};
    }

    return this._children;
  }

  child(name, view) {
    const existing = this.children[name];
    if (!view) return existing;
    if (existing) throw new Error(`View ${name} already exists`);
    this.children[name] = _.extend(view, {
      parent: this,
      name
    });
    return this.children[name];
  }

  close() {
    this.trigger("beforeClose");
    // close children
    _.each(this.children, child => {
      child.close();
    });
    // detach from parent
    if (this.parent) {
      delete this.parent.children[this.name];
      delete this.parent;
    }
    // remove from the DOM
    this.remove();
    this.trigger("afterClose");
    this.off();
  }
}

export default View;
