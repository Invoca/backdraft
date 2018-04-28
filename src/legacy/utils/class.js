import Backbone from "backbone";

function Class() {
  this.initialize && this.initialize.apply(this, arguments);
}

Class.extend = Backbone.Model.extend;

export default Class;
