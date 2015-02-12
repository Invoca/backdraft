var LockManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this._locks = new Backbone.Model();
    this._initData();
    this._initEvents();
  },

  val: function(prop, v) {
    if (arguments.length === 2) {
      // setter
      this._locks.set(prop, v);
    } else {
      // getter
      return this._locks.get(prop);
    }
  },

  // TODO-EUGE - handle initial bulk state?
  _initData: function() {
    this._locks.set({
      paginate: !this.table.paginate,
      sort: false,
      filter: false,
      bulk: false
    });
  },

  _initEvents: function() {
    this.listenTo(this._locks, "change:paginate", function(model, state) {
      this.table.$(".dataTables_length").css("visibility", state ? "hidden" : "visible");
    });

    this.listenTo(this._locks, "change:filter", function(model, state) {
      this.table.$(".dataTables_filter").css("visibility", state ? "hidden" : "visible");
    });

    this.listenTo(this._locks, "change:bulk", function(model, state) {
      this.table.$(".bulk :checkbox").prop("disabled", state);
    });
  }

});
