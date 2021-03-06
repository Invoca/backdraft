import Backbone from "backbone";
import _ from "underscore";

const LOCKS = {
  "bulk":   "bulk selection is locked",
  "page":   "pagination is locked",
  "filter": "filtering is locked",
  "sort":   "sorting is locked"
};

const LOCK_NAMES = _.keys(LOCKS);

class LockManager {
  constructor(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this._states = new Backbone.Model();
    this._initData();
    this._initEvents();
  }

  lock(name, state) {
    if (!_.include(LOCK_NAMES, name)) throw new Error(`unknown lock ${name}`);
    if (arguments.length === 1) {
      // getter
      return this._states.get(name);
    } else if (arguments.length === 2) {
      // setter
      this._states.set(name, state);
    } else {
      throw new Error("#lock requires a name and/or a state");
    }
  }

  ensureUnlocked(name) {
    if (this.lock(name)) throw new Error(LOCKS[name]);
  }

  _initData() {
    // all locks start as unlocked
    _.each(LOCKS, function(v, k) {
      this._states.set(k, false);
    }, this);
  }

  _initEvents() {
    // note: the sort lock is handled by the table
    this.listenTo(this._states, "change:page", function(model, state) {
      this.table.$(".dataTables_length, .dataTables_paginate").css("visibility", state ? "hidden" : "visible");
    });

    this.listenTo(this._states, "change:filter", function(model, state) {
      this.table.$(".dataTables_filter").css("visibility", state ? "hidden" : "visible");
    });

    this.listenTo(this._states, "change:bulk", function(model, state) {
      this.table.$(".bulk :checkbox").prop("disabled", state);
    });
  }
}

export default LockManager;
