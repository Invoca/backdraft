var ColumnType =  Backdraft.Utils.Class.extend({
  initialize: function() {
    this.callbacks = {};
  },

  matcher: function(cb) {
    this.callbacks.matcher = cb;
  },

  definition: function(cb) {
    this.callbacks.definition = cb;
  },

  renderer: function(cb) {
    this.callbacks.renderer = cb;
  }
});
