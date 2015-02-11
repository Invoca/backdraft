var ColumnType =  Backdraft.Utils.Class.extend({
  initialize: function() {
    this.callbacks = {};
  },

  configMatcher: function(cb) {
    this.callbacks.configMatcher = cb;
  },

  nodeMatcher: function(cb) {
    this.callbacks.nodeMatcher = cb;
  },

  definition: function(cb) {
    this.callbacks.definition = cb;
  },

  renderer: function(cb) {
    this.callbacks.renderer = cb;
  }
});
