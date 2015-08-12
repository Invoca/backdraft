(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  // use squiggly braces for underscore templating so we don't conflict with ruby templating
  _.templateSettings = {
    evaluate    : /{{([\s\S]+?)}}/g,
    interpolate : /{{=([\s\S]+?)}}/g,
    escape      : /{{-([\s\S]+?)}}/g
  }

  Backdraft.Utils.Class = (function() {

  // Backbone.js class implementation
  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  function Class() {
    this.initialize && this.initialize.apply(this, arguments);
  }

  Class.prototype._getterSetter = function(prop) {
    this._store || (this._store = {});

    this[prop] = function(value) {
      if (arguments.length === 1) {
        this._store[prop] = value;
      } else {
        return this._store[prop];
      }
    };
  }

  _.extend(Class, {
    extend : extend
  });

  return Class;

})();
  // create a valid CSS class name based on input
Backdraft.Utils.toCSSClass = (function() {
  var cssClass = /[^a-zA-Z_0-9\-]/g;
  return function(input) {
    return input.replace(cssClass, "-");
  };
})();

  var App = (function() {

  var getInstance = function(name) {
    if (App.instances[name]) return App.instances[name];
    throw new Error("App " + name + " does not exist");
  };

  var App = Backdraft.Utils.Class.extend({

    constructor : function() {
      // list of plugins by name this app should load, defaulting to none.
      // apps should either override this property or append to it in their #initialize method
      if (!this.plugins) this.plugins = [];

      // ensure that the Base plugin as always loaded
      if (!_.include(this.plugins, "Base")) this.plugins.unshift("Base");
     
      // call parent constructor
      App.__super__.constructor.apply(this, arguments);

      // load plugins for this application
      Plugin.load(this.plugins, this);
    },

    activate : function() {
      throw new Error("#activate must be implemented in your class");
    },

    destroy : function() {
      // to be implemented in subclasses
    }

  }, {

    instances : {

    },

    factory : function(name, obj) {
      if (!obj) {
        return getInstance(name);
      } else if (_.isFunction(obj)) {
        obj(getInstance(name));
      } else if (_.isObject(obj)) {
        // define app and create an instance of it
        if (App.instances[name]) throw new Error("App " + name + " is already defined");
        var appClass = App.extend(_.extend(obj, { name : name }));
        App.instances[name] = new appClass();
        return App.instances[name];
      }

    }

  });

  // add pub/sub support to the app
  _.extend(App.prototype, Backbone.Events);

  // support for destroying apps
  _.extend(App.factory, {

    // destroys all existing applications
    destroyAll : function() {
      _.chain(App.instances).keys().each(function(name) { 
        App.factory.destroy(name);
      });
    },

    // destroy a single application with provided name
    destroy : function(name) {
      getInstance(name).destroy();
      delete App.instances[name];
    }

  });



  return App;

})();
  Backdraft.app = App.factory;

  var Plugin = Backdraft.Utils.Class.extend({

  initialize : function(name) {
    this.name = name;
    this.initializers = [];
    this.exportedData = {};
  },

  // store a list of callback functions that will be executed in order
  // and passed an instance of a Backdraft application. Plugins are then able to add
  // factories and other properties onto an application instance
  initializer : function(fn) {
    this.initializers.push(fn);
  },

  // allow plugins to export static helpers, constants, etc
  exports : function(data) {
    _.extend(this.exportedData, data);
  },

  // call all initializers, providing Backdraft app instance to each
  runInitializers : function(app) {
    _.each(this.initializers, function(fn) {
      fn(app);
    });
  }

}, {

  registered : {

  },

  factory : function(name, fn) {
    if (!fn) {
      // return exports of plugin with provided name
      if (!Plugin.registered[name]) throw new Error("Plugin " + name + " has not been registered");
      return Plugin.registered[name].exportedData;
    } else {
      // create and register new plugin. afterwards invoke callback with it
      if (Plugin.registered[name]) throw new Error("Plugin " + name + " is already registered");
      Plugin.registered[name] = new Plugin(name);
      fn(Plugin.registered[name]);
    }
  },

  load : function(pluginNames, app) {
    // load plugins the app has specified
    _.each(pluginNames, function(name) {
      if (!Plugin.registered[name]) throw new Error("Plugin " + name + " has not been registered");
      Plugin.registered[name].runInitializers(app);
    });
  }

});

_.extend(Plugin.factory, {

  destroyAll : function() {
    _.each(Plugin.registered, function(plugin, name) {
      // the Base plugin cannot be destroyed
      if (name !== "Base") delete Plugin.registered[name];
    })
  }
});

  Backdraft.plugin = Plugin.factory;

  Backdraft.plugin("Base", function(plugin) {

  var View = (function() {

  var View = Backbone.View.extend({

    constructor : function() {
      this.children = {};
      View.__super__.constructor.apply(this, arguments);
    },

    child : function(name, view) {
      var existing = this.children[name];
      if (!view) return existing;
      if (existing) throw new Error("View " + name + " already exists");
      this.children[name] = _.extend(view, { 
        parent : this,
        name : name
      });
      return this.children[name];
    },

    close : function() {
      this.trigger("beforeClose");
      // close children
      _.each(this.children, function(child) {
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

  });

  return View;

})();

  var Collection = (function() {

  var Collection = Backbone.Collection.extend({

  });

  return Collection;

})();
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
  var Router = (function() {

  var splatParam = /\*\w+/g;
  var optionalParam = /\((.*?)\)/g;

  // helper method for creating Rails style named routes
  function createNameHelper(name, route) {
    var helper = function(params, splat) {
      // replace splat
      var genRoute = route.replace(splatParam, splat || "");
      // replace required params
      _.each(params, function(v, k) {
        genRoute = genRoute.replace(":" + k, v);
      });
      _.each(genRoute.match(optionalParam), function(p) {
        if (_.include(p, ":")) {
          // optional param unfulfilled, remove it
          genRoute = genRoute.replace(p, "");
        } else {
          // optional param fulfilled, remove just the parens
          genRoute = genRoute.replace(p, p.slice(1, -1));
        }
      });
      if (_.include(genRoute, ":")) throw new Error("Route for " + name + " can't be created");
      return genRoute;
    };

    this.nameHelper[name] = helper;
  };

  var Router = Backbone.Router.extend({

    constructor : function(options) {
      options || (options = {});
      if (!options.$el || options.$el.length !== 1) throw new Error("$el can't be found");
      this.$el = options.$el;
      this.nameHelper = {};
      Router.__super__.constructor.apply(this, arguments);
    },

    route : function(route, name, callback) {
      var nameHelperMethod;
      if (!_.isFunction(name)) {
        if (!_.isArray(name)) {
          nameHelperMethod = name
        } else {
          nameHelperMethod = name[1];
          name = name[0];
        }
        createNameHelper.call(this, nameHelperMethod, route);
      }
      return Router.__super__.route.apply(this, arguments);
    },

    swap : function(nextView) {
      this.activeView && this.activeView.close();
      this.activeView = nextView;
      this.activeView.trigger("beforeSwap", this);
      // render new view and place into router's element
      this.activeView.render();
      this.$el.html(this.activeView.$el);
      this.activeView.trigger("afterSwap", this);
    }

  });

  return Router;

})();
  var Cache = (function() {

  function getKey(key) {
    if (key.cid) return key.cid;
    if (_.isString(key)) return key;
    throw new Error("Invalid key type");
  }

  var Cache = Backdraft.Utils.Class.extend({

    initialize : function() {
      this.reset();
    },

    set : function(key, value) {
      this.data[getKey(key)] = value;
      return value;
    },

    unset : function(key) {
      key = getKey(key);
      var value = this.data[key];
      delete this.data[key];
      return value;
    },

    get : function(key) {
      return this.data[getKey(key)];
    },

    size : function() {
      return _.keys(this.data).length;
    },

    reset : function() {
      this.data = {};
    },

    each : function(iterator, context) {
      _.each(this.data, iterator, context);
    }

  });

  return Cache;


})();

  plugin.exports({
    Router : Router,
    View : View,
    Model : Model,
    Collection : Collection,
    Cache : Cache
  });

  // factories
  plugin.initializer(function(app) {
    app.Views = {};
    app.view = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = View;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
    };

    app.Collections = {}
    app.collection = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Collection;
      } else {
        baseClass = app.Collections[baseClassName];
      }

      app.Collections[name] = baseClass.extend(properties);
    };

    app.Models = {};
    app.model = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Model;
      } else {
        baseClass = app.Models[baseClassName];
      }

      app.Models[name] = baseClass.extend(properties);
    };

    app.Routers = {};
    app.router = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Router;
      } else {
        baseClass = app.Routers[baseClassName];
      }

      app.Routers[name] = baseClass.extend(properties);
    };

  });


});
  Backdraft.plugin("DataTable", function(plugin) {

  function cidMap(collection) {
    return collection.map(function(model) {
      return { cid : model.cid };
    });
  }

  var ColumnConfigGenerator =  Backdraft.Utils.Class.extend({
  initialize: function(table) {
    this.table = table;
    this.columnIndexByTitle = new Backbone.Model();
    this.columnConfigByTitle = new Backbone.Model();
    this._computeColumnConfig();
    this._computeColumnLookups();
    this._computeSortingConfig();
  },

  columnsSwapped: function(fromIndex, toIndex) {
    // move the config around and recompute lookup models
    var removed = this.columnsConfig.splice(fromIndex, 1)[0];
    this.columnsConfig.splice(toIndex, 0, removed);
    this._computeColumnLookups();
  },

  columnsReordered: function() {
    this._computeColumnLookups();
  },

  _computeColumnConfig: function() {
    this.dataTableColumns = [];
    this.columnsConfig = _.clone(_.result(this.table.rowClass.prototype, "columns"));
    if (!_.isArray(this.columnsConfig)) throw new Error("Invalid column configuration provided");
    this.columnsConfig = _.reject(this.columnsConfig, function(columnConfig) {
      if (!columnConfig.present) {
        return false;
      } else {
        return !columnConfig.present();
      }
    });

    _.each(this._determineColumnTypes(), function(columnType, index) {
      var config = this.columnsConfig[index];
      var definition = columnType.definition()(this.table, config);

      if (!_.has(config, "required")) {
        config.required = false;
      }
      if (!_.has(config, "visible")) {
        config.visible = true;
      }

      if (config.required === true && config.visible === false) {
        throw new Error("column can't be required, but not visible");
      }

      this.dataTableColumns.push(definition);
      config.nodeMatcher = columnType.nodeMatcher();
      // use column type's default renderer if the config doesn't supply one
      if (!config.renderer) config.renderer = columnType.renderer();
    }, this);
  },

  _computeSortingConfig: function(sorting) {
    var columnIndex, direction;
    var sortingInfo = sorting || this.table.sorting;
    this.dataTableSorting = _.map(sortingInfo, function(sortConfig) {
      columnIndex = sortConfig[0];
      direction = sortConfig[1];

      // column index can be provided as the column title, convert to index
      if (_.isString(columnIndex)) columnIndex = this.columnIndexByTitle.get(columnIndex);
      return [ columnIndex, direction ];
    }, this);
  },

  _computeColumnLookups: function() {
    this.columnIndexByTitle.clear();
    this.columnConfigByTitle.clear();
    _.each(this.columnsConfig, function(col, index) {
      if (col.title) {
        this.columnIndexByTitle.set(col.title, index);
        this.columnConfigByTitle.set(col.title, col);
      }
    }, this);
  },

  _determineColumnTypes: function() {
    // match our table's columns to available column types
    var columnType, availableColumnTypes = this.table.availableColumnTypes();
    return _.map(this.columnsConfig, function(config, index) {
      var columnType = _.find(availableColumnTypes, function(type) {
        return type.configMatcher()(config);
      });

      if (!columnType) {
        throw new Error("could not find matching column type: " + JSON.stringify(config));
      } else {
        return columnType;
      }
    });
  }
});

  var ColumnManager = Backdraft.Utils.Class.extend({
  initialize: function(table) {
    _.extend(this, Backbone.Events);
    this.table = table;
    this.visibility = new Backbone.Model();
    this._configGenerator = new ColumnConfigGenerator(table);
    this._initEvents();
  },

  applyVisibilityPreferences: function() {
    var prefs = {};
    _.each(this.columnsConfig(), function(config) {
      if (config.title) {
        prefs[config.title] = config.visible;
      }
    });
    this.visibility.set(prefs);
  },

  columnAttrs: function() {
    return _.pluck(this.columnsConfig(), "attr");
  },

  dataTableColumnsConfig: function() {
    return this._configGenerator.dataTableColumns;
  },

  dataTableSortingConfig: function() {
    return this._configGenerator.dataTableSorting;
  },

  columnsConfig: function() {
    return this._configGenerator.columnsConfig;
  },

  columnConfigForTitle: function(title) {
    return this._configGenerator.columnConfigByTitle.get(title);
  },

  columnsSwapped: function(fromIndex, toIndex) {
    this._configGenerator.columnsSwapped(fromIndex, toIndex);
    this.trigger("change:order");
  },

  columnsReordered: function() {
    this._configGenerator.columnsReordered();
  },

  changeSorting: function(sorting) {
    this._configGenerator._computeSortingConfig(sorting);
  },

  _initEvents: function() {
    this.visibility.on("change", function() {
      this._applyVisibilitiesToDataTable(this.visibility.changed);
      this.trigger("change:visibility", this._visibilitySummary());
    }, this);
  },

  _applyVisibilitiesToDataTable: function(titleStateMap) {
    _.each(titleStateMap, function(state, title) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexByTitle.get(title), state, false);
    }, this);
  },

  _visibilitySummary: function() {
    var summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, function(state, title) {
      if (state) summary.visible.push(title);
      else       summary.hidden.push(title);
    });
    return summary;
  }
});

  var SelectionManager = Backdraft.Utils.Class.extend({

  initialize : function() {
    this._count = 0;
    this._cidMap = {};
  },

  count : function() {
    return this._count;
  },

  models : function() {
    return _.values(this._cidMap);
  },

  process : function(model, state) {
    var existing = this._cidMap[model.cid];
    if (state) {
      if (!existing) {
        // add new entry
        this._cidMap[model.cid] = model;
        this._count += 1;
      }
    } else {
      if (existing) {
        // purge existing entry
        delete this._cidMap[model.cid];
        this._count = Math.max(0, this._count -1);
      }
    }
  },

  has : function(model) {
    return !!this._cidMap[model.cid];
  }

});
  var LockManager = (function() {

  var LOCKS = {
    "bulk":   "bulk selection is locked",
    "page":   "pagination is locked",
    "filter": "filtering is locked",
    "sort":   "sorting is locked"
  };

  var LOCK_NAMES = _.keys(LOCKS);

  var LockManager = Backdraft.Utils.Class.extend({
    initialize: function(table) {
      _.extend(this, Backbone.Events);
      this.table = table;
      this._states = new Backbone.Model();
      this._initData();
      this._initEvents();
    },

    lock: function(name, state) {
      if (!_.include(LOCK_NAMES, name)) throw new Error("unknown lock " + name);
      if (arguments.length === 1) {
        // getter
        return this._states.get(name);
      } else if (arguments.length === 2) {
        // setter
        this._states.set(name, state);
      } else {
        throw new Error("#lock requires a name and/or a state");
      }
    },

    ensureUnlocked: function(name) {
      if (this.lock(name)) throw new Error(LOCKS[name]);
    },

    _initData: function() {
      // all locks start as unlocked
      _.each(LOCKS, function(v, k) {
        this._states.set(k, false);
      }, this);
    },

    _initEvents: function() {
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

  });

  return LockManager;
})();

  var ColumnType =  Backdraft.Utils.Class.extend({
  initialize: function() {
    this._getterSetter("configMatcher");
    this._getterSetter("nodeMatcher");
    this._getterSetter("definition");
    this._getterSetter("renderer");
  }
});

  var DataTableFilter = (function(options) {
  var Base = Backdraft.plugin("Base");

  var DEFAULT_JST_DELIMS = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  var DataTableFilterMenu = Base.View.extend({
    menuTemplate: _.template(''), // to be overridden by subclasses

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.parentView = options.parentView;
    },

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange"
    },

    render: function () {
      this.beforeRender();

      this.$el.html(this.menuTemplate({
        filter: this.filter,
        attr: this.attr,
        title: this.title,
        parentView: this.parentView
      }));

      this.afterRender();
      return this;
    },

    beforeRender: function () {
      // to be optionally implemented by subclasses
    },

    afterRender: function () {
      // to be optionally implemented by subclasses
    },

    _onInputClick: function (event) {
      event.target.focus();
      event.stopImmediatePropagation();
    },

    _onInputChange: function (event) {
      // to be implemented by subclasses
    }
  });

  var StringFilterMenu = DataTableFilterMenu.extend({
    menuTemplate: _.template('\
        <input class="filter-string" id ="value" type="text" placeholder="Search <%= title %>" />\
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
    }
  });

  var NumericFilterMenu = DataTableFilterMenu.extend({
    tagName: "ul",

    menuTemplate: _.template('\
        <li> &gt; <input data-numeric-filter-name="gt" class="filter-numeric filter-numeric-greater" type="text" /></li> \
        <li> &lt; <input data-numeric-filter-name="lt" class="filter-numeric filter-numeric-less" type="text"/></li> \
        <li> = <input data-numeric-filter-name="eq" class="filter-numeric filter-numeric-equal" type="text" /></li> \
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      var numericValueName = $(filterInput).attr("data-numeric-filter-name");
      if (filterInput.value === "") {
        this.filter[numericValueName] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[numericValueName] = filterInput.value;
        this.parentView._toggleIcon(true);
      }
    }
  });

  var ListFilterMenu = DataTableFilterMenu.extend({
    tagName: "ul",

    menuTemplate: _.template('\
        <% _.each(filter.options, function(element, index) { %>\
          <li>\
            <label>\
              <input class="list" id="value" type="checkbox" name="<%= attr %>" value="<%= element %>" /> \
              <%= element %>\
            </label>\
          </li>\
        <% }) %>\
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.checked) {
        this.filter.value = this.filter.value || [];
        this.filter.value.push(filterInput.value);
        this.parentView._toggleIcon(true);
      }
      // remove filter from column manager if it is defined
      else if (this.filter.value) {
        var index = this.filter.value.indexOf(filterInput.value);
        if (index > -1) {
          this.filter.value.splice(index, 1);
        }
        if (this.filter.value.length === 0) {
          this.filter.value = null;
          this.parentView._toggleIcon(false);
        }
      }
    }
  });

  var DataTableFilter = Base.View.extend({
    template: _.template('\
        <div class="toggle-filter-button" data-toggle="dropdown">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
        <div class="filterMenu dropdown-menu <%= listClass %>">\
          <button class="btn btn-primary btn-sm btn-filter" name="button" type="submit" title="">Filter</button>\
          <button class="btn btn-primary btn-sm btn-clear" name="button" type="submit" title="">Clear</button>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
      "click .btn-filter": "_onFilterClick",
      "click .btn-clear": "_onClearClick"
    },

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";
      this.listClass = "single";

      // decide which filter view based on type, here
      var filterMenu = null;
      switch (this.filter.type) {
        case 'string':
          filterMenu = new StringFilterMenu({column: options.column, parentView: this});
          break;
        case 'numeric':
          filterMenu = new NumericFilterMenu({column: options.column, parentView: this});
          break;
        case 'list':
          filterMenu = new ListFilterMenu({column: options.column, parentView: this});
          if (this.filter.options.length > 30) {
            this.listClass = "triple";
          } else if (this.filter.options.length > 15) {
            this.listClass = "double";
          }
          break;
      }

      // add as a child (backdraft thing just to keep bookkeeping on subviews)
      this.child("filter-menu", filterMenu);
    },

    render: function () {
      this.$el.html(this.template({
        filterButtonClass: this.filterButtonClass,
        listClass: this.listClass
      }));

      $(".filterMenu", this.$el).prepend(this.child("filter-menu").render().$el);
      return this;
    },

    _toggleIcon: function (enabled) {
      var icon = $("span", this.$el);
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
    },

    _onToggleClick: function (event) {
      var table = this.table;
      event.stopImmediatePropagation();
      var currentFilterMenu = $('.filterMenu', this.$el);
      if ((table.activeFilterMenu) && (table.activeFilterMenu.is(currentFilterMenu))) {
        table.activeFilterMenu.slideUp(100);
        table.activeFilterMenu = null;
      } else if (table.activeFilterMenu) {
        table.activeFilterMenu.slideUp(100, function () {
          table.activeFilterMenu = currentFilterMenu;
          table.activeFilterMenu.slideDown(200);
        });
      } else {
        table.activeFilterMenu = currentFilterMenu;
        table.activeFilterMenu.slideDown(200);
      }
    },

    _onFilterClick: function () {
      $("input[type=text]", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    },

    _onClearClick: function () {
      $("input[type=text]", this.head).val("");
      $("input[type=checkbox]", this.head).attr("checked", false);
      $("input", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    }
  });

  return new DataTableFilter(options);
});
  var Row = (function() {

  var Base = Backdraft.plugin("Base");

  var Row = Base.View.extend({
    initialize: function(options) {
      this.columnsConfig = options.columnsConfig;
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.findCells(), node;
      _.each(this.columnsConfig, function(config) {
        node = cells.filter(config.nodeMatcher(config));
        this._invokeRenderer(config, node);
      }, this);
    },

    renderColumnByConfig: function(config) {
      var node = this.findCells().filter(config.nodeMatcher(config));
      this._invokeRenderer(config, node);
    },

    bulkState : function(state) {
      // TODO: throw error when no checkbox
      if (!this.checkbox) return;

      if (arguments.length === 1) {
        // setter
        this.checkbox.prop("checked", state);
        this.$el.toggleClass("backdraft-selected", state);
      } else {
        // getter
        return this.checkbox.prop("checked");
      }
    },

    findCells: function() {
      return this.$el.find("td");
    },

    renderers : {
    },

    _invokeRenderer: function(config, node) {
      if (node.length === 1) {
        config.renderer.call(this, node, config);
      } else if (node.length > 1) {
        throw new Error("multiple nodes were matched");
      }
    }

  }, {

    finalize : function(name, rowClass) {
    }

  });

  return Row;

})();
  var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var LocalDataTable = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw",
          "_onColumnVisibilityChange", "_onColumnReorder");
      this.cache = new Base.Cache();
      this.selectionManager = new SelectionManager();
      this.rowClass = this.options.rowClass || this._resolveRowClass();
      this._applyDefaults();
      this._columnManager = new ColumnManager(this);
      this._lockManager = new LockManager(this);
      LocalDataTable.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    // apply filtering
    filter : function() {
      this._lockManager.ensureUnlocked("filter");
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // change pagination
    page : function() {
      this._lockManager.ensureUnlocked("page");
      return this.dataTable.fnPageChange.apply(this.dataTable, arguments);
    },

    // sort specific columns
    sort : function() {
      this._lockManager.ensureUnlocked("sort");
      return this.dataTable.fnSort.apply(this.dataTable, arguments);
    },

    selectedModels : function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.selectionManager.models();
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this._initBulkHandling();
      this.paginate && this._initPaginationHandling();
      this._triggerChangeSelection();
      this.trigger("render");
      return this;
    },

    renderColumn: function(title) {
      var config = this._columnManager.columnConfigForTitle(title);
      if (!config) {
        throw new Error("column not found");
      }
      this.cache.each(function(row) {
        row.renderColumnByConfig(config);
      });
    },

    selectAllVisible : function(state) {
      this._lockManager.ensureUnlocked("bulk");
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row.model, row, state);
      }, this);
      this._triggerChangeSelection({ selectAllVisible: state });
    },

    selectAllMatching : function() {
      this._lockManager.ensureUnlocked("bulk");
      if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
      _.each(this._allMatchingModels(), function(model) {
        this._setRowSelectedState(model, this.cache.get(model), true);
      }, this);
      this._triggerChangeSelection();
    },

    matchingCount : function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.dataTable.fnSettings().aiDisplay.length;
    },

    totalRecordsCount: function() {
      this._lockManager.ensureUnlocked("bulk");
      return this.dataTable.fnSettings().fnRecordsTotal();
    },

    columnVisibility: function(title, state) {
      if (arguments.length === 1) {
        // getter
        return this._columnManager.visibility.get(title);
      } else {
        if (!state && this._columnManager.columnConfigForTitle(title).required) {
          throw new Error("can not disable visibility when column is required");
        }
        this._columnManager.visibility.set(title, state);
        state && this.renderColumn(title);
      }
    },

    restoreColumnVisibility: function() {
      _.each(this.columnsConfig(), function(column) {
        if (column.title) {
          this.columnVisibility(column.title, column.visible);
        }
      }, this);
    },

    columnOrder: function(order) {
      if (this.reorderableColumns) {
        this._changeColumnOrder(order);
      }
    },

    restoreColumnOrder: function() {
      if (this.reorderableColumns) {
        this._changeColumnOrder({ reset: true});
      }
    },

    changeSorting: function(sorting) {
      this._columnManager.changeSorting(sorting);
      if (this.dataTable) {
        var normalizeSortingColumn = function(sort) { return _.first(sort, 2); };
        sorting = _.map(this._columnManager.dataTableSortingConfig(), normalizeSortingColumn);
        currentSorting = _.map(this.dataTable.fnSettings().aaSorting, normalizeSortingColumn);
        if (!_.isEqual(currentSorting, sorting)) {
          this.dataTable.fnSort(sorting);
        }
      }
    },

    lock: function(name, state) {
      if (arguments.length === 1) {
        // getter
        return this._lockManager.lock(name);
      } else if (arguments.length === 2) {
        // setter
        this._lockManager.lock(name, state);
      } else {
        throw new Error("#lock requires a name and/or a state");
      }
    },

    columnsConfig: function() {
      return this._columnManager.columnsConfig();
    },

    configGenerator: function() {
      return this._columnManager._configGenerator;
    },

    // Private APIs

    _enableReorderableColumns: function() {
      var self = this;
      new $.fn.dataTable.ColReorder(this.dataTable, {
        fnReorderCallback: function(fromIndex, toIndex) {
          // notify that columns have been externally rearranged
          self._columnManager.columnsSwapped(fromIndex, toIndex);
          // pass event up
          self._onColumnReorder();
        }
      });
    },

    // Changes or resets the column order.
    // When called with no args, returns the current order.
    // Call with { reset : true } to have it restore column order to initial configuration
    // Provide array of indexes as first argument to have it reordered by that
    _changeColumnOrder: function(order) {
      var columnsOrig = _.clone(this.dataTable.fnSettings().aoColumns);
      if (_.isArray(order)) {
        this.dataTable.fnSettings()._colReorder.fnOrder(order);
      } else if (_.has(order, 'reset') && order.reset) {
        this.dataTable.fnSettings()._colReorder.fnReset();
      } else {
        return this.dataTable.fnSettings()._colReorder.fnOrder();
      }

      // restore columnsConfig order to match the underlying order from dataTable
      var columnsConfig = this.columnsConfig();
      var columnsConfigOrig = _.clone(columnsConfig);
      // reset config
      columnsConfig.splice(0, columnsConfig.length);
      // fill in config in correct order
      _.each(this.dataTable.fnSettings().aoColumns, function(tableColumn) {
        var oldIndex = columnsOrig.indexOf(tableColumn);
        if (oldIndex != -1) {
          columnsConfig.push(columnsConfigOrig[oldIndex]);
        }
      });

      this._columnManager.columnsReordered();
    },

    _allMatchingModels : function() {
      // returns all models matching the current filter criteria, regardless of pagination
      // since we are using deferred rendering, the dataTable.$ and dataTable._ methods don't return all
      // matching data since some of the rows may not have been rendered yet.
      // here we use the the aiDisplay property to get indicies of the data matching the current filtering
      // and return the associated models
      return _.map(this.dataTable.fnSettings().aiDisplay, function(index) {
        return this.collection.at(index);
      }, this);
    },

    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true,
        paginateLengthMenu : [ 10, 25, 50, 100 ],
        paginateLength : 10,
        selectedIds : [],
        filteringEnabled: false,
        layout : "<'row'<'col-xs-6'l><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
        reorderableColumns: true,
        objectName: {
          singular: "row",
          plural: "rows"
        }
      });
      _.defaults(this, {
        sorting : [ [ 0, this.paginate ? "desc" : "asc" ] ]
      });

      if (!this.objectName.plural) {
        throw new Error("plural object name must be provided");
      } else if (!this.objectName.singular) {
        throw new Error("singular object name must be provided");
      }
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      // non-paginated tables will return all rows, ignoring the page param
      var visibleRowsCurrentPageArgs = { filter : "applied", page : "current" };
      return this.dataTable.$("tr", visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    },

    _setRowSelectedState : function(model, row, state) {
      this.selectionManager.process(model, state);
      // the row may not exist yet as we utilize deferred rendering. we track the model as
      // selected and make the ui reflect this when the row is finally created
      row && row.bulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._dataTableConfig());
      this._installSortInterceptors();
      this.filteringEnabled && this._setupFiltering();
      this.reorderableColumns && this._enableReorderableColumns();
      this._columnManager.on("change:visibility", this._onColumnVisibilityChange);
      this._columnManager.applyVisibilityPreferences();
      if (this.collection.length) this._onReset(this.collection);
    },

    _areAllVisibleRowsSelected : function() {
      var allSelected, visibleRows = this._visibleRowsOnCurrentPage();
      if (visibleRows.length) {
        allSelected = _.all(visibleRows, function(row) {
          return row.bulkState() === true;
        });
      } else {
        // have no selections does not count as having all selected
        allSelected = false;
      }
      return allSelected;
    },

    // when changing between pages / filters we set the header bulk checkbox state based on whether all newly visible rows are selected or not
    // note: we defer execution as the "page" and "filter" events are called before new rows are swapped in
    // this allows our code to run after the all the new rows are inserted
    _bulkCheckboxAdjust : function() {
      var self = this;
      if (!self.bulkCheckbox) return;
      _.defer(function() {
        self.bulkCheckbox.prop("checked", self._areAllVisibleRowsSelected());
      });
    },

    _initPaginationHandling : function() {
      this.dataTable.on("page", this._bulkCheckboxAdjust);
    },

    _initBulkHandling : function() {
      var bulkCheckbox = this.$el.find("th.bulk :checkbox");
      if (!bulkCheckbox.length) return;
      this.bulkCheckbox = bulkCheckbox;
      this.bulkCheckbox.click(this._onBulkHeaderClick);
      this.dataTable.on("click", "td.bulk :checkbox", this._onBulkRowClick);
      this.dataTable.on("filter", this._bulkCheckboxAdjust);
    },

    _dataTableConfig : function() {
      return {
        sDom : this.layout,
        bDeferRender : true,
        bPaginate : this.paginate,
        aLengthMenu : this.paginateLengthMenu,
        iDisplayLength : this.paginateLength,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
        aoColumns : this._columnManager.dataTableColumnsConfig(),
        aaSorting : this._columnManager.dataTableSortingConfig(),
        fnDrawCallback : this._onDraw
      };
    },

    _triggerChangeSelection: function(extraData) {
      var data = _.extend(extraData || {}, { count : this.selectionManager.count() });
      this.trigger("change:selected", data);
    },

    // DataTables does not provide a good way to programmatically disable sorting, so we:
    // 1) remove the default sorting event handler that dataTables adds
    // 2) Create a div and put the header in it.  We need to do this so sorting doesn't conflict with filtering
    // on the click events.
    // 3) insert our own event handler on the div that stops the event if we are locked
    // 4) re-insert the dataTables sort event handler
    _installSortInterceptors: function() {
      var self = this;
      this.dataTable.find("thead th").each(function(index) {
        $(this).off("click.DT");
        $(this).off("keypress.DT");
        // put the header text in a div
        var nDiv = document.createElement('div');
        nDiv.className = "DataTables_sort_wrapper";
        $(this).contents().appendTo(nDiv);
        this.appendChild(nDiv);
        // handle clicking on div as sorting
        $('.DataTables_sort_wrapper', this).on("click", function(event) {
          if (self.lock("sort")) {
            event.stopImmediatePropagation();
          }
        });
        // default sort handler for column with index
        self.dataTable.fnSortListener($('.DataTables_sort_wrapper', this), index);
      });
    },

    // Sets up filtering for the dataTable
    _setupFiltering: function() {
      var table = this;
      var cg = table.configGenerator();

      // Close active filter menu if user clicks on document
      $(document).click(function (event) {
        var targetIsMenu = $(event.target).hasClass('filterMenu');
        var targetIsButton = $(event.target).hasClass('btn');
        var parentIsMenu = false;
        if (event.target.offsetParent) {
          parentIsMenu = $(event.target.offsetParent).hasClass('filterMenu');
        }

        var canSlideUp = table.activeFilterMenu && ( !(targetIsMenu || parentIsMenu) || targetIsButton);
        if (canSlideUp) {
          table.activeFilterMenu.slideUp(100);
          table.activeFilterMenu = null;
        }
      });

      // We make a filter for each column header
      table.dataTable.find("thead th").each(function (index) {
        // here we use the text in the header to get the column config by title
        // there isn't a better way to do this currently
        var title = this.outerText;
        var col = cg.columnConfigByTitle.attributes[title];

        if (col) {
          // We only make the filter controls if there's a filter element in the column manager
          if (col.filter) {
            table.child("filter-"+col.attr, new DataTableFilter({
              column: col,
              table: table,
              head: this,
              className: "dropdown DataTables_filter_wrapper"
            }));
            $(this).append(table.child("filter-"+col.attr).render().$el);
          }
        }
      });
    },

    // events
    _onColumnReorder : function() {
      this.trigger("reorder");
    },

    _onDraw : function() {
      this.trigger("draw", arguments);
    },

    _onColumnVisibilityChange: function(summary) {
      this.dataTable.find(".dataTables_empty").attr("colspan", summary.visible.length);
    },

    _onBulkHeaderClick : function(event) {
      var state = this.bulkCheckbox.prop("checked");
      this.selectAllVisible(state);
      // don't let dataTables sort this column on the click of checkbox
      event.stopPropagation();
    },

    _onBulkRowClick : function(event) {
      var checkbox = $(event.target), row = checkbox.closest("tr").data("row"), checked = checkbox.prop("checked");
      // ensure that when a single row checkbox is unchecked, we uncheck the header bulk checkbox
      if (!checked) this.bulkCheckbox.prop("checked", false);
      this._setRowSelectedState(row.model, row, checked);
      this._triggerChangeSelection();
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({
        el : node,
        model : model,
        columnsConfig: this.columnsConfig()
      });
      this.cache.set(model, row);
      this.child("child" + row.cid, row).render();
      // due to deferred rendering, the model associated with the row may have already been selected, but not rendered yet.
      this.selectionManager.has(model) && row.bulkState(true);
    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid });
      this._triggerChangeSelection();
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this._triggerChangeSelection();
    },

    _onReset : function(collection) {
      if (!this.dataTable) return;
      this.dataTable.fnClearTable();
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // populate with preselected items
      this.selectionManager = new SelectionManager();
      _.each(this.selectedIds, function(id) {
        // its possible that a selected id is provided for a model that doesn't actually exist in the table, ignore it
        var selectedModel = this.collection.get(id);
        selectedModel && this._setRowSelectedState(selectedModel, null, true);
      }, this);

      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this._triggerChangeSelection();
    }

  }, {

    finalize : function(name, tableClass, views, pluginConfig, appName) {
      if (tableClass.prototype.rowClassName) {
        // method for late resolution of row class, removes dependency on needing access to the entire app
        tableClass.prototype._resolveRowClass = function() {
          return views[tableClass.prototype.rowClassName];
        };
      }

      // return all registered column types
      tableClass.prototype.availableColumnTypes = function() {
        return pluginConfig.columnTypes;
      };

      tableClass.prototype._triggerGlobalEvent = function(eventName, args) {
        $("body").trigger(appName + ":" + eventName, args);
      };
    }

  });

  return LocalDataTable;

})();

  var ServerSideDataTable = (function() {

  var ServerSideDataTable = LocalDataTable.extend({

    constructor : function() {
      // force pagination
      this.paginate = true;
      ServerSideDataTable.__super__.constructor.apply(this, arguments);
      if (this.collection.length !== 0) throw new Error("Server side dataTables requires an empty collection");
      if (!this.collection.url) throw new Error("Server side dataTables require the collection to define a url");
      _.bindAll(this, "_fetchServerData", "_addServerParams", "_onDraw", "exportData");
      this.serverParams({});
      this.selectAllMatching(false);
    },

    selectAllMatching : function(val) {
      // getter
      if (arguments.length === 0) return this._selectAllMatchingParams;

      // setter
      if (val) {
        if (this.dataTable.fnPagingInfo().iTotalPages <= 1) throw new Error("#selectAllMatching cannot be used when there are no additional paginated results");
        if (!this._areAllVisibleRowsSelected()) throw new Error("all rows must be selected before calling #selectAllMatching");
        // store current server params
        this._selectAllMatchingParams = this.serverParams();
      } else {
        // clear stored server params
        this._selectAllMatchingParams = null;
      }
    },

    // get / set additional params that should be passed as part of the ajax request
    serverParams : function(params) {
      if (arguments.length === 1) {
        this._serverParams = params;
        this.reload();
      } else {
        // make a clone so that params aren't inadvertently modified externally
        return _.clone(this._serverParams);
      }
    },

    // reload data from the server
    reload : function() {
      this.dataTable && this.dataTable.fnDraw();
    },

    _onAdd : function() {
      throw new Error("Server side dataTables do not allow adding to the collection");
    },

    _onRemove : function() {
      throw new Error("Server side dataTables do not allow removing from collection")
    },

    _onReset : function(collection, options) {
      if (!options.addData) throw new Error("An addData option is required to reset the collection");
      // clean up old data
      // note: since we have enabled server-side processing, we don't need to call
      // fnClearTable here - it is a client-side only function
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      this.selectionManager = new SelectionManager();
      // actually add new data
      options.addData(cidMap(collection));
      this._triggerChangeSelection();
    },

    // dataTables callback to allow addition of params to the ajax request
    _addServerParams : function(aoData) {
      if (this.simpleParams) {
        var sortBy, sortDir, limit, start, requestId;

        var indexOfSortedColumn = this._getDataTableParamIfExists(aoData, "iSortCol_0");

        if (indexOfSortedColumn !== null) {
          sortBy = this._columnManager.columnAttrs()[indexOfSortedColumn];
          sortDir = this._getDataTableParamIfExists(aoData, "sSortDir_0");
        }

        limit = this._getDataTableParamIfExists(aoData, "iDisplayLength");
        start = this._getDataTableParamIfExists(aoData, "iDisplayStart");
        requestId = this._getDataTableParamIfExists(aoData, "sEcho");

        // clear out existing array (but keeping reference to existing object)
        aoData.splice(0, aoData.length);

        this._addDataTableParamIfExists(aoData, "sort_by",    sortBy);
        this._addDataTableParamIfExists(aoData, "sort_dir",   sortDir);
        this._addDataTableParamIfExists(aoData, "limit",      limit);
        this._addDataTableParamIfExists(aoData, "start",      start);
        this._addDataTableParamIfExists(aoData, "request_id", requestId);
      } else {
        // add column attribute mappings as a parameter
        _.each(this._columnManager.columnAttrs(), function (attr) {
          aoData.push({name: "column_attrs[]", value: attr});
        });
      }

      // add additional static params specified for this table
      for (var key in this._serverParams) {
        aoData.push({ name : key, value : this._serverParams[key] });
      }
    },

    _getDataTableParamIfExists : function(data, key) {
      var obj = data[_.findIndex(data, { name: key })];

      if (obj) {
        return obj.value;
      } else {
        return null;
      }
    },

    _addDataTableParamIfExists : function(data, key, value) {
      if (value) {
        return data.push({ name: key, value: value });
      }
    },

    // dataTables callback after a draw event has occurred
    _onDraw : function() {
      // anytime a draw occurs (pagination change, pagination size change, sorting, etc) we want
      // to clear out any stored selectAllMatchingParams and reset the bulk select checkbox
      this.selectAllMatching(false);
      this.bulkCheckbox && this.bulkCheckbox.prop("checked", false);
      this.trigger("draw", arguments);
    },

    exportData : function(sUrl) {
      var oSettings = this.dataTable.fnSettings;
      var aoData = this.dataTable._fnAjaxParameters( oSettings );
      this._addServerParams( aoData );
      this._fetchCSV( sUrl, aoData );
    },

    _fetchCSV : function (sUrl, aoData) {
      if (this.serverSideFiltering) {
        var filterJson = {};
        filterJson.name = "ext_filter_json";
        filterJson.value = this._getFilteringSettings();
        aoData.push(filterJson);
      }
      // window.location = sUrl;
      // We want to be able to just set window.location, but we can't yet because backdraft doesn't do anything
      // with url parameters yet and we lack some infrastructure for performing this operation.
      // For now we'll use a ajax post with a custom built object url as implemented below.
      $.ajax({
        url: sUrl,
        data : aoData,
        dataType : "text",
        cache : false,
        type : this.ajaxMethod || "GET",
        success: function(response, status, xhr) {
          // check for a filename
          var filename = "";
          var disposition = xhr.getResponseHeader('Content-Disposition');
          if (disposition && disposition.indexOf('attachment') !== -1) {
            var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            var matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
          }

          var type = xhr.getResponseHeader('Content-Type');
          var blob = new Blob([response], { type: type });

          if (typeof window.navigator.msSaveBlob !== 'undefined') {
            // IE workaround for "HTML7007: One or more blob URLs were revoked by closing
            // the blob for which they were created. These URLs will no longer resolve as
            // the data backing the URL has been freed."
            window.navigator.msSaveBlob(blob, filename);
          } else {
            var URL = window.URL || window.webkitURL;
            var downloadUrl = URL.createObjectURL(blob);

            if (filename) {
              // use HTML5 a[download] attribute to specify filename
              var a = document.createElement("a");
              // safari doesn't support this yet
              if (typeof a.download === 'undefined') {
                window.location = downloadUrl;
              } else {
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
              }
            } else {
              window.location = downloadUrl;
            }

            setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 100); // cleanup
          }
        }
      })
    },

    _fetchServerData : function(sUrl, aoData, fnCallback, oSettings) {
      var self = this;
      if (this.serverSideFiltering) {
        aoData.push( { name: "ext_filter_json", value: this._getFilteringSettings() } );
      }
      oSettings.jqXHR = $.ajax({
        url : sUrl,
        data : aoData,
        dataType : "json",
        cache : false,
        type : this.ajaxMethod || "GET",
        beforeSend: function(xhr) {
          xhr.setRequestHeader('X-Backdraft', "1");
          self._triggerGlobalEvent("ajax-start.backdraft", [xhr, self]);
        },
        success : function(json) {
          json.sEcho                = json.requestId || json.draw || json.sEcho;
          json.aaData               = json.data      || json.aaData;
          json.iTotalRecords        = json.hasOwnProperty('recordsTotal') ? json.recordsTotal : json.iTotalRecords;
          json.iTotalDisplayRecords = json.hasOwnProperty('recordsFiltered') ? json.recordsFiltered :
                                        (json.hasOwnProperty('iTotalDisplayRecords') ? json.iTotalDisplayRecords : json.iTotalRecords);

          // ensure we ignore old Ajax responses
          // this piece of logic was taken from the _fnAjaxUpdateDraw method of dataTables, which is
          // what gets called by fnCallback. However, fnCallback should only be invoked after we reset the
          // collection, so we must perform the check at this point as well.
          if (_.isUndefined(json.sEcho)) return;
          if (json.sEcho * 1 < oSettings.iDraw) return;

          self.collection.reset(json.aaData, {
            addData : function(data) {
              // calling fnCallback is what will actually cause the data to be populated
              json.aaData = data;
              fnCallback(json)
            }
          });
        },
        complete: function(xhr, status) {
          self._triggerGlobalEvent("ajax-finish.backdraft", [xhr, status, self, aoData]);
        }
      });
    },

    // constructs a filter object for
    // @col: the column from column manager we're filter-string
    // @mval: the name of the element which has the value we're filtering on
    // @isFloat: whether or not the value we're filtering on needs to be parsed
    //   to a float.
    _makeFilterObj: function(col, mval, isFloat) {
      var filterObj = {
        type: col.filter.type,
        attr: col.attr,
        data_dictionary_name: col.filter.data_dictionary_name,
        comparison: mval
      };
      if (isFloat) {
        filterObj.value = parseFloat(col.filter[mval])
      } else {
        filterObj.value = col.filter[mval];
      }
      return filterObj;
    },

    // gets an object representing all filtering settings set in the column
    // manager to send to the backend to retrieve a filtered dataset
    _getFilteringSettings: function() {
      var table = this;
      var result = [];
      var cg = this._columnManager._configGenerator;
      for (var i = 0; i < cg.columnsConfig.length; i++) {
        var col = cg.columnsConfig[i];
        if (col.filter) {
          if (col.filter.value)
            result.push(table._makeFilterObj(col, "value", false));
          if (col.filter.eq)
            result.push(table._makeFilterObj(col, "eq", true));
          if (col.filter.lt)
            result.push(table._makeFilterObj(col, "lt", true));
          if (col.filter.gt)
            result.push(table._makeFilterObj(col, "gt", true));
        }
      }
      return JSON.stringify(result);
    },

    _dataTableConfig : function() {
      var config = ServerSideDataTable.__super__._dataTableConfig.apply(this, arguments);
      // add server side related options
      return _.extend(config, {
        bProcessing : true,
        bServerSide : true,
        sAjaxSource : _.result(this.collection, "url"),
        fnServerData : this._fetchServerData,
        fnServerParams : this._addServerParams,
        fnDrawCallback : this._onDraw,
        oLanguage: {
          sProcessing: this.processingText,
          sEmptyTable: this.emptyText
        }
      });
    },

    _dataTableCreate : function() {
      try {
        ServerSideDataTable.__super__._dataTableCreate.apply(this, arguments);
      } catch(ex) {
        throw new Error("Unable to create ServerSide dataTable. Does your layout template have the 'r' setting for showing the processing status? Exception: " + ex.message);
      }

      // hide inefficient filter
      this.$(".dataTables_filter").css("visibility", "hidden");
    },

    // overridden and will be handled via the _onDraw callback
    _initPaginationHandling: $.noop,

    // overridden and will be handled via the _onDraw callback
    _bulkCheckboxAdjust: $.noop,

    _initBulkHandling : function() {
      ServerSideDataTable.__super__._initBulkHandling.apply(this, arguments);
      // whenever selections change, clear out stored server params
      this.on("change:selected", function() {
        this.selectAllMatching(false);
      }, this);
    },

    _visibleRowsOnCurrentPage : function() {
      // serverSide dataTables have a bug finding rows when the "page" param is provided on pages other than the first one
      var visibleRowsCurrentPageArgs = { filter : "applied" };
      return this.dataTable.$("tr", visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    }

  });

  return ServerSideDataTable;

})();


  plugin.initializer(function(app) {

    /* Set the defaults for DataTables initialisation */
$.extend( true, $.fn.dataTable.defaults, {
  "sDom":
    "<'row'<'col-xs-6'l><'col-xs-6'f>r>"+
    "t"+
    "<'row'<'col-xs-6'i><'col-xs-6'p>>",
  "oLanguage": {
    "sLengthMenu": "_MENU_ records per page",
    "sInfoFiltered" : "<br/>(filtered from _MAX_ total)"
  }
} );


/* Default class modification */
$.extend( $.fn.dataTableExt.oStdClasses, {
  "sWrapper": "dataTables_wrapper form-inline",
  "sFilterInput": "form-control input-sm",
  "sLengthSelect": "form-control input-sm"
} );

// Integration for 1.9-
$.fn.dataTable.defaults.sPaginationType = 'bootstrap';

/* API method to get paging information */
$.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings )
{
  return {
    "iStart":         oSettings._iDisplayStart,
    "iEnd":           oSettings.fnDisplayEnd(),
    "iLength":        oSettings._iDisplayLength,
    "iTotal":         oSettings.fnRecordsTotal(),
    "iFilteredTotal": oSettings.fnRecordsDisplay(),
    "iPage":          oSettings._iDisplayLength === -1 ?
      0 : Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
    "iTotalPages":    oSettings._iDisplayLength === -1 ?
      0 : Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
  };
};

/* Bootstrap style pagination control */
$.extend( $.fn.dataTableExt.oPagination, {
  "bootstrap": {
    "fnInit": function( oSettings, nPaging, fnDraw ) {
      var oLang = oSettings.oLanguage.oPaginate;
      var fnClickHandler = function ( e ) {
        e.preventDefault();
        // prevent clicks on disabled links
        if ($(e.target).closest("li").is(".disabled")) {
          return;
        }
        if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
          fnDraw( oSettings );
        }
      };

      $(nPaging).append(
        '<ul class="pagination pagination-sm">'+
          '<li class="prev disabled"><a href="#">&larr; </a></li>'+
          '<li class="next disabled"><a href="#"> &rarr; </a></li>'+
        '</ul>'
      );
      var els = $('a', nPaging);
      $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
      $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );
    },

    "fnUpdate": function ( oSettings, fnDraw ) {
      var iListLength = 5;
      var oPaging = oSettings.oInstance.fnPagingInfo();
      var an = oSettings.aanFeatures.p;
      var i, ien, j, sClass, iStart, iEnd, iHalf=Math.floor(iListLength/2);

      if ( oPaging.iTotalPages < iListLength) {
        iStart = 1;
        iEnd = oPaging.iTotalPages;
      }
      else if ( oPaging.iPage <= iHalf ) {
        iStart = 1;
        iEnd = iListLength;
      } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
        iStart = oPaging.iTotalPages - iListLength + 1;
        iEnd = oPaging.iTotalPages;
      } else {
        iStart = oPaging.iPage - iHalf + 1;
        iEnd = iStart + iListLength - 1;
      }

      for ( i=0, ien=an.length ; i<ien ; i++ ) {
        // Remove the middle elements
        $('li:gt(0)', an[i]).filter(':not(:last)').remove();

        // Add the new list items and their event handlers
        for ( j=iStart ; j<=iEnd ; j++ ) {
          sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
          $('<li '+sClass+'><a href="#">'+j+'</a></li>')
            .insertBefore( $('li:last', an[i])[0] )
            .bind('click', function (e) {
              e.preventDefault();
              // EUGE - patched to make sure the "page" event is fired when numbers are clicked
              oSettings.oInstance.fnPageChange(parseInt($('a', this).text(),10)-1);
            } );
        }

        // Add / remove disabled classes from the static elements
        if ( oPaging.iPage === 0 ) {
          $('li:first', an[i]).addClass('disabled');
        } else {
          $('li:first', an[i]).removeClass('disabled');
        }

        if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
          $('li:last', an[i]).addClass('disabled');
        } else {
          $('li:last', an[i]).removeClass('disabled');
        }
      }
    }
  }
} );

    /*! ColReorder 1.1.3-dev
 * ©2010-2014 SpryMedia Ltd - datatables.net/license
 */

/**
 * @summary     ColReorder
 * @description Provide the ability to reorder columns in a DataTable
 * @version     1.1.3-dev
 * @file        dataTables.colReorder.js
 * @author      SpryMedia Ltd (www.sprymedia.co.uk)
 * @contact     www.sprymedia.co.uk/contact
 * @copyright   Copyright 2010-2014 SpryMedia Ltd.
 *
 * This source file is free software, available under the following license:
 *   MIT license - http://datatables.net/license/mit
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: http://www.datatables.net
 */

(function(window, document, undefined) {


/**
 * Switch the key value pairing of an index array to be value key (i.e. the old value is now the
 * key). For example consider [ 2, 0, 1 ] this would be returned as [ 1, 2, 0 ].
 *  @method  fnInvertKeyValues
 *  @param   array aIn Array to switch around
 *  @returns array
 */
function fnInvertKeyValues( aIn )
{
  var aRet=[];
  for ( var i=0, iLen=aIn.length ; i<iLen ; i++ )
  {
    aRet[ aIn[i] ] = i;
  }
  return aRet;
}


/**
 * Modify an array by switching the position of two elements
 *  @method  fnArraySwitch
 *  @param   array aArray Array to consider, will be modified by reference (i.e. no return)
 *  @param   int iFrom From point
 *  @param   int iTo Insert point
 *  @returns void
 */
function fnArraySwitch( aArray, iFrom, iTo )
{
  var mStore = aArray.splice( iFrom, 1 )[0];
  aArray.splice( iTo, 0, mStore );
}


/**
 * Switch the positions of nodes in a parent node (note this is specifically designed for
 * table rows). Note this function considers all element nodes under the parent!
 *  @method  fnDomSwitch
 *  @param   string sTag Tag to consider
 *  @param   int iFrom Element to move
 *  @param   int Point to element the element to (before this point), can be null for append
 *  @returns void
 */
function fnDomSwitch( nParent, iFrom, iTo )
{
  var anTags = [];
  for ( var i=0, iLen=nParent.childNodes.length ; i<iLen ; i++ )
  {
    if ( nParent.childNodes[i].nodeType == 1 )
    {
      anTags.push( nParent.childNodes[i] );
    }
  }
  var nStore = anTags[ iFrom ];

  if ( iTo !== null )
  {
    nParent.insertBefore( nStore, anTags[iTo] );
  }
  else
  {
    nParent.appendChild( nStore );
  }
}



var factory = function( $, DataTable ) {
"use strict";

/**
 * Plug-in for DataTables which will reorder the internal column structure by taking the column
 * from one position (iFrom) and insert it into a given point (iTo).
 *  @method  $.fn.dataTableExt.oApi.fnColReorder
 *  @param   object oSettings DataTables settings object - automatically added by DataTables!
 *  @param   int iFrom Take the column to be repositioned from this point
 *  @param   int iTo and insert it into this point
 *  @returns void
 */
$.fn.dataTableExt.oApi.fnColReorder = function ( oSettings, iFrom, iTo )
{
  var v110 = $.fn.dataTable.Api ? true : false;
  var i, iLen, j, jLen, iCols=oSettings.aoColumns.length, nTrs, oCol;
  var attrMap = function ( obj, prop, mapping ) {
    if ( ! obj[ prop ] ) {
      return;
    }

    var a = obj[ prop ].split('.');
    var num = a.shift();

    if ( isNaN( num*1 ) ) {
      return;
    }

    obj[ prop ] = mapping[ num*1 ]+'.'+a.join('.');
  };

  /* Sanity check in the input */
  if ( iFrom == iTo )
  {
    /* Pointless reorder */
    return;
  }

  if ( iFrom < 0 || iFrom >= iCols )
  {
    this.oApi._fnLog( oSettings, 1, "ColReorder 'from' index is out of bounds: "+iFrom );
    return;
  }

  if ( iTo < 0 || iTo >= iCols )
  {
    this.oApi._fnLog( oSettings, 1, "ColReorder 'to' index is out of bounds: "+iTo );
    return;
  }

  /*
   * Calculate the new column array index, so we have a mapping between the old and new
   */
  var aiMapping = [];
  for ( i=0, iLen=iCols ; i<iLen ; i++ )
  {
    aiMapping[i] = i;
  }
  fnArraySwitch( aiMapping, iFrom, iTo );
  var aiInvertMapping = fnInvertKeyValues( aiMapping );


  /*
   * Convert all internal indexing to the new column order indexes
   */
  /* Sorting */
  for ( i=0, iLen=oSettings.aaSorting.length ; i<iLen ; i++ )
  {
    oSettings.aaSorting[i][0] = aiInvertMapping[ oSettings.aaSorting[i][0] ];
  }

  /* Fixed sorting */
  if ( oSettings.aaSortingFixed !== null )
  {
    for ( i=0, iLen=oSettings.aaSortingFixed.length ; i<iLen ; i++ )
    {
      oSettings.aaSortingFixed[i][0] = aiInvertMapping[ oSettings.aaSortingFixed[i][0] ];
    }
  }

  /* Data column sorting (the column which the sort for a given column should take place on) */
  for ( i=0, iLen=iCols ; i<iLen ; i++ )
  {
    oCol = oSettings.aoColumns[i];
    for ( j=0, jLen=oCol.aDataSort.length ; j<jLen ; j++ )
    {
      oCol.aDataSort[j] = aiInvertMapping[ oCol.aDataSort[j] ];
    }

    // Update the column indexes
    if ( v110 ) {
      oCol.idx = aiInvertMapping[ oCol.idx ];
    }
  }

  if ( v110 ) {
    // Update 1.10 optimised sort class removal variable
    $.each( oSettings.aLastSort, function (i, val) {
      oSettings.aLastSort[i].src = aiInvertMapping[ val.src ];
    } );
  }

  /* Update the Get and Set functions for each column */
  for ( i=0, iLen=iCols ; i<iLen ; i++ )
  {
    oCol = oSettings.aoColumns[i];

    if ( typeof oCol.mData == 'number' ) {
      oCol.mData = aiInvertMapping[ oCol.mData ];

      // regenerate the get / set functions
      oSettings.oApi._fnColumnOptions( oSettings, i, {} );
    }
    else if ( $.isPlainObject( oCol.mData ) ) {
      // HTML5 data sourced
      attrMap( oCol.mData, '_',      aiInvertMapping );
      attrMap( oCol.mData, 'filter', aiInvertMapping );
      attrMap( oCol.mData, 'sort',   aiInvertMapping );
      attrMap( oCol.mData, 'type',   aiInvertMapping );

      // regenerate the get / set functions
      oSettings.oApi._fnColumnOptions( oSettings, i, {} );
    }
  }


  /*
   * Move the DOM elements
   */
  if ( oSettings.aoColumns[iFrom].bVisible )
  {
    /* Calculate the current visible index and the point to insert the node before. The insert
     * before needs to take into account that there might not be an element to insert before,
     * in which case it will be null, and an appendChild should be used
     */
    var iVisibleIndex = this.oApi._fnColumnIndexToVisible( oSettings, iFrom );
    var iInsertBeforeIndex = null;

    i = iTo < iFrom ? iTo : iTo + 1;
    while ( iInsertBeforeIndex === null && i < iCols )
    {
      iInsertBeforeIndex = this.oApi._fnColumnIndexToVisible( oSettings, i );
      i++;
    }

    /* Header */
    nTrs = oSettings.nTHead.getElementsByTagName('tr');
    for ( i=0, iLen=nTrs.length ; i<iLen ; i++ )
    {
      fnDomSwitch( nTrs[i], iVisibleIndex, iInsertBeforeIndex );
    }

    /* Footer */
    if ( oSettings.nTFoot !== null )
    {
      nTrs = oSettings.nTFoot.getElementsByTagName('tr');
      for ( i=0, iLen=nTrs.length ; i<iLen ; i++ )
      {
        fnDomSwitch( nTrs[i], iVisibleIndex, iInsertBeforeIndex );
      }
    }

    /* Body */
    for ( i=0, iLen=oSettings.aoData.length ; i<iLen ; i++ )
    {
      if ( oSettings.aoData[i].nTr !== null )
      {
        fnDomSwitch( oSettings.aoData[i].nTr, iVisibleIndex, iInsertBeforeIndex );
      }
    }
  }

  /*
   * Move the internal array elements
   */
  /* Columns */
  fnArraySwitch( oSettings.aoColumns, iFrom, iTo );

  /* Search columns */
  fnArraySwitch( oSettings.aoPreSearchCols, iFrom, iTo );

  /* Array array - internal data anodes cache */
  for ( i=0, iLen=oSettings.aoData.length ; i<iLen ; i++ )
  {
    var data = oSettings.aoData[i];

    if ( v110 ) {
      // DataTables 1.10+
      if ( data.anCells ) {
        fnArraySwitch( data.anCells, iFrom, iTo );
      }

      // For DOM sourced data, the invalidate will reread the cell into
      // the data array, but for data sources as an array, they need to
      // be flipped
      if ( data.src !== 'dom' && $.isArray( data._aData ) ) {
        fnArraySwitch( data._aData, iFrom, iTo );
      }
    }
    else {
      // DataTables 1.9-
      if ( $.isArray( data._aData ) ) {
        fnArraySwitch( data._aData, iFrom, iTo );
      }
      fnArraySwitch( data._anHidden, iFrom, iTo );
    }
  }

  /* Reposition the header elements in the header layout array */
  for ( i=0, iLen=oSettings.aoHeader.length ; i<iLen ; i++ )
  {
    fnArraySwitch( oSettings.aoHeader[i], iFrom, iTo );
  }

  if ( oSettings.aoFooter !== null )
  {
    for ( i=0, iLen=oSettings.aoFooter.length ; i<iLen ; i++ )
    {
      fnArraySwitch( oSettings.aoFooter[i], iFrom, iTo );
    }
  }

  // In 1.10 we need to invalidate row cached data for sorting, filtering etc
  if ( v110 ) {
    var api = new $.fn.dataTable.Api( oSettings );
    api.rows().invalidate();
  }

  /*
   * Update DataTables' event handlers
   */

  /* Sort listener */
  for ( i=0, iLen=iCols ; i<iLen ; i++ )
  {
    $(oSettings.aoColumns[i].nTh).off('click.DT');
    this.oApi._fnSortAttachListener( oSettings, oSettings.aoColumns[i].nTh, i );
  }


  /* Fire an event so other plug-ins can update */
  $(oSettings.oInstance).trigger( 'column-reorder', [ oSettings, {
    "iFrom": iFrom,
    "iTo": iTo,
    "aiInvertMapping": aiInvertMapping
  } ] );
};


/**
 * ColReorder provides column visibility control for DataTables
 * @class ColReorder
 * @constructor
 * @param {object} dt DataTables settings object
 * @param {object} opts ColReorder options
 */
var ColReorder = function( dt, opts )
{
  var oDTSettings;

  if ( $.fn.dataTable.Api ) {
    oDTSettings = new $.fn.dataTable.Api( dt ).settings()[0];
  }
  // 1.9 compatibility
  else if ( dt.fnSettings ) {
    // DataTables object, convert to the settings object
    oDTSettings = dt.fnSettings();
  }
  else if ( typeof dt === 'string' ) {
    // jQuery selector
    if ( $.fn.dataTable.fnIsDataTable( $(dt)[0] ) ) {
      oDTSettings = $(dt).eq(0).dataTable().fnSettings();
    }
  }
  else if ( dt.nodeName && dt.nodeName.toLowerCase() === 'table' ) {
    // Table node
    if ( $.fn.dataTable.fnIsDataTable( dt.nodeName ) ) {
      oDTSettings = $(dt.nodeName).dataTable().fnSettings();
    }
  }
  else if ( dt instanceof jQuery ) {
    // jQuery object
    if ( $.fn.dataTable.fnIsDataTable( dt[0] ) ) {
      oDTSettings = dt.eq(0).dataTable().fnSettings();
    }
  }
  else {
    // DataTables settings object
    oDTSettings = dt;
  }

  // Ensure that we can't initialise on the same table twice
  if ( oDTSettings._colReorder ) {
    throw "ColReorder already initialised on table #"+oDTSettings.nTable.id;
  }

  // Convert from camelCase to Hungarian, just as DataTables does
  var camelToHungarian = $.fn.dataTable.camelToHungarian;
  if ( camelToHungarian ) {
    camelToHungarian( ColReorder.defaults, ColReorder.defaults, true );
    camelToHungarian( ColReorder.defaults, opts || {} );
  }


  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Public class variables
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * @namespace Settings object which contains customisable information for ColReorder instance
   */
  this.s = {
    /**
     * DataTables settings object
     *  @property dt
     *  @type     Object
     *  @default  null
     */
    "dt": null,

    /**
     * Initialisation object used for this instance
     *  @property init
     *  @type     object
     *  @default  {}
     */
    "init": $.extend( true, {}, ColReorder.defaults, opts ),

    /**
     * Number of columns to fix (not allow to be reordered)
     *  @property fixed
     *  @type     int
     *  @default  0
     */
    "fixed": 0,

    /**
     * Number of columns to fix counting from right (not allow to be reordered)
     *  @property fixedRight
     *  @type     int
     *  @default  0
     */
    "fixedRight": 0,

    /**
     * Callback function for once the reorder has been done
     *  @property dropcallback
     *  @type     function
     *  @default  null
     */
    "dropCallback": null,

    /**
     * @namespace Information used for the mouse drag
     */
    "mouse": {
      "startX": -1,
      "startY": -1,
      "offsetX": -1,
      "offsetY": -1,
      "target": -1,
      "targetIndex": -1,
      "fromIndex": -1
    },

    /**
     * Information which is used for positioning the insert cusor and knowing where to do the
     * insert. Array of objects with the properties:
     *   x: x-axis position
     *   to: insert point
     *  @property aoTargets
     *  @type     array
     *  @default  []
     */
    "aoTargets": []
  };


  /**
   * @namespace Common and useful DOM elements for the class instance
   */
  this.dom = {
    /**
     * Dragging element (the one the mouse is moving)
     *  @property drag
     *  @type     element
     *  @default  null
     */
    "drag": null,

    /**
     * The insert cursor
     *  @property pointer
     *  @type     element
     *  @default  null
     */
    "pointer": null
  };


  /* Constructor logic */
  this.s.dt = oDTSettings;
  this.s.dt._colReorder = this;
  this._fnConstruct();

  /* Add destroy callback */
  oDTSettings.oApi._fnCallbackReg(oDTSettings, 'aoDestroyCallback', $.proxy(this._fnDestroy, this), 'ColReorder');

  return this;
};



ColReorder.prototype = {
  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Public methods
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * Reset the column ordering to the original ordering that was detected on
   * start up.
   *  @return {this} Returns `this` for chaining.
   *
   *  @example
   *    // DataTables initialisation with ColReorder
   *    var table = $('#example').dataTable( {
   *        "sDom": 'Rlfrtip'
   *    } );
   *
   *    // Add click event to a button to reset the ordering
   *    $('#resetOrdering').click( function (e) {
   *        e.preventDefault();
   *        $.fn.dataTable.ColReorder( table ).fnReset();
   *    } );
   */
  "fnReset": function ()
  {
    var a = [];
    for ( var i=0, iLen=this.s.dt.aoColumns.length ; i<iLen ; i++ )
    {
      a.push( this.s.dt.aoColumns[i]._ColReorder_iOrigCol );
    }

    this._fnOrderColumns( a );

    return this;
  },

  /**
   * `Deprecated` - Get the current order of the columns, as an array.
   *  @return {array} Array of column identifiers
   *  @deprecated `fnOrder` should be used in preference to this method.
   *      `fnOrder` acts as a getter/setter.
   */
  "fnGetCurrentOrder": function ()
  {
    return this.fnOrder();
  },

  /**
   * Get the current order of the columns, as an array. Note that the values
   * given in the array are unique identifiers for each column. Currently
   * these are the original ordering of the columns that was detected on
   * start up, but this could potentially change in future.
   *  @return {array} Array of column identifiers
   *
   *  @example
   *    // Get column ordering for the table
   *    var order = $.fn.dataTable.ColReorder( dataTable ).fnOrder();
   *//**
   * Set the order of the columns, from the positions identified in the
   * ordering array given. Note that ColReorder takes a brute force approach
   * to reordering, so it is possible multiple reordering events will occur
   * before the final order is settled upon.
   *  @param {array} [set] Array of column identifiers in the new order. Note
   *    that every column must be included, uniquely, in this array.
   *  @return {this} Returns `this` for chaining.
   *
   *  @example
   *    // Swap the first and second columns
   *    $.fn.dataTable.ColReorder( dataTable ).fnOrder( [1, 0, 2, 3, 4] );
   *
   *  @example
   *    // Move the first column to the end for the table `#example`
   *    var curr = $.fn.dataTable.ColReorder( '#example' ).fnOrder();
   *    var first = curr.shift();
   *    curr.push( first );
   *    $.fn.dataTable.ColReorder( '#example' ).fnOrder( curr );
   *
   *  @example
   *    // Reverse the table's order
   *    $.fn.dataTable.ColReorder( '#example' ).fnOrder(
   *      $.fn.dataTable.ColReorder( '#example' ).fnOrder().reverse()
   *    );
   */
  "fnOrder": function ( set )
  {
    if ( set === undefined )
    {
      var a = [];
      for ( var i=0, iLen=this.s.dt.aoColumns.length ; i<iLen ; i++ )
      {
        a.push( this.s.dt.aoColumns[i]._ColReorder_iOrigCol );
      }
      return a;
    }

    this._fnOrderColumns( fnInvertKeyValues( set ) );

    return this;
  },


  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Private methods (they are of course public in JS, but recommended as private)
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * Constructor logic
   *  @method  _fnConstruct
   *  @returns void
   *  @private
   */
  "_fnConstruct": function ()
  {
    var that = this;
    var iLen = this.s.dt.aoColumns.length;
    var i;

    /* Columns discounted from reordering - counting left to right */
    if ( this.s.init.iFixedColumns )
    {
      this.s.fixed = this.s.init.iFixedColumns;
    }

    /* Columns discounted from reordering - counting right to left */
    this.s.fixedRight = this.s.init.iFixedColumnsRight ?
      this.s.init.iFixedColumnsRight :
      0;

    /* Drop callback initialisation option */
    if ( this.s.init.fnReorderCallback )
    {
      this.s.dropCallback = this.s.init.fnReorderCallback;
    }

    /* Add event handlers for the drag and drop, and also mark the original column order */
    for ( i = 0; i < iLen; i++ )
    {
      if ( i > this.s.fixed-1 && i < iLen - this.s.fixedRight )
      {
        this._fnMouseListener( i, this.s.dt.aoColumns[i].nTh );
      }

      /* Mark the original column order for later reference */
      this.s.dt.aoColumns[i]._ColReorder_iOrigCol = i;
    }

    /* State saving */
    this.s.dt.oApi._fnCallbackReg( this.s.dt, 'aoStateSaveParams', function (oS, oData) {
      that._fnStateSave.call( that, oData );
    }, "ColReorder_State" );

    /* An initial column order has been specified */
    var aiOrder = null;
    if ( this.s.init.aiOrder )
    {
      aiOrder = this.s.init.aiOrder.slice();
    }

    /* State loading, overrides the column order given */
    if ( this.s.dt.oLoadedState && typeof this.s.dt.oLoadedState.ColReorder != 'undefined' &&
      this.s.dt.oLoadedState.ColReorder.length == this.s.dt.aoColumns.length )
    {
      aiOrder = this.s.dt.oLoadedState.ColReorder;
    }

    /* If we have an order to apply - do so */
    if ( aiOrder )
    {
      /* We might be called during or after the DataTables initialisation. If before, then we need
       * to wait until the draw is done, if after, then do what we need to do right away
       */
      if ( !that.s.dt._bInitComplete )
      {
        var bDone = false;
        this.s.dt.aoDrawCallback.push( {
          "fn": function () {
            if ( !that.s.dt._bInitComplete && !bDone )
            {
              bDone = true;
              var resort = fnInvertKeyValues( aiOrder );
              that._fnOrderColumns.call( that, resort );
            }
          },
          "sName": "ColReorder_Pre"
        } );
      }
      else
      {
        var resort = fnInvertKeyValues( aiOrder );
        that._fnOrderColumns.call( that, resort );
      }
    }
    else {
      this._fnSetColumnIndexes();
    }
  },


  /**
   * Set the column order from an array
   *  @method  _fnOrderColumns
   *  @param   array a An array of integers which dictate the column order that should be applied
   *  @returns void
   *  @private
   */
  "_fnOrderColumns": function ( a )
  {
    if ( a.length != this.s.dt.aoColumns.length )
    {
      this.s.dt.oInstance.oApi._fnLog( this.s.dt, 1, "ColReorder - array reorder does not "+
        "match known number of columns. Skipping." );
      return;
    }

    for ( var i=0, iLen=a.length ; i<iLen ; i++ )
    {
      var currIndex = $.inArray( i, a );
      if ( i != currIndex )
      {
        /* Reorder our switching array */
        fnArraySwitch( a, currIndex, i );

        /* Do the column reorder in the table */
        this.s.dt.oInstance.fnColReorder( currIndex, i );
      }
    }

    /* When scrolling we need to recalculate the column sizes to allow for the shift */
    if ( this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "" )
    {
      this.s.dt.oInstance.fnAdjustColumnSizing();
    }

    /* Save the state */
    this.s.dt.oInstance.oApi._fnSaveState( this.s.dt );

    this._fnSetColumnIndexes();
  },


  /**
   * Because we change the indexes of columns in the table, relative to their starting point
   * we need to reorder the state columns to what they are at the starting point so we can
   * then rearrange them again on state load!
   *  @method  _fnStateSave
   *  @param   object oState DataTables state
   *  @returns string JSON encoded cookie string for DataTables
   *  @private
   */
  "_fnStateSave": function ( oState )
  {
    var i, iLen, aCopy, iOrigColumn;
    var oSettings = this.s.dt;
    var columns = oSettings.aoColumns;

    oState.ColReorder = [];

    /* Sorting */
    if ( oState.aaSorting ) {
      // 1.10.0-
      for ( i=0 ; i<oState.aaSorting.length ; i++ ) {
        oState.aaSorting[i][0] = columns[ oState.aaSorting[i][0] ]._ColReorder_iOrigCol;
      }

      var aSearchCopy = $.extend( true, [], oState.aoSearchCols );

      for ( i=0, iLen=columns.length ; i<iLen ; i++ )
      {
        iOrigColumn = columns[i]._ColReorder_iOrigCol;

        /* Column filter */
        oState.aoSearchCols[ iOrigColumn ] = aSearchCopy[i];

        /* Visibility */
        oState.abVisCols[ iOrigColumn ] = columns[i].bVisible;

        /* Column reordering */
        oState.ColReorder.push( iOrigColumn );
      }
    }
    else if ( oState.order ) {
      // 1.10.1+
      for ( i=0 ; i<oState.order.length ; i++ ) {
        oState.order[i][0] = columns[ oState.order[i][0] ]._ColReorder_iOrigCol;
      }

      var stateColumnsCopy = $.extend( true, [], oState.columns );

      for ( i=0, iLen=columns.length ; i<iLen ; i++ )
      {
        iOrigColumn = columns[i]._ColReorder_iOrigCol;

        /* Columns */
        oState.columns[ iOrigColumn ] = stateColumnsCopy[i];

        /* Column reordering */
        oState.ColReorder.push( iOrigColumn );
      }
    }
  },


  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Mouse drop and drag
   */

  /**
   * Add a mouse down listener to a particluar TH element
   *  @method  _fnMouseListener
   *  @param   int i Column index
   *  @param   element nTh TH element clicked on
   *  @returns void
   *  @private
   */
  "_fnMouseListener": function ( i, nTh )
  {
    var that = this;
    $(nTh).on( 'mousedown.ColReorder', function (e) {
      e.preventDefault();
      that._fnMouseDown.call( that, e, nTh );
    } );
  },


  /**
   * Mouse down on a TH element in the table header
   *  @method  _fnMouseDown
   *  @param   event e Mouse event
   *  @param   element nTh TH element to be dragged
   *  @returns void
   *  @private
   */
  "_fnMouseDown": function ( e, nTh )
  {
    var that = this;

    /* Store information about the mouse position */
    var target = $(e.target).closest('th, td');
    var offset = target.offset();
    var idx = parseInt( $(nTh).attr('data-column-index'), 10 );

    if ( idx === undefined ) {
      return;
    }

    this.s.mouse.startX = e.pageX;
    this.s.mouse.startY = e.pageY;
    this.s.mouse.offsetX = e.pageX - offset.left;
    this.s.mouse.offsetY = e.pageY - offset.top;
    this.s.mouse.target = this.s.dt.aoColumns[ idx ].nTh;//target[0];
    this.s.mouse.targetIndex = idx;
    this.s.mouse.fromIndex = idx;

    this._fnRegions();

    /* Add event handlers to the document */
    $(document)
      .on( 'mousemove.ColReorder', function (e) {
        that._fnMouseMove.call( that, e );
      } )
      .on( 'mouseup.ColReorder', function (e) {
        that._fnMouseUp.call( that, e );
      } );
  },


  /**
   * Deal with a mouse move event while dragging a node
   *  @method  _fnMouseMove
   *  @param   event e Mouse event
   *  @returns void
   *  @private
   */
  "_fnMouseMove": function ( e )
  {
    var that = this;

    if ( this.dom.drag === null )
    {
      /* Only create the drag element if the mouse has moved a specific distance from the start
       * point - this allows the user to make small mouse movements when sorting and not have a
       * possibly confusing drag element showing up
       */
      if ( Math.pow(
        Math.pow(e.pageX - this.s.mouse.startX, 2) +
        Math.pow(e.pageY - this.s.mouse.startY, 2), 0.5 ) < 5 )
      {
        return;
      }
      this._fnCreateDragNode();
    }

    /* Position the element - we respect where in the element the click occured */
    this.dom.drag.css( {
      left: e.pageX - this.s.mouse.offsetX,
      top: e.pageY - this.s.mouse.offsetY
    } );

    /* Based on the current mouse position, calculate where the insert should go */
    var bSet = false;
    var lastToIndex = this.s.mouse.toIndex;

    for ( var i=1, iLen=this.s.aoTargets.length ; i<iLen ; i++ )
    {
      if ( e.pageX < this.s.aoTargets[i-1].x + ((this.s.aoTargets[i].x-this.s.aoTargets[i-1].x)/2) )
      {
        this.dom.pointer.css( 'left', this.s.aoTargets[i-1].x );
        this.s.mouse.toIndex = this.s.aoTargets[i-1].to;
        bSet = true;
        break;
      }
    }

    // The insert element wasn't positioned in the array (less than
    // operator), so we put it at the end
    if ( !bSet )
    {
      this.dom.pointer.css( 'left', this.s.aoTargets[this.s.aoTargets.length-1].x );
      this.s.mouse.toIndex = this.s.aoTargets[this.s.aoTargets.length-1].to;
    }

    // Perform reordering if realtime updating is on and the column has moved
    if ( this.s.init.bRealtime && lastToIndex !== this.s.mouse.toIndex ) {
      this.s.dt.oInstance.fnColReorder( this.s.mouse.fromIndex, this.s.mouse.toIndex );
      this.s.mouse.fromIndex = this.s.mouse.toIndex;
      this._fnRegions();
    }
  },


  /**
   * Finish off the mouse drag and insert the column where needed
   *  @method  _fnMouseUp
   *  @param   event e Mouse event
   *  @returns void
   *  @private
   */
  "_fnMouseUp": function ( e )
  {
    var that = this;

    $(document).off( 'mousemove.ColReorder mouseup.ColReorder' );

    if ( this.dom.drag !== null )
    {
      /* Remove the guide elements */
      this.dom.drag.remove();
      this.dom.pointer.remove();
      this.dom.drag = null;
      this.dom.pointer = null;

      /* Actually do the reorder */
      this.s.dt.oInstance.fnColReorder( this.s.mouse.fromIndex, this.s.mouse.toIndex );
      this._fnSetColumnIndexes();

      /* When scrolling we need to recalculate the column sizes to allow for the shift */
      if ( this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "" )
      {
        this.s.dt.oInstance.fnAdjustColumnSizing();
      }

      if ( this.s.dropCallback !== null )
      {
        this.s.dropCallback.call( this, this.s.mouse.fromIndex, this.s.mouse.toIndex );
      }

      /* Save the state */
      this.s.dt.oInstance.oApi._fnSaveState( this.s.dt );
    }
  },


  /**
   * Calculate a cached array with the points of the column inserts, and the
   * 'to' points
   *  @method  _fnRegions
   *  @returns void
   *  @private
   */
  "_fnRegions": function ()
  {
    var aoColumns = this.s.dt.aoColumns;

    this.s.aoTargets.splice( 0, this.s.aoTargets.length );

    this.s.aoTargets.push( {
      "x":  $(this.s.dt.nTable).offset().left,
      "to": 0
    } );

    var iToPoint = 0;
    for ( var i=0, iLen=aoColumns.length ; i<iLen ; i++ )
    {
      /* For the column / header in question, we want it's position to remain the same if the
       * position is just to it's immediate left or right, so we only incremement the counter for
       * other columns
       */
      if ( i != this.s.mouse.fromIndex )
      {
        iToPoint++;
      }

      if ( aoColumns[i].bVisible )
      {
        this.s.aoTargets.push( {
          "x":  $(aoColumns[i].nTh).offset().left + $(aoColumns[i].nTh).outerWidth(),
          "to": iToPoint
        } );
      }
    }

    /* Disallow columns for being reordered by drag and drop, counting right to left */
    if ( this.s.fixedRight !== 0 )
    {
      this.s.aoTargets.splice( this.s.aoTargets.length - this.s.fixedRight );
    }

    /* Disallow columns for being reordered by drag and drop, counting left to right */
    if ( this.s.fixed !== 0 )
    {
      this.s.aoTargets.splice( 0, this.s.fixed );
    }
  },


  /**
   * Copy the TH element that is being drags so the user has the idea that they are actually
   * moving it around the page.
   *  @method  _fnCreateDragNode
   *  @returns void
   *  @private
   */
  "_fnCreateDragNode": function ()
  {
    var scrolling = this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "";

    var origCell = this.s.dt.aoColumns[ this.s.mouse.targetIndex ].nTh;
    var origTr = origCell.parentNode;
    var origThead = origTr.parentNode;
    var origTable = origThead.parentNode;
    var cloneCell = $(origCell).clone();

    // This is a slightly odd combination of jQuery and DOM, but it is the
    // fastest and least resource intensive way I could think of cloning
    // the table with just a single header cell in it.
    this.dom.drag = $(origTable.cloneNode(false))
      .addClass( 'DTCR_clonedTable' )
      .append(
        origThead.cloneNode(false).appendChild(
          origTr.cloneNode(false).appendChild(
            cloneCell[0]
          )
        )
      )
      .css( {
        position: 'absolute',
        top: 0,
        left: 0,
        width: $(origCell).outerWidth(),
        height: $(origCell).outerHeight()
      } )
      .appendTo( 'body' );

    this.dom.pointer = $('<div></div>')
      .addClass( 'DTCR_pointer' )
      .css( {
        position: 'absolute',
        top: scrolling ?
          $('div.dataTables_scroll', this.s.dt.nTableWrapper).offset().top :
          $(this.s.dt.nTable).offset().top,
        height : scrolling ?
          $('div.dataTables_scroll', this.s.dt.nTableWrapper).height() :
          $(this.s.dt.nTable).height()
      } )
      .appendTo( 'body' );
  },

  /**
   * Clean up ColReorder memory references and event handlers
   *  @method  _fnDestroy
   *  @returns void
   *  @private
   */
  "_fnDestroy": function ()
  {
    var i, iLen;

    for ( i=0, iLen=this.s.dt.aoDrawCallback.length ; i<iLen ; i++ )
    {
      if ( this.s.dt.aoDrawCallback[i].sName === 'ColReorder_Pre' )
      {
        this.s.dt.aoDrawCallback.splice( i, 1 );
        break;
      }
    }

    $(this.s.dt.nTHead).find( '*' ).off( '.ColReorder' );

    $.each( this.s.dt.aoColumns, function (i, column) {
      $(column.nTh).removeAttr('data-column-index');
    } );

    this.s.dt._colReorder = null;
    this.s = null;
  },


  /**
   * Add a data attribute to the column headers, so we know the index of
   * the row to be reordered. This allows fast detection of the index, and
   * for this plug-in to work with FixedHeader which clones the nodes.
   *  @private
   */
  "_fnSetColumnIndexes": function ()
  {
    $.each( this.s.dt.aoColumns, function (i, column) {
      $(column.nTh).attr('data-column-index', i);
    } );
  }
};





/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Static parameters
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/**
 * ColReorder default settings for initialisation
 *  @namespace
 *  @static
 */
ColReorder.defaults = {
  /**
   * Predefined ordering for the columns that will be applied automatically
   * on initialisation. If not specified then the order that the columns are
   * found to be in the HTML is the order used.
   *  @type array
   *  @default null
   *  @static
   *  @example
   *      // Using the `oColReorder` option in the DataTables options object
   *      $('#example').dataTable( {
   *          "sDom": 'Rlfrtip',
   *          "oColReorder": {
   *              "aiOrder": [ 4, 3, 2, 1, 0 ]
   *          }
   *      } );
   *
   *  @example
   *      // Using `new` constructor
   *      $('#example').dataTable()
   *
   *      new $.fn.dataTable.ColReorder( '#example', {
   *          "aiOrder": [ 4, 3, 2, 1, 0 ]
   *      } );
   */
  aiOrder: null,

  /**
   * Redraw the table's column ordering as the end user draws the column
   * (`true`) or wait until the mouse is released (`false` - default). Note
   * that this will perform a redraw on each reordering, which involves an
   * Ajax request each time if you are using server-side processing in
   * DataTables.
   *  @type boolean
   *  @default false
   *  @static
   *  @example
   *      // Using the `oColReorder` option in the DataTables options object
   *      $('#example').dataTable( {
   *          "sDom": 'Rlfrtip',
   *          "oColReorder": {
   *              "bRealtime": true
   *          }
   *      } );
   *
   *  @example
   *      // Using `new` constructor
   *      $('#example').dataTable()
   *
   *      new $.fn.dataTable.ColReorder( '#example', {
   *          "bRealtime": true
   *      } );
   */
  bRealtime: false,

  /**
   * Indicate how many columns should be fixed in position (counting from the
   * left). This will typically be 1 if used, but can be as high as you like.
   *  @type int
   *  @default 0
   *  @static
   *  @example
   *      // Using the `oColReorder` option in the DataTables options object
   *      $('#example').dataTable( {
   *          "sDom": 'Rlfrtip',
   *          "oColReorder": {
   *              "iFixedColumns": 1
   *          }
   *      } );
   *
   *  @example
   *      // Using `new` constructor
   *      $('#example').dataTable()
   *
   *      new $.fn.dataTable.ColReorder( '#example', {
   *          "iFixedColumns": 1
   *      } );
   */
  iFixedColumns: 0,

  /**
   * As `iFixedColumnsRight` but counting from the right.
   *  @type int
   *  @default 0
   *  @static
   *  @example
   *      // Using the `oColReorder` option in the DataTables options object
   *      $('#example').dataTable( {
   *          "sDom": 'Rlfrtip',
   *          "oColReorder": {
   *              "iFixedColumnsRight": 1
   *          }
   *      } );
   *
   *  @example
   *      // Using `new` constructor
   *      $('#example').dataTable()
   *
   *      new $.fn.dataTable.ColReorder( '#example', {
   *          "iFixedColumnsRight": 1
   *      } );
   */
  iFixedColumnsRight: 0,

  /**
   * Callback function that is fired when columns are reordered
   *  @type function():void
   *  @default null
   *  @static
   *  @example
   *      // Using the `oColReorder` option in the DataTables options object
   *      $('#example').dataTable( {
   *          "sDom": 'Rlfrtip',
   *          "oColReorder": {
   *              "fnReorderCallback": function () {
   *                  alert( 'Columns reordered' );
   *              }
   *          }
   *      } );
   *
   *  @example
   *      // Using `new` constructor
   *      $('#example').dataTable()
   *
   *      new $.fn.dataTable.ColReorder( '#example', {
   *          "fnReorderCallback": function () {
   *              alert( 'Columns reordered' );
   *          }
   *      } );
   */
  fnReorderCallback: null
};



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Constants
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/**
 * ColReorder version
 *  @constant  version
 *  @type      String
 *  @default   As code
 */
ColReorder.version = "1.1.3-dev";



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * DataTables interfaces
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Expose
$.fn.dataTable.ColReorder = ColReorder;
$.fn.DataTable.ColReorder = ColReorder;


// Register a new feature with DataTables
if ( typeof $.fn.dataTable == "function" &&
     typeof $.fn.dataTableExt.fnVersionCheck == "function" &&
     $.fn.dataTableExt.fnVersionCheck('1.9.3') )
{
  $.fn.dataTableExt.aoFeatures.push( {
    "fnInit": function( settings ) {
      var table = settings.oInstance;

      if ( ! settings._colReorder ) {
        var dtInit = settings.oInit;
        var opts = dtInit.colReorder || dtInit.oColReorder || {};

        new ColReorder( settings, opts );
      }
      else {
        table.oApi._fnLog( settings, 1, "ColReorder attempted to initialise twice. Ignoring second" );
      }

      return null; /* No node for DataTables to insert */
    },
    "cFeature": "R",
    "sFeature": "ColReorder"
  } );
}
else {
  alert( "Warning: ColReorder requires DataTables 1.9.3 or greater - www.datatables.net/download");
}


// API augmentation
if ( $.fn.dataTable.Api ) {
  $.fn.dataTable.Api.register( 'colReorder.reset()', function () {
    return this.iterator( 'table', function ( ctx ) {
      ctx._colReorder.fnReset();
    } );
  } );

  $.fn.dataTable.Api.register( 'colReorder.order()', function ( set ) {
    if ( set ) {
      return this.iterator( 'table', function ( ctx ) {
        ctx._colReorder.fnOrder( set );
      } );
    }

    return this.context.length ?
      this.context[0]._colReorder.fnOrder() :
      null;
  } );
}

return ColReorder;
}; // /factory


// Define as an AMD module if possible
if ( typeof define === 'function' && define.amd ) {
  define( ['jquery', 'datatables'], factory );
}
else if ( typeof exports === 'object' ) {
    // Node/CommonJS
    factory( require('jquery'), require('datatables') );
}
else if ( jQuery && !jQuery.fn.dataTable.ColReorder ) {
  // Otherwise simply initialise as normal, stopping multiple evaluation
  factory( jQuery, jQuery.fn.dataTable );
}


})(window, document);

    app.view.dataTable = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views, app.view.dataTable.config, app.name);
    };

    app.view.dataTable.row = function(name, baseClassName, properties) {
      var baseClass = Row, renderers;
      if (arguments.length === 2) {
        properties = baseClassName;
      } else {
        baseClass = app.Views[baseClassName];
      }

      // special handling for inheritance of renderers
      properties.renderers = _.extend({}, baseClass.prototype.renderers, properties.renderers || {});

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
    };

    // storage for app wide configuration of the plugin
    app.view.dataTable.config = {
      columnTypes: []
    };

    app.view.dataTable.columnType = function(cb) {
      var columnType = new ColumnType();
      cb(columnType);
      app.view.dataTable.config.columnTypes.push(columnType);
    };

    // add standard column types
    app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return config.bulk === true;
  });

  columnType.nodeMatcher(function(config) {
    return ".bulk";
  });

  columnType.definition(function(dataTable, config) {
    return {
      bSortable: config.sort,
      bSearchable: false,
      sTitle: "<input type='checkbox' />",
      sClass : "bulk",
      mData: function(source, type, val) {
        return dataTable.collection.get(source);
      },
      mRender : function(data, type, full) {
        if (type === "sort" || type === "type") {
          return dataTable.selectionManager.has(data) ? 1 : -1;
        } else {
          return "";
        }
      }
    };
  });

  columnType.renderer(function(cell, config) {
    if (this.checkbox) return;
    this.checkbox = $("<input>").attr("type", "checkbox");
    cell.html(this.checkbox);
  });
});
    app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return !!config.attr;
  });

  columnType.nodeMatcher(function(config) {
    return "." + Backdraft.Utils.toCSSClass(config.title);
  });

  columnType.definition(function(dataTable, config) {
    return {
      bSortable: config.sort,
      bSearchable: config.search,
      asSorting: config.sortDir,
      sTitle: config.title,
      sClass : Backdraft.Utils.toCSSClass(config.title),
      mData: function(source, type, val) {
        return dataTable.collection.get(source).get(config.attr);
      },
      mRender : function(data, type, full) {
        // note data is based on the result of mData
        if (type === "display") {
          // nothing to display so that the view can provide its own UI
          return "";
        } else {
          return data;
        }
      }
    };
  });

  columnType.renderer(function(cell, config) {
    var renderer = this.renderers[config.title];
    if (renderer) {
      renderer.apply(this, arguments);
    } else {
       cell.text(this.model.get(config.attr));
    }
  });
});

    app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return !config.attr && config.title;
  });

  columnType.nodeMatcher(function(config) {
    return "." + Backdraft.Utils.toCSSClass(config.title);
  });

  columnType.definition(function(dataTable, config) {
    var searchable = !_.isUndefined(config.searchBy), sortable = !_.isUndefined(config.sortBy);
    var ignore = function() {
      return "";
    };

    return {
      bSortable: sortable,
      bSearchable: searchable,
      sTitle: config.title,
      sClass : Backdraft.Utils.toCSSClass(config.title),
      mData: function(source, type, val) {
        return dataTable.collection.get(source);
      },
      mRender : function(data, type, full) {
        // note data is based on the result of mData
        if (type === "sort") {
          return (config.sortBy || ignore)(data);
        } else if (type === "type") {
          return (config.sortBy || ignore)(data);
        } else if (type === "display") {
          // renderers will fill content
          return ignore();
        } else if (type === "filter") {
          return (config.searchBy || ignore)(data);
        } else {
          // note dataTables can call in with undefined type
          return ignore();
        }
      }
    };
  });

  columnType.renderer(function(cell, config) {
    var renderer = this.renderers[config.title];
    if (!renderer) throw new Error("renderer is missing for " + JSON.stringify(config));
    renderer.apply(this, arguments);
  });
});
  });

});


  Backdraft.plugin("Listing", function(plugin) {

  var List = (function() {

  var Base = Backdraft.plugin("Base");

  var List = Base.View.extend({

    constructor : function(options) {
      this.options = options || {};
      this.cache = new Base.Cache();
      this.itemClass = this.getItemClass();
      List.__super__.constructor.apply(this, arguments);
      if (!this.collection) throw new Error("A collection must be provided");
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    _onAdd : function(model) {
      this.$el.append(this._createNewItem(model).render().$el);
    },

    _onRemove : function(model) {
      this.cache.unset(model).close();
    },

    _onReset : function(collection) {
      this.cache.each(function(item) {
        item.close();
      }, this);
      this.cache.reset();
      this.$el.empty();

      // optimized bulk insertion of views
      var fragment = document.createDocumentFragment();
      this.collection.each(function(model) {
        fragment.appendChild(this._createNewItem(model).render().el);
      }, this);
      this.$el.append(fragment);
    },

    _createNewItem : function(model) {
      var item = new this.itemClass({ model : model });
      this.cache.set(model, item);
      this.child("child" + item.cid, item);
      return item;
    },

    render : function() {
      this._onReset();
      return this;
    }

  }, {

    finalize : function(name, listClass, views) {
      listClass.prototype.getItemClass = function() {
        // TODO blow up if can't find class
        return views[this.itemClassName];
      };
    }

  });

  return List;


})();
  var Item = (function() {

  var Base = Backdraft.plugin("Base");

  var Item = Base.View.extend({

    closeItem : function() {
      this.model.collection.remove(this.model);
    }

  }, {

    finalize : function(name, listClass, views) {
    }

  });

  return Item;

})();

  plugin.initializer(function(app) {

    app.view.listing = function(name, properties) {
      app.Views[name] = List.extend(properties);
      List.finalize(name, app.Views[name], app.Views);
    };

    app.view.listing.item = function(name, properties) {
      app.Views[name] = Item.extend(properties);
      Item.finalize(name, app.Views[name], app.Views);
    }
  });

});

  window.Backdraft = Backdraft;

})(jQuery);