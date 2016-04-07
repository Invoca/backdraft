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
Backdraft.Utils.toCSSClass = function(input) {
  var cssClass = /[^a-zA-Z_0-9\-]/g;
  return input.replace(cssClass, "-").toLowerCase();
};

// create a data tables column CSS class name based on input
Backdraft.Utils.toColumnCSSClass = function(input) {
  return "column-" + Backdraft.Utils.toCSSClass(input);
};

// extract the column CSS class from a list of classes, returns undefined if not found
Backdraft.Utils.extractColumnCSSClass = function(classNames) {
  var matches = classNames.match(/(?:^|\s)column-(?:[^\s]+)/);
  if (matches && matches[0]) {
    return matches[0].trim();
  } else {
    return undefined;
  }
}


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
    this.columnIndexById = new Backbone.Model();
    this.columnConfigById = new Backbone.Model();
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

  _getUrlFilterParams: function() {
    var urlParamString = window.location.href.split("?")[1];
    if (urlParamString && $.deparam(urlParamString) && ($.deparam(urlParamString).filter_json || $.deparam(urlParamString).ext_filter_json) ) {
      return JSON.parse($.deparam(urlParamString).filter_json || $.deparam(urlParamString).ext_filter_json);
    }
    else {
      return []
    }
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
    this.columnsConfig = this._addAttrsToColumnsWhenMissing(this.columnsConfig);

    // make the bulk column the first one if present
    this.columnsConfig = _.sortBy(this.columnsConfig, function (columnConfig) {
      return !columnConfig.bulk;
    });

    this._getUrlFilterParams().forEach(function(element, index, array){
      var columnConfigIndex = _.findIndex(this.columnsConfig, {attr: element.attr});
      if (columnConfigIndex >= 0) {
        this.columnsConfig[columnConfigIndex].filter[element.comparison] = element.value;
      }
    }.bind(this));

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

      // column index can be provided as the column id, so convert to index
      if (_.isString(columnIndex)) {
        columnIndex = this.columnIndexById.get(columnIndex);
      }
      return [ columnIndex, direction ];
    }, this);
  },

  _computeColumnLookups: function() {
    this.columnIndexById.clear();
    this.columnConfigById.clear();
    _.each(this.columnsConfig, function(col, index) {
      if (col.id) {
        this.columnIndexById.set(col.id, index);
        this.columnConfigById.set(col.id, col);
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
  },

  _addAttrsToColumnsWhenMissing: function(columnsConfig) {
    _.each(columnsConfig, function(columnConfig) {
      if (columnConfig.attr || columnConfig.title) {
        columnConfig.id = columnConfig.attr || Backdraft.Utils.toCSSClass(columnConfig.title);
      }
    });

    return columnsConfig;
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
      if (config.id) {
        prefs[config.id] = config.visible;
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

  columnConfigForId: function(id) {
    return this._configGenerator.columnConfigById.get(id);
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

  _applyVisibilitiesToDataTable: function(columnIdStateMap) {
    _.each(columnIdStateMap, function(state, id) {
      // last argument of false signifies not to redraw the table
      this.table.dataTable.fnSetColumnVis(this._configGenerator.columnIndexById.get(id), state, false);
    }, this);
  },

  _visibilitySummary: function() {
    var summary = { visible: [], hidden: [] };
    _.each(this.visibility.attributes, function(state, id) {
      if (state) summary.visible.push(id);
      else       summary.hidden.push(id);
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
    filterMenuClass: "",

    menuTemplate: _.template(''), // to be overridden by subclasses
    parentMenuTemplate: _.template('\
      <div class="filterMenu <%= filterMenuClass %>">\
        <%= menuTemplate %>\
        <button class="btn btn-sm btn-filter" name="button" type="submit" title="">Apply</button>\
        <button class="btn btn-primary btn-sm btn-clear pull-right" name="button" type="submit" title="">Clear</button>\
      </div>\
      ', null, DEFAULT_JST_DELIMS),

    errorTemplate: _.template('\
      <span class="text-danger error-text">\
        <%= errorCopy %>\
      </span>\
    ', null, DEFAULT_JST_DELIMS),

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.parentView = options.parentView;
      this.enabled = true;
    },

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange",
      "change select": "_onSelectChange"
    },

    render: function () {
      this.beforeRender();

      this.$el.html(this.parentMenuTemplate({
        filterMenuClass: this.filterMenuClass,
        menuTemplate: this.menuTemplate({
          filter: this.filter,
          attr: this.attr,
          title: this.title,
          parentView: this.parentView
        })
      }));

      this.afterRender();

      // Bind button clicks
      this.$('.btn-filter').click(_.bind(this.parentView._onFilterClick, this.parentView));
      this.$('.btn-clear').click(_.bind(this.parentView._onClearClick, this.parentView));

      // Bind "enter" key
      this.$('.filterMenu').keyup(_.bind(function(event) {
        var key = event.keyCode || event.which;
        if (key === 13) {
          this.parentView._onFilterClick.call(this.parentView);
        }
      }, this));

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
    },

    _onSelectChange: function (event) {
      // to be optionally implemented by subclasses
    },

    _updateFilterUrlParams: function() {
      // get url parameters into an array
      var params=[];
      // if there are already parameters there, get them
      var urlArray = window.location.href.split("?");
      if (urlArray[1]) {
        params = $.deparam(urlArray[1]);
      }
      // get the filter settings
      var filteringSettings = this.parent.table._getFilteringSettings();

      // if there are active filters, put them in the filter_json param
      if (JSON.parse(filteringSettings).length>0) {
        params.filter_json = filteringSettings;
      }
      // otherwise delete the filter_json param to keep a clean uri
      else {
        delete params.filter_json;
      }
      // Delete ext_filter_json from the url, we're deprecating it
      delete params.ext_filter_json;

      // if history is supported, add it to the url
      if (history.replaceState) {
        var state = { params: params };
        var url =  urlArray[0] + "?" + jQuery.param(params);
        history.replaceState(state, window.document.title, url);
      }
    },

    disableFilter: function(errorMessage) {
      if (!this.enabled) return;
      this.$('.filterMenu').prepend(this.errorTemplate({ errorCopy: errorMessage }));
      this.$('.btn-filter').prop("disabled", true);
      this.enabled = false;
    },

    enableFilter: function() {
      if (this.enabled) return;
      this.$('.error-text').remove();
      this.$('.btn-filter').prop("disabled", false);
      this.enabled = true;
    }
  });

  var StringFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-string",

    menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <div class="icon-addon addon-sm">\
        <input class="filter-string form-control input-sm" type="text" name="filter-string" />\
        <label for="filter-string" class="glyphicon glyphicon-search"></label>\
      </div>\
      ', null, DEFAULT_JST_DELIMS),

      afterRender: function() {
        var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
        // if there are filters in url, enable in UI
        if (filterArray.length > 0) {
          // find the filters that match this filter instance
          var matches = _.where(filterArray, {type: "string", attr: this.attr});
          // if there are filter params for this filter, add them to the markup
          if (matches[0]) {
            this.$el.find("input.filter-string").val(matches[0][matches[0].comparison]);
            this.parentView._toggleIcon(true);
          }
        }
      },

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    },

    clear: function() {
      this.$("input[type=text]").val("").trigger("change");
    }
  });

  var NumericFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-numeric",

    menuTemplate: _.template('\
      <div class="filter-text">Show items with value that:</div> \
      <select class="filter-type form-control" data-filter-id="first-filter" data-previous-value="gt">\
        <option selected value="gt">is greater than</option> \
        <option value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="first-filter" class="filter-value form-control" type="text" data-filter-type="gt" /> \
      <div class="filter-text">and</div> \
      <select class="filter-type form-control" data-filter-id="second-filter" data-previous-value="lt">\
        <option value="gt">is greater than</option> \
        <option selected value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="second-filter" class="filter-value form-control" type="text" data-filter-type="lt" /> \
    ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      event.stopImmediatePropagation();
      var filterType = event.target.getAttribute('data-filter-type'),
          filterValue = event.target.value;
      if (filterValue === "") {
        this.filter[filterType] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[filterType] = filterValue;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    },

    _onSelectChange: function (event) {
      event.stopImmediatePropagation();
      var target = $(event.target),
          filterElementId = target.data('filter-id'),
          previousFilterType = target.data('previous-value'),
          filterType = target.val();
      this.filter[filterType] = this.filter[previousFilterType];
      delete this.filter[previousFilterType];
      target.attr('data-previous-value', filterType);
      this.$('#' + filterElementId).attr('data-filter-type', filterType).trigger("change");
      this._updateFilterUrlParams();
    },

    afterRender: function() {
      // populate filter fields
      var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in the url...
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        var matches = _.where(filterArray, {type: "numeric", attr: this.attr});
        // if there are url params for this filter...
        if (matches[0]) {
          // change the comparison type on the select dropdown
          this.$el.find("[data-filter-id=first-filter]").val(matches[0].comparison);
          // change the value of the input field
          this.$el.find("input#first-filter").val(matches[0].value).attr("data-filter-type", matches[0].comparison);

          this.parentView._toggleIcon(true);
        }
        if (matches[1]) {
          // change the comparison type on the second select dropdown
          this.$el.find("[data-filter-id=second-filter]").val(matches[1].comparison);
          // change the value of the input second field
          this.$el.find("input#second-filter").val(matches[1].value).attr("data-filter-type", matches[1].comparison);

          this.parentView._toggleIcon(true);
        }
      }
    },

    clear: function() {
      this.$("input[type=text]").val("").trigger("change");
      this.$("select[data-filter-id=first-filter]").val("gt").trigger("change");
      this.$("select[data-filter-id=second-filter]").val("lt").trigger("change");
    }
  });

  var ListFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-list",

    menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <a class="select-all" href="javascript:;">Select all</a>\
      <ul>\
        <% _.each(filter.options, function(element, index) { %>\
          <li>\
            <label>\
              <input class="list list-item-input" type="checkbox" name="<%= attr %>" value="<%- element %>" /> \
              <%= element %>\
            </label>\
          </li>\
        <% }) %>\
      </ul>\
      ', null, DEFAULT_JST_DELIMS),

    afterRender: function () {
      var filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in the url...
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        var matches = _.where(filterArray, {type: "list", attr: this.attr});

        // if there are url params for this filter...
        if (matches[0]) {
          // go through each of those list values
          matches[0].value.forEach( function(element, index, array) {
            // check it
            this.$el.find('input[value="'+element+'"]').prop("checked", true);
          }.bind(this));
          // make the button show
          this.parentView._toggleIcon(true);
        }
      }

      var listClass;

      if (this.filter.options.length > 30) {
        listClass = "triple";
      } else if (this.filter.options.length > 15) {
        listClass = "double";
      } else {
        listClass = "single";
      }

      this.$("ul").addClass(listClass);
      this.$(".select-all").click(_.bind(this._selectAll, this));
    },

    _selectAll: function(event) {
      this.$('li input:checkbox:not(:checked)').each(_.bind(function(i, el) {
        this.$(el).click();
      }, this));
    },

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
      this._updateFilterUrlParams();
    },

    clear: function() {
      this.$("input[type=checkbox]").attr("checked", false).trigger("change");
    }
  });

  var DataTableFilter = Base.View.extend({
    template: _.template('\
        <div class="toggle-filter-button btn-popover-menu" data-toggle="dropdown">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
    },

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";

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
          break;
      }

      // add as a child (backdraft thing just to keep bookkeeping on subviews)
      this.child("filter-menu", filterMenu);
    },

    render: function () {
      this.$el.html(this.template({
        filterButtonClass: this.filterButtonClass
      }));

      this.$('.toggle-filter-button').popoverMenu({
        content: this.child("filter-menu").render().$el,
        placement: function(popover, trigger) {
          // We can't know the width without rendering to DOM.
          // We can't render to DOM without knowing the width.
          // Thus is life.
          var popoverWidth = 250;

          var triggerLeftPosition = trigger.getBoundingClientRect().left;
          var windowWidth = window.innerWidth;

          if ((triggerLeftPosition + popoverWidth) > windowWidth) {
            return 'left auto';
          }

          return 'bottom';
        }
      });

      return this;
    },

    _toggleIcon: function (enabled) {
      var icon = $(".toggle-filter-button > span", this.$el);
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
    },

    _onToggleClick: function (event) {
      // close popoverMenus except for this one
      $(".toggle-filter-button").not(event.currentTarget).popoverMenu('hide');
      event.stopImmediatePropagation();
    },

    _onFilterClick: function () {
      $("input[type=text]", this.head).trigger("change");
      // Update ajaxsource on datatable
      this._updateAjaxSource();
      this.table.dataTable._fnAjaxUpdate();
      this.$(".toggle-filter-button").popoverMenu('hide');
    },

    _onClearClick: function () {
      this.child("filter-menu").clear();
      this._updateAjaxSource();
      this.table.dataTable._fnAjaxUpdate();
      this.$(".toggle-filter-button").popoverMenu('hide');
    },

    _updateAjaxSource: function() {
      // get ajax url
      var ajaxURL = this.parent.dataTable.fnSettings().sAjaxSource;
      // get the endpoint of ajax url
      var splitUrl = ajaxURL.split("?");
      var endpoint = splitUrl[0];

      // Early exit if no params
      if (!splitUrl[1]) {
        return;
      }

      // get parameters of ajax url
      var params = $.deparam(splitUrl[1]);

      // make ext_filter_json param the same as the current url, now with new filters
      params.ext_filter_json = JSON.stringify(this.table._columnManager._configGenerator._getUrlFilterParams());

      // Build new url with old endpoint but new params
      var newURL = endpoint + "?"+ $.param(params);

      // Update datatable ajax source
      this.parent.dataTable.fnSettings().sAjaxSource = newURL;
    },

    disableFilter: function(errorMessage) {
      this.child("filter-menu").disableFilter(errorMessage);
    },

    enableFilter: function() {
      this.child("filter-menu").enableFilter();
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
    BULK_COLUMN_HEADER_CHECKBOX_SELECTOR : "th:first.bulk :checkbox",
    BULK_COLUMN_CHECKBOXES_SELECTOR : "td:first-child.bulk :checkbox",
    ROWS_SELECTOR: "tbody tr",
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
      this._enableRowHighlight();
      this.paginate && this._initPaginationHandling();
      this._triggerChangeSelection();
      this.trigger("render");
      return this;
    },

    renderColumn: function(id) {
      var config = this._columnManager.columnConfigForId(id);
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

    columnRequired: function(state, id) {
      if (!state && this._columnManager.columnConfigForId(id).required) {
        throw new Error("can not disable visibility when column is required");
      }
    },

    columnVisibility: function(attr, state) {
      if (arguments.length === 1) {
        // getter
        return this._columnManager.visibility.get(attr);
      } else {
        this.columnRequired(state, attr);
        this._columnManager.visibility.set(attr, state);
        state && this.renderColumn(attr);
      }
    },

    // takes a hash of { columnAttr: columnState, ... }
    setColumnVisibilities: function(columns) {
      _.each(columns, this.columnRequired, this);
      this._columnManager.visibility.set(columns);
      _.each(columns, function(state, attr) {
        state && this.renderColumn(attr);
      }, this);
    },

    restoreColumnVisibility: function() {
      _.each(this.columnsConfig(), function(column) {
        if (column.id) {
          this.columnVisibility(column.id, column.visible);
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

    disableFilters: function(errorMessage) {
      var columns = this.columnsConfig();
      for (var c in columns) {
        if (!columns[c].filter) continue;
        this.child("filter-" + columns[c].id).disableFilter(errorMessage);
      }
    },

    enableFilters: function() {
      var columns = this.columnsConfig();
      for (var c in columns) {
        if (!columns[c].filter) continue;
        this.child("filter-" + columns[c].id).enableFilter();
      }
    },

    // Private APIs

    _enableReorderableColumns: function() {
      var self = this;
      self._colReorder = new $.fn.dataTable.ColReorder(this.dataTable, {
        fnReorderCallback: function(fromIndex, toIndex) {
          // notify that columns have been externally rearranged
          self._columnManager.columnsSwapped(fromIndex, toIndex);
          // pass event up
          self._onColumnReorder();
        },
        bAddFixed: false,
        bResizeTableWrapper: false,
        allowHeaderDoubleClick: false,
        allowResize: self.resizableColumns,
        // iFixedColumns configures how many columns should be unmovable starting from left
        // if the first column is the bulk column we make it unmovable
        iFixedColumns: this.$el.find(this.BULK_COLUMN_HEADER_CHECKBOX_SELECTOR).length
      });
    },

    // Changes or resets the column order.
    // When called with no args, returns the current order.
    // Call with { reset : true } to have it restore column order to initial configuration
    // Provide array of indexes as first argument to have it reordered by that
    _changeColumnOrder: function(order) {
      var columnsOrig = _.clone(this.dataTable.fnSettings().aoColumns);
      if (_.isArray(order)) {
        this._colReorder.fnOrder(order);
      } else if (_.has(order, 'reset') && order.reset) {
        this._colReorder.fnReset();
      } else {
        return this._colReorder.fnOrder();
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
        resizableColumns: false,
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
      this._setupSelect2PaginationAttributes();
      this._installSortInterceptors();
      this.filteringEnabled && this._setupFiltering();
      this.reorderableColumns && this._enableReorderableColumns();
      this._columnManager.on("change:visibility", this._onColumnVisibilityChange);
      this._columnManager.applyVisibilityPreferences();
      if (this.collection.length) this._onReset(this.collection);
      // if resizeable, add resizeable class
      if (this._colReorder && this._colReorder.s.allowResize) {
        this.$("table").addClass("dataTable-resizeableColumns")
      }
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
      var bulkCheckbox = this.$el.find(this.BULK_COLUMN_HEADER_CHECKBOX_SELECTOR);
      if (!bulkCheckbox.length) return;
      this.bulkCheckbox = bulkCheckbox;
      this.bulkCheckbox.click(this._onBulkHeaderClick);
      this.dataTable.on("click", this.BULK_COLUMN_CHECKBOXES_SELECTOR, this._onBulkRowClick);
      this.dataTable.on("filter", this._bulkCheckboxAdjust);
    },

    _enableRowHighlight: function() {
      this.dataTable.on("click", this.ROWS_SELECTOR, this._onRowHighlightClick);
    },

    _onRowHighlightClick: function(event) {
     var el = $(event.target).closest("tr"),
         currentState = el.hasClass("highlighted");
     $(event.target).closest("tbody").find('tr').toggleClass('highlighted',false);
     el.toggleClass("highlighted", !currentState);
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
        fnDrawCallback : this._onDraw,
        oLanguage: {
          sEmptyTable: this.emptyText
        }
      };
    },

    _triggerChangeSelection: function(extraData) {
      var data = _.extend(extraData || {}, { count : this.selectionManager.count() });
      this.trigger("change:selected", data);
    },

    _setupSelect2PaginationAttributes: function () {
      this.$('select').
          attr('data-plugin', 'select2').
          css('width', '5em');
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
        // here we use the CSS in the header to get the column config by attr
        // there isn't a better way to do this currently
        var col;
        var columnClassName = Backdraft.Utils.extractColumnCSSClass(this.className);
        if (columnClassName) {
          cg.columnsConfig.forEach(function(currentColConfig){
            if (currentColConfig.id && Backdraft.Utils.toColumnCSSClass(currentColConfig.id) === columnClassName) {
              col = currentColConfig;
            }
          })
        }
        else {
          // TODO: FAIL!!!
        }

        if (col) {
          // We only make the filter controls if there's a filter element in the column manager
          if (col.filter) {
            table.child("filter-"+col.id, new DataTableFilter({
              column: col,
              table: table,
              head: this,
              className: "dropdown DataTables_filter_wrapper"
            }));
            $(this).append(table.child("filter-"+col.id).render().$el);
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
      event.stopPropagation();
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
      this.page(this._currentPageIndex());
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
      this._fetchCSV(sUrl);
    },

    _fetchCSV : function (sUrl) {
      if (this.serverSideFiltering) {
        var filterJson = {};
        filterJson.name = "ext_filter_json";
        filterJson.value = this._getFilteringSettings();
        this._goToWindowLocation(sUrl + "&backdraft_request=1&ext_filter_json=" + encodeURIComponent(filterJson.value));
      }
      else {
        throw new Error("serverSideFiltering is expected to be enabled when _fetchCSV is called");
      }
    },

    _goToWindowLocation : function(sUrl) {
      if (sUrl) {
        window.location = sUrl;
      }
      else {
        throw new Error("sUrl must be defined when _goToWindowLocation is called");
      }
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
      return $.extend(true, config, {
        bProcessing : true,
        bServerSide : true,
        sAjaxSource : _.result(this.collection, "url"),
        fnServerData : this._fetchServerData,
        fnServerParams : this._addServerParams,
        fnDrawCallback : this._onDraw,
        oLanguage: {
          sProcessing: this.processingText
        }
      });
    },

    _dataTableCreate : function() {
      //try {
        ServerSideDataTable.__super__._dataTableCreate.apply(this, arguments);
      //} catch(ex) {
      //  throw new Error("Unable to create ServerSide dataTable. Does your layout template have the 'r' setting for showing the processing status? Exception: " + ex.message);
      //}

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
    },

    _currentPageIndex : function() {
      if (this.dataTable.fnSettings()._iDisplayLength === 0) {
        return 0;
      } else {
        return this.dataTable.fnSettings()._iDisplayStart / this.dataTable.fnSettings()._iDisplayLength;
      }
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

    /*
 * File:        ColReorderWithResize-1.1.0-dev2.js
 *
 * Based on (with minor changes):
 * https://github.com/jhubble/ColReorderWithResize/blob/0aebd15b89debe9d52efe5c6b29c07703c025e3d/media/js/ColReorderWithResize.js
 *
 * Version:     1.1.0-dev2 (based on commit 2a6de4e884 done on Feb 22, 2013)
 * CVS:         $Id$
 * Description: Allow columns to be reordered in a DataTable
 * Author:      Allan Jardine (www.sprymedia.co.uk)
 * Created:     Wed Sep 15 18:23:29 BST 2010
 * Modified:    2013 feb 2013 by nlz242
 * Language:    Javascript
 * License:     GPL v2 or BSD 3 point style
 * Project:     DataTables
 * Contact:     www.sprymedia.co.uk/contact
 *
 * Copyright 2010-2013 Allan Jardine, all rights reserved.
 *
 * This source file is free software, under either the GPL v2 license or a
 * BSD style license, available at:
 *   http://datatables.net/license_gpl2
 *   http://datatables.net/license_bsd
 *
 * Minor bug fixes by Jeremy Hubble @jeremyhubble
 */


(function ($, window, document) {


  /**
   * Switch the key value pairing of an index array to be value key (i.e. the old value is now the
   * key). For example consider [ 2, 0, 1 ] this would be returned as [ 1, 2, 0 ].
   *  @method  fnInvertKeyValues
   *  @param   array aIn Array to switch around
   *  @returns array
   */
  function fnInvertKeyValues(aIn) {
    var aRet = [];
    for (var i = 0, iLen = aIn.length; i < iLen; i++) {
      aRet[aIn[i]] = i;
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
  function fnArraySwitch(aArray, iFrom, iTo) {
    var mStore = aArray.splice(iFrom, 1)[0];
    aArray.splice(iTo, 0, mStore);
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
  function fnDomSwitch(nParent, iFrom, iTo) {
    var anTags = [];
    for (var i = 0, iLen = nParent.childNodes.length; i < iLen; i++) {
      if (nParent.childNodes[i].nodeType == 1) {
        anTags.push(nParent.childNodes[i]);
      }
    }
    var nStore = anTags[iFrom];

    if (iTo !== null) {
      nParent.insertBefore(nStore, anTags[iTo]);
    }
    else {
      nParent.appendChild(nStore);
    }
  }



  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * DataTables plug-in API functions
   *
   * This are required by ColReorder in order to perform the tasks required, and also keep this
   * code portable, to be used for other column reordering projects with DataTables, if needed.
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


  /**
   * Plug-in for DataTables which will reorder the internal column structure by taking the column
   * from one position (iFrom) and insert it into a given point (iTo).
   *  @method  $.fn.dataTableExt.oApi.fnColReorder
   *  @param   object oSettings DataTables settings object - automatically added by DataTables!
   *  @param   int iFrom Take the column to be repositioned from this point
   *  @param   int iTo and insert it into this point
   *  @returns void
   */
  $.fn.dataTableExt.oApi.fnColReorder = function (oSettings, iFrom, iTo) {
    var i, iLen, j, jLen, iCols = oSettings.aoColumns.length, nTrs, oCol;

    /* Sanity check in the input */
    if (iFrom == iTo) {
      /* Pointless reorder */
      return;
    }

    if (iFrom < 0 || iFrom >= iCols) {
      this.oApi._fnLog(oSettings, 1, "ColReorder 'from' index is out of bounds: " + iFrom);
      return;
    }

    if (iTo < 0 || iTo >= iCols) {
      this.oApi._fnLog(oSettings, 1, "ColReorder 'to' index is out of bounds: " + iTo);
      return;
    }

    /*
     * Calculate the new column array index, so we have a mapping between the old and new
     */
    var aiMapping = [];
    for (i = 0, iLen = iCols; i < iLen; i++) {
      aiMapping[i] = i;
    }
    fnArraySwitch(aiMapping, iFrom, iTo);
    var aiInvertMapping = fnInvertKeyValues(aiMapping);


    /*
     * Convert all internal indexing to the new column order indexes
     */
    /* Sorting */
    for (i = 0, iLen = oSettings.aaSorting.length; i < iLen; i++) {
      oSettings.aaSorting[i][0] = aiInvertMapping[oSettings.aaSorting[i][0]];
    }

    /* Fixed sorting */
    if (oSettings.aaSortingFixed !== null) {
      for (i = 0, iLen = oSettings.aaSortingFixed.length; i < iLen; i++) {
        oSettings.aaSortingFixed[i][0] = aiInvertMapping[oSettings.aaSortingFixed[i][0]];
      }
    }

    /* Data column sorting (the column which the sort for a given column should take place on) */
    for (i = 0, iLen = iCols; i < iLen; i++) {
      oCol = oSettings.aoColumns[i];
      for (j = 0, jLen = oCol.aDataSort.length; j < jLen; j++) {
        oCol.aDataSort[j] = aiInvertMapping[oCol.aDataSort[j]];
      }
    }


    /*
     * Move the DOM elements
     */
    if (oSettings.aoColumns[iFrom].bVisible) {
      /* Calculate the current visible index and the point to insert the node before. The insert
       * before needs to take into account that there might not be an element to insert before,
       * in which case it will be null, and an appendChild should be used
       */
      var iVisibleIndex = this.oApi._fnColumnIndexToVisible(oSettings, iFrom);
      var iInsertBeforeIndex = null;

      i = iTo < iFrom ? iTo : iTo + 1;
      while (iInsertBeforeIndex === null && i < iCols) {
        iInsertBeforeIndex = this.oApi._fnColumnIndexToVisible(oSettings, i);
        i++;
      }

      /* Header */
      nTrs = oSettings.nTHead.getElementsByTagName('tr');
      for (i = 0, iLen = nTrs.length; i < iLen; i++) {
        fnDomSwitch(nTrs[i], iVisibleIndex, iInsertBeforeIndex);
      }

      /* Footer */
      if (oSettings.nTFoot !== null) {
        nTrs = oSettings.nTFoot.getElementsByTagName('tr');
        for (i = 0, iLen = nTrs.length; i < iLen; i++) {
          fnDomSwitch(nTrs[i], iVisibleIndex, iInsertBeforeIndex);
        }
      }

      /* Body */
      for (i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
        if (oSettings.aoData[i].nTr !== null) {
          fnDomSwitch(oSettings.aoData[i].nTr, iVisibleIndex, iInsertBeforeIndex);
        }
      }
    }


    /*
     * Move the internal array elements
     */
    /* Columns */
    fnArraySwitch(oSettings.aoColumns, iFrom, iTo);

    /* Search columns */
    fnArraySwitch(oSettings.aoPreSearchCols, iFrom, iTo);

    /* Array array - internal data anodes cache */
    for (i = 0, iLen = oSettings.aoData.length; i < iLen; i++) {
      fnArraySwitch(oSettings.aoData[i]._anHidden, iFrom, iTo);
    }

    /* Reposition the header elements in the header layout array */
    for (i = 0, iLen = oSettings.aoHeader.length; i < iLen; i++) {
      fnArraySwitch(oSettings.aoHeader[i], iFrom, iTo);
    }

    if (oSettings.aoFooter !== null) {
      for (i = 0, iLen = oSettings.aoFooter.length; i < iLen; i++) {
        fnArraySwitch(oSettings.aoFooter[i], iFrom, iTo);
      }
    }


    /*
     * Update DataTables' event handlers
     */

    /* Sort listener */
    /** NOTE: Non Default behavior. Plugin has been modified. DO NOT CHANGE */
    for (i = 0, iLen = iCols; i < iLen; i++) {
      $(oSettings.aoColumns[i].nTh).children(".DataTables_sort_wrapper").off('click');
      this.oApi._fnSortAttachListener(oSettings, $(oSettings.aoColumns[i].nTh).children(".DataTables_sort_wrapper"), i);
    }


    /* Fire an event so other plug-ins can update */
    $(oSettings.oInstance).trigger('column-reorder', [oSettings, {
      "iFrom": iFrom,
      "iTo": iTo,
      "aiInvertMapping": aiInvertMapping
    }]);

    if (typeof oSettings.oInstance._oPluginFixedHeader != 'undefined') {
      oSettings.oInstance._oPluginFixedHeader.fnUpdate();
    }
  };




  /**
   * ColReorder provides column visibility control for DataTables
   * @class ColReorder
   * @constructor
   * @param {object} dt DataTables settings object
   * @param {object} opts ColReorder options
   */
  var ColReorder = function (dt, opts) {
    var oDTSettings;

    // @todo - This should really be a static method offered by DataTables
    if (dt.fnSettings) {
      // DataTables object, convert to the settings object
      oDTSettings = dt.fnSettings();
    }
    else if (typeof dt === 'string') {
      // jQuery selector
      if ($.fn.dataTable.fnIsDataTable($(dt)[0])) {
        oDTSettings = $(dt).eq(0).dataTable().fnSettings();
      }
    }
    else if (dt.nodeName && dt.nodeName.toLowerCase() === 'table') {
      // Table node
      if ($.fn.dataTable.fnIsDataTable(dt.nodeName)) {
        oDTSettings = $(dt.nodeName).dataTable().fnSettings();
      }
    }
    else if (dt instanceof jQuery) {
      // jQuery object
      if ($.fn.dataTable.fnIsDataTable(dt[0])) {
        oDTSettings = dt.eq(0).dataTable().fnSettings();
      }
    }
    else {
      // DataTables settings object
      oDTSettings = dt;
    }

    if (this instanceof ColReorder === false) {
      // Get a ColReorder instance - effectively a static method
      for (var i = 0, iLen = ColReorder.aoInstances.length; i < iLen; i++) {
        if (ColReorder.aoInstances[i].s.dt == oDTSettings) {
          return ColReorder.aoInstances[i];
        }
      }

      return null;
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
      "init": $.extend(true, {}, ColReorder.defaults, opts),

      /**
       * Allow Reorder functionnality
       *  @property allowReorder
       *  @type     boolean
       *  @default  true
       */
      "allowReorder": true,

      /**
       * Expand or collapse columns based on header double clicks
       *  @property allowHeaderDoubleClick
       *  @type     boolean
       *  @default  true
       */
      "allowHeaderDoubleClick": true,

      /**
       * Expand or collapse columns based on header double clicks
       * If set to true will use the default menu
       * - If set to false, no context menu will be used
       * - If set to true, the default context menu will be used
       * - If given a function, that function will be called
       *  @property headerContextMenu
       *  @type     boolean/function
       *  @default  true
       */
      "headerContextMenu": true,

      /**
       * Allow Resize functionnality
       *  @property allowResize
       *  @type     boolean
       *  @default  true
       */
      "allowResize": true,

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
      "aoTargets": [],

      /**
       * Minimum width for columns (in pixels)
       * Default is 10. If set to 0, columns can be resized to nothingness.
       * @property minResizeWidth
       * @type     integer
       * @default  10
       */
      "minResizeWidth": 10,

      /**
       * Resize the table when columns are resized
       * @property bResizeTable
       * @type     boolean
       * @default  true
       */
      "bResizeTable": true,

      /**
       * Resize the table when columns are resized
       * @property bResizeTable
       * @type     boolean
       * @default  false
       */
      "bResizeTableWrapper": true,

      /**
       * Callback called after each time the table is resized
       * This could be multiple times on one mouse move.
       * useful for resizing a containing element.
       * Passed the table element, new size, and the size change
       * @property fnResizeTableCallback
       * @type     function
       * @default  function(table, newSize, sizeChange) {}
       */
      "fnResizeTableCallback": function(){},

      /**
       * Add table-layout:fixed css to the table
       * This header is required for column resize to function properly
       * However, in some cases, you may want to do additional processing, and thus not set the header
       * (For example, you may want the headers to be layed out normally, and then fix the table
       *  after the headers are allocated their full space. In this case, you can manually add the css
       *  in fnHeaderCallback and set bAddFixed to false here)
       * @property bAddFixed
       * @type     boolean
       * @default  true
       */
      "bAddFixed": true
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
       * Resizing a column
       *  @property drag
       *  @type     element
       *  @default  null
       */
      "resize": null,

      /**
       * The insert cursor
       *  @property pointer
       *  @type     element
       *  @default  null
       */
      "pointer": null
    };

    this.table_size = -1;

    /* Constructor logic */
    this.s.dt = oDTSettings.oInstance.fnSettings();
    this._fnConstruct();

    /* Add destroy callback */
    oDTSettings.oApi._fnCallbackReg(oDTSettings, 'aoDestroyCallback', $.proxy(this._fnDestroy, this), 'ColReorder');

    /* Store the instance for later use */
    ColReorder.aoInstances.push(this);


    if (this.s.bResizeTableWrapper) {
      $(this.s.dt.nTableWrapper).width($(this.s.dt.nTable).width());

      // make sure the headers are the same width as the rest of table
      oDTSettings.aoDrawCallback.push({
        "fn": function ( oSettings ) {
          $(oSettings.nTableWrapper).width($(oSettings.nTable).width());
        },
        "sName": "Resize headers"
      });
    }

    // fix the width and add table layout fixed.
    if (this.s.bAddFixed) {
      // Set the table to minimum size so that it doesn't stretch too far
      $(this.s.dt.nTable).width("10px");
      $(this.s.dt.nTable).width($(this.s.dt.nTable).width()).css('table-layout','fixed');
    }
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
    "fnReset": function () {
      var a = [];
      for (var i = 0, iLen = this.s.dt.aoColumns.length; i < iLen; i++) {
        a.push(this.s.dt.aoColumns[i]._ColReorder_iOrigCol);
      }

      this._fnOrderColumns(a);

      return this;
    },

    /**
     * `Deprecated` - Get the current order of the columns, as an array.
     *  @return {array} Array of column identifiers
     *  @deprecated `fnOrder` should be used in preference to this method.
     *      `fnOrder` acts as a getter/setter.
     */
    "fnGetCurrentOrder": function () {
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
     */
    /**
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
    "fnOrder": function (set) {
      if (set === undefined) {
        var a = [];
        for (var i = 0, iLen = this.s.dt.aoColumns.length; i < iLen; i++) {
          a.push(this.s.dt.aoColumns[i]._ColReorder_iOrigCol);
        }
        return a;
      }

      this._fnOrderColumns(fnInvertKeyValues(set));

      return this;
    },

    /**
     * fnGetColumnSelectList - return html list of columns columns, with selected columns checked
     *  @return {string} Html string
     */
    fnGetColumnSelectList : function() {
      // TODO: This looks like it will be broken, need to investigate
      var tp,i;
      var availableFields = this.s.dt.aoColumns;
      var html ='<div class="selcol1">';
      var d2 = (availableFields.length-1) /2;
      for (i=0;i<availableFields.length;i++) {
        tp = "col"+(i%2);
        if (i > d2) {
          html += '</div><div class="selcol2">';
          d2 = 99999999;
        }
        var selected = availableFields[i].bVisible;
        var title = availableFields[i].sTitle;
        var mData = availableFields[i].mData;
        html += '<label class="'+tp+'">'+
          '<input name="columns" type="checkbox" checked="'+(selected ? "checked" : "")+'" value="'+mData+'">'+
          title + '</label>';
      }
      html  += "</div>";

      return html;
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
    "_fnConstruct": function () {
      var that = this;
      var iLen = this.s.dt.aoColumns.length;
      var i;

      /* Columns discounted from reordering - counting left to right */
      if (this.s.init.iFixedColumns) {
        this.s.fixed = this.s.init.iFixedColumns;
      }

      /* Columns discounted from reordering - counting right to left */
      this.s.fixedRight = this.s.init.iFixedColumnsRight ?
        this.s.init.iFixedColumnsRight :
        0;

      /* Drop callback initialisation option */
      if (this.s.init.fnReorderCallback) {
        this.s.dropCallback = this.s.init.fnReorderCallback;
      }

      /* Allow reorder */
      if (typeof this.s.init.allowReorder != 'undefined') {
        this.s.allowReorder = this.s.init.allowReorder;
      }

      /* Allow resize */
      if (typeof this.s.init.allowResize != 'undefined') {
        this.s.allowResize = this.s.init.allowResize;
      }

      /* Allow header double click */
      if (typeof this.s.init.allowHeaderDoubleClick != 'undefined') {
        this.s.allowHeaderDoubleClick = this.s.init.allowHeaderDoubleClick;
      }

      /* Allow header contextmenu */
      if (typeof this.s.init.headerContextMenu == 'function') {
        this.s.headerContextMenu = this.s.init.headerContextMenu;
      }
      else if (this.s.init.headerContextMenu) {
        this.s.headerContextMenu = this._fnDefaultContextMenu;
      }
      else {
        this.s.headerContextMenu = false;
      }

      if (typeof this.s.init.minResizeWidth != 'undefined') {
        this.s.minResizeWidth = this.s.init.minResizeWidth;
      }

      if (typeof this.s.init.bResizeTable != 'undefined') {
        this.s.bResizeTable = this.s.init.bResizeTable;
      }

      if (typeof this.s.init.bResizeTableWrapper != 'undefined') {
        this.s.bResizeTableWrapper = this.s.init.bResizeTableWrapper;
      }

      if (typeof this.s.init.bAddFixed != 'undefined') {
        this.s.bAddFixed = this.s.init.bAddFixed;
      }

      if (typeof this.s.init.fnResizeTableCallback == 'function') {
        this.s.fnResizeTableCallback = this.s.init.fnResizeTableCallback;
      }

      /* Add event handlers for the drag and drop, and also mark the original column order */
      for (i = 0; i < iLen; i++) {
        if (i > this.s.fixed - 1 && i < iLen - this.s.fixedRight) {
          this._fnMouseListener(i, this.s.dt.aoColumns[i].nTh);
        }

        /* Mark the original column order for later reference */
        this.s.dt.aoColumns[i]._ColReorder_iOrigCol = i;
      }

      /* State saving */
      this.s.dt.oApi._fnCallbackReg(this.s.dt, 'aoStateSaveParams', function (oS, oData) {
        that._fnStateSave.call(that, oData);
      }, "ColReorder_State");

      /* An initial column order has been specified */
      var aiOrder = null;
      if (this.s.init.aiOrder) {
        aiOrder = this.s.init.aiOrder.slice();
      }

      /* State loading, overrides the column order given */
      if (this.s.dt.oLoadedState && typeof this.s.dt.oLoadedState.ColReorder != 'undefined' &&
        this.s.dt.oLoadedState.ColReorder.length == this.s.dt.aoColumns.length) {
        aiOrder = this.s.dt.oLoadedState.ColReorder;
      }

      /* Load Column Sizes */
      var asSizes = null;
      if (this.s.dt.oLoadedState && typeof this.s.dt.oLoadedState.ColSizes != 'undefined' &&
        this.s.dt.oLoadedState.ColSizes.length == this.s.dt.aoColumns.length) {
        asSizes = this.s.dt.oLoadedState.ColSizes;
      }

      if (asSizes) {
        // Apply the sizes to the column sWidth settings
        for (i = 0, iLen = this.s.dt.aoColumns.length; i < iLen; i++)
          this.s.dt.aoColumns[i].sWidth = asSizes[i];
      }

      /* If we have an order and/or sizing to apply - do so */
      if (aiOrder || asSizes) {
        /* We might be called during or after the DataTables initialisation. If before, then we need
         * to wait until the draw is done, if after, then do what we need to do right away
         */
        if (!that.s.dt._bInitComplete) {
          var bDone = false;
          this.s.dt.aoDrawCallback.push({
            "fn": function () {
              if (!that.s.dt._bInitComplete && !bDone) {
                bDone = true;
                if (aiOrder) {
                  var resort = fnInvertKeyValues(aiOrder);
                  that._fnOrderColumns.call(that, resort);
                }
                if (asSizes)
                  that._fnResizeColumns.call(that);
              }
            },
            "sName": "ColReorder_Pre"
          });
        }
        else {
          if (aiOrder) {
            var resort = fnInvertKeyValues(aiOrder);
            that._fnOrderColumns.call(that, resort);
          }
          if (asSizes)
            that._fnResizeColumns.call(that);
        }
      }
    },

    /**
     * Default Context menu to display the column selectors
     *  @method  _fnDefaultContextMenu
     *  @param   Object e Event object of the contextmenu (right click) event
     *  @param   Object settings The datatables settings object
     *  @param   Object ColReorderObj The ColReorder object
     *  @returns void
     *  @private
     */
    "_fnDefaultContextMenu" : function(e,settings,thatObj) {
      var colSelects = thatObj.fnGetColumnSelectList();
      var myelm = $('<div></div>');
      myelm.append(colSelects);
      $("input",myelm).off("change").on("change", function(e) {
        var index = $('input',myelm).index($(this));
        var checked = $(this).is(":checked");
        settings.oInstance.fnSetColumnVis(index,checked,true);
      });

      if (jQuery.ui) {
        myelm.dialog({
          "position":[e.clientX,e.clientY],
          "title":"Select Columns",
          "modal":true,
          "autoOpen":true,
          "close":function(event,ui) {
            myelm.remove();
          }
        });
      }
      else {
        var overlay = $('<div class="overlayDiv"></div>').appendTo("body").css({"position":"fixed",top:0,left:0, width:"100%",height:"100%","z-index":5000});
        myelm.appendTo("body").css({position:"absolute", top:e.clientY-2, "background-color":"grey", left:e.clientX-2, "z-index":5005, "border":"1px solid black"});
        var timer = 0;
        myelm.mouseover(function(e) {
          if (timer) {
            clearTimeout(timer);
          }
        });

        myelm.mouseout(function(e) {
          if (timer) {
            clearTimeout(timer);
          }
          timer = setTimeout(
            function() {
              overlay.remove();
              myelm.remove();
            },200);
        });
      }

    },

    /**
     * Set the column sizes (widths) from an array
     *  @method  _fnResizeColumns
     *  @returns void
     *  @private
     */
    "_fnResizeColumns": function () {
      for (var i = 0, iLen = this.s.dt.aoColumns.length; i < iLen; i++) {
        if (this.s.dt.aoColumns[i].sWidth)
          this.s.dt.aoColumns[i].nTh.style.width = this.s.dt.aoColumns[i].sWidth;
      }

      /* Save the state */
      // this.s.dt.oInstance.oApi._fnSaveState(this.s.dt);
    },

    /**
     * Set the column order from an array
     *  @method  _fnOrderColumns
     *  @param   array a An array of integers which dictate the column order that should be applied
     *  @returns void
     *  @private
     */
    "_fnOrderColumns": function (a) {
      if (a.length != this.s.dt.aoColumns.length) {
        this.s.dt.oInstance.oApi._fnLog(this.s.dt, 1, "ColReorder - array reorder does not " +
          "match known number of columns. Skipping.");
        return;
      }

      for (var i = 0, iLen = a.length; i < iLen; i++) {
        var currIndex = $.inArray(i, a);
        if (i != currIndex) {
          /* Reorder our switching array */
          fnArraySwitch(a, currIndex, i);

          /* Do the column reorder in the table */
          this.s.dt.oInstance.fnColReorder(currIndex, i);
        }
      }

      /* When scrolling we need to recalculate the column sizes to allow for the shift */
      if (this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "") {
        this.s.dt.oInstance.fnAdjustColumnSizing();
      }

      /* Save the state */
      this.s.dt.oInstance.oApi._fnSaveState(this.s.dt);
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
    "_fnStateSave": function (oState) {
      var i, iLen, aCopy, iOrigColumn;
      var oSettings = this.s.dt;

      /* Sorting */
      for (i = 0; i < oState.aaSorting.length; i++) {
        oState.aaSorting[i][0] = oSettings.aoColumns[oState.aaSorting[i][0]]._ColReorder_iOrigCol;
      }

      var aSearchCopy = $.extend(true, [], oState.aoSearchCols);
      oState.ColReorder = [];
      oState.ColSizes = [];

      for (i = 0, iLen = oSettings.aoColumns.length; i < iLen; i++) {
        iOrigColumn = oSettings.aoColumns[i]._ColReorder_iOrigCol;

        /* Column filter */
        oState.aoSearchCols[iOrigColumn] = aSearchCopy[i];

        /* Visibility */
        oState.abVisCols[iOrigColumn] = oSettings.aoColumns[i].bVisible;

        /* Column reordering */
        oState.ColReorder.push(iOrigColumn);

        /* Column Sizes */
        oState.ColSizes[iOrigColumn] = oSettings.aoColumns[i].sWidth;
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
    "_fnMouseListener": function (i, nTh) {
      var that = this;

      var thead = $(nTh).closest('thead');
      // listen to mousemove event for resize
      if (this.s.allowResize) {
        //$(nTh).bind('mousemove.ColReorder', function (e) {
        thead.bind('mousemove.ColReorder', function (e) {
          var nTable = that.s.dt.nTable;
          if (that.dom.drag === null && that.dom.resize === null) {
            /* Store information about the mouse position */
            var nThTarget = e.target.nodeName == "TH" ? e.target : $(e.target).parents('TH')[0];
            var offset = $(nThTarget).offset();
            var nLength = $(nThTarget).innerWidth();

            /* are we on the col border (if so, resize col) */
            if (Math.abs(e.pageX - Math.round(offset.left + nLength)) <= 5) {
              $(nThTarget).css({ 'cursor': 'col-resize' });
              // catch gaps between cells
              //$(nTable).css({'cursor' : 'col-resize'});
              that.dom.resizeCol = "right";
            }
            else if ((e.pageX - offset.left) < 5) {
              $(nThTarget).css({'cursor' : 'col-resize'});
              //$(nTable).css({'cursor' : 'col-resize'});
              that.dom.resizeCol = "left";
            }
            else {
              $(nThTarget).css({ 'cursor': 'pointer' });
              //$(nTable).css({'cursor' : 'pointer'});
            }
          }
        });


      }

      $(nTh).on('mousedown.ColReorder', function (e) {
        e.preventDefault();
        that._fnMouseDown.call(that, e, nTh, i);
      });

      // Add doubleclick also
      // It is best to disable sorting if using double click
      if (this.s.allowHeaderDoubleClick) {
        $(nTh).on("dblclick.ColReorder", function(e) {
          e.preventDefault();
          that._fnDblClick.call(that, e, nTh, i);
        });
      }

      if (this.s.headerContextMenu) {
        $(nTh).off("contextmenu.ColReorder").on("contextmenu.ColReorder", function(e) {
          e.preventDefault();
          that.s.headerContextMenu.call(this,e,that.s.dt,that);
        });

      }
    },


    /**
     * Double click on a TH element in the table header
     *  @method  _fnMouseDown
     *  @param   event e Mouse event
     *  @param   element nTh TH element to be resized
     *  @returns void
     *  @private
     */
    "_fnDblClick": function (e, nTh, index) {
      var nTable = this.s.dt.nTable;
      var tableWidth = $(nTable).width();
      var aoColumns = this.s.dt.aoColumns;

      var realWidths = $.map($('th',$(this.s.dt.nThead)), function(l) {return $(l).width();});
      var nThWidth = $(nTh).width();
      var newWidth;
      var that = this;

      var tableResizeIt = function() {
        var newTableWidth = tableWidth + newWidth - nThWidth;

        $(nTable).width(newTableWidth);
        $(nTable).css('table-layout',"fixed");
        $(nTh).width(newWidth);

        aoColumns[index].sWidth = newWidth+"px";
        that.s.fnResizeTableCallback(nTable,newTableWidth,newTableWidth-tableWidth);
      };

      if ($(nTh).hasClass('maxwidth')) {
        var newHead = $(nTable).clone();
        $('tbody', newHead).remove();
        var newItem = $(nTh).clone();
        newItem.wrap("<tr />");
        newItem.wrap("<table />");
        $(nTable).css({'table-layout':"auto","width":"auto"});
        this.s.dt.oFeatures.bAutoWidth = true;
        // Lets try resizing to headers instead
        newWidth = this.s.minResizeWidth;
        $(nTh).removeClass('maxwidth');
      }

      else {
        $(nTable).css({'table-layout':"auto","width":"auto"});
        newWidth = $('th',nTable).eq(index).width();

        $(nTh).addClass("maxwidth");
        tableResizeIt();
      }



    },


    /**
     * Mouse down on a TH element in the table header
     *  @method  _fnMouseDown
     *  @param   event e Mouse event
     *  @param   element nTh TH element to be dragged
     *  @returns void
     *  @private
     */
    "_fnMouseDown": function (e, nTh, i) {
      var that = this;
      var target, offset, idx, nThNext, nThPrev;
      /* are we resizing a column ? */
      if ($(nTh).css('cursor') == 'col-resize') {
        // are we at the right or left?
        this.s.mouse.startX = e.pageX;
        this.s.tableWidth = $(nTh).closest("table").width();

        // If we are at the left end, we expand the previous column
        if (this.dom.resizeCol == "left") {
          nThPrev = $(nTh).prev();
          this.s.mouse.startWidth = $(nThPrev).outerWidth();
          this.s.mouse.resizeElem = $(nThPrev);
          nThNext = $(nTh).next();
          this.s.mouse.nextStartWidth = $(nTh).outerWidth();
          this.s.mouse.targetIndex = $('th', nTh.parentNode).index(nThPrev);
          this.s.mouse.fromIndex = this.s.dt.oInstance.oApi._fnVisibleToColumnIndex(this.s.dt, this.s.mouse.targetIndex);
        }

        // If we are at the right end of column, we expand the current column
        else {
          this.s.mouse.startWidth = $(nTh).outerWidth();
          this.s.mouse.resizeElem = $(nTh);
          nThNext = $(nTh).next();
          this.s.mouse.nextStartWidth = $(nThNext).outerWidth();
          this.s.mouse.targetIndex = $('th', nTh.parentNode).index(nTh);
          this.s.mouse.fromIndex = this.s.dt.oInstance.oApi._fnVisibleToColumnIndex(this.s.dt, this.s.mouse.targetIndex);
        }

        that.dom.resize = true;
        ////////////////////
        //Martin Marchetta
        //a. Disable column sorting so as to avoid issues when finishing column resizing
        target = $(e.target).closest('th, td');
        offset = target.offset();
        idx = $.inArray(target[0], $.map(this.s.dt.aoColumns, function (o) { return o.nTh; }));
        // store state so we don't tunr on sorting where we don't want it
        this.s.dt.aoColumns[idx]._oldbSortable = this.s.dt.aoColumns[idx].bSortable;
        this.s.dt.aoColumns[idx].bSortable = false;
        //b. Disable Autowidth feature (now the user is in charge of setting column width so keeping this enabled looses changes after operations)
        this.s.dt.oFeatures.bAutoWidth = false;
        ////////////////////
      }
      else if (this.s.allowReorder) {
        that.dom.resize = null;
        /* Store information about the mouse position */
        target = $(e.target).closest('th, td');
        offset = target.offset();
        idx = $.inArray(target[0], $.map(this.s.dt.aoColumns, function (o) { return o.nTh; }));

        if (idx === -1) {
          return;
        }

        this.s.mouse.startX = e.pageX;
        this.s.mouse.startY = e.pageY;
        this.s.mouse.offsetX = e.pageX - offset.left;
        this.s.mouse.offsetY = e.pageY - offset.top;
        this.s.mouse.target = target[0];
        this.s.mouse.targetIndex = idx;
        this.s.mouse.fromIndex = idx;

        this._fnRegions();
      }
      /* Add event handlers to the document */
      $(document).on('mousemove.ColReorder', function (e) {
        that._fnMouseMove.call(that, e, i);
      }).on('mouseup.ColReorder', function (e) {
        setTimeout(function () {
          that._fnMouseUp.call(that, e, i);
        }, 10);
      });
    },


    /**
     * Deal with a mouse move event while dragging a node
     *  @method  _fnMouseMove
     *  @param   event e Mouse event
     *  @returns void
     *  @private
     */
    "_fnMouseMove": function (e) {
      var that = this;
      ////////////////////
      //Martin Marchetta: Determine if ScrollX is enabled
      var scrollXEnabled;

      scrollXEnabled = this.s.dt.oInit.sScrollX === "" ? false : true;

      //Keep the current table's width (used in case sScrollX is enabled to resize the whole table, giving an Excel-like behavior)
      if (this.table_size < 0 && scrollXEnabled && $('div.dataTables_scrollHead', this.s.dt.nTableWrapper) !== undefined) {
        if ($('div.dataTables_scrollHead', this.s.dt.nTableWrapper).length > 0)
          this.table_size = $($('div.dataTables_scrollHead', this.s.dt.nTableWrapper)[0].childNodes[0].childNodes[0]).width();
      }
      ////////////////////

      /* are we resizing a column ? */
      if (this.dom.resize) {
        var nTh = this.s.mouse.resizeElem;
        var nThNext = $(nTh).next();
        var moveLength = e.pageX - this.s.mouse.startX;
        var newWidth = this.s.mouse.startWidth + moveLength;
        var newWidthNoScrollX = this.s.mouse.nextStartWidth - moveLength;
        var newTableWidth = this.table_size + moveLength;
        // set a min width of 10 - this would be good to configure
        if (newWidth < this.s.minResizeWidth) {
          newWidth = this.s.minResizeWidth;
          moveLength = newWidth - this.s.mouse.startWidth ;
        }
        if (moveLength !== 0 && !scrollXEnabled) {
          $(nThNext).width(newWidthNoScrollX);
          // browser fix
          $(nThNext).css('min-width',newWidthNoScrollX);
        }
        $(nTh).width(newWidth);
        //browser fix
        $(nTh).css('min-width',newWidth);

        //Martin Marchetta: Resize the header too (if sScrollX is enabled)
        if (scrollXEnabled && $('div.dataTables_scrollHead', this.s.dt.nTableWrapper).length) {
          if ($('div.dataTables_scrollHead', this.s.dt.nTableWrapper).length > 0)
            $($('div.dataTables_scrollHead', this.s.dt.nTableWrapper)[0].childNodes[0].childNodes[0]).width(newTableWidth);
            //browser fix
            $($('div.dataTables_scrollHead', this.s.dt.nTableWrapper)[0].childNodes[0].childNodes[0]).css('min-width',newTableWidth);
        }

        ////////////////////////
        //Martin Marchetta: Fixed col resizing when the scroller is enabled.
        var visibleColumnIndex;
        //First determine if this plugin is being used along with the smart scroller...
        if ($('div.dataTables_scrollBody').lenggthll) {
          //...if so, when resizing the header, also resize the table's body (when enabling the Scroller, the table's header and
          //body are split into different tables, so the column resizing doesn't work anymore)
          if ($('div.dataTables_scrollBody').length > 0) {
            //Since some columns might have been hidden, find the correct one to resize in the table's body
            var currentColumnIndex;
            visibleColumnIndex = -1;
            for (currentColumnIndex = -1; currentColumnIndex < this.s.dt.aoColumns.length - 1 && currentColumnIndex != colResized; currentColumnIndex++) {
              if (this.s.dt.aoColumns[currentColumnIndex + 1].bVisible)
                visibleColumnIndex++;
            }

            //Get the scroller's div
            tableScroller = $('div.dataTables_scrollBody', this.s.dt.nTableWrapper)[0];

            //Get the table
            scrollingTableHead = $(tableScroller)[0].childNodes[0].childNodes[0].childNodes[0];

            //Resize the columns
            if (moveLength  && !scrollXEnabled) {
              $($(scrollingTableHead)[0].childNodes[visibleColumnIndex + 1]).width(newWidthNoScrollX);
              // browser fix
              $($(scrollingTableHead)[0].childNodes[visibleColumnIndex + 1]).css('min-width',newWidthNoScrollX);
            }
            $($(scrollingTableHead)[0].childNodes[visibleColumnIndex]).width(newWidth);
            // browser fix
            $($(scrollingTableHead)[0].childNodes[visibleColumnIndex]).css('min-width',newWidth);

            //Resize the table too
            if (scrollXEnabled) {
              $($(tableScroller)[0].childNodes[0]).width(newTableWidth);
              // browser fix
              $($(tableScroller)[0].childNodes[0]).css('min-width',newTableWidth);
            }
          }
        }

        if (this.s.bResizeTable) {
          var tableMove = this.s.tableWidth + moveLength;
          $(nTh).closest('table').width(tableMove);
          // browser fix
          $(nTh).closest('table').css('min-width',tableMove);
          this.s.fnResizeTableCallback($(nTh).closest('table'),tableMove,moveLength);
        }

        ////////////////////////

        return;
      }
      else if (this.s.allowReorder) {
        if (this.dom.drag === null) {
          /* Only create the drag element if the mouse has moved a specific distance from the start
           * point - this allows the user to make small mouse movements when sorting and not have a
           * possibly confusing drag element showing up
           */
          if (Math.pow(
              Math.pow(e.pageX - this.s.mouse.startX, 2) +
              Math.pow(e.pageY - this.s.mouse.startY, 2), 0.5) < 5) {
            return;
          }
          this._fnCreateDragNode();
        }

        /* Position the element - we respect where in the element the click occured */
        this.dom.drag.css({
          left: e.pageX - this.s.mouse.offsetX,
          top: e.pageY - this.s.mouse.offsetY
        });

        /* Based on the current mouse position, calculate where the insert should go */
        var bSet = false;
        var lastToIndex = this.s.mouse.toIndex;

        for (var i = 1, iLen = this.s.aoTargets.length; i < iLen; i++) {
          if (e.pageX < this.s.aoTargets[i - 1].x + ((this.s.aoTargets[i].x - this.s.aoTargets[i - 1].x) / 2)) {
            this.dom.pointer.css('left', this.s.aoTargets[i - 1].x);
            this.s.mouse.toIndex = this.s.aoTargets[i - 1].to;
            bSet = true;
            break;
          }
        }

        // The insert element wasn't positioned in the array (less than
        // operator), so we put it at the end
        if (!bSet) {
          this.dom.pointer.css('left', this.s.aoTargets[this.s.aoTargets.length - 1].x);
          this.s.mouse.toIndex = this.s.aoTargets[this.s.aoTargets.length - 1].to;
        }

        // Perform reordering if realtime updating is on and the column has moved
        if (this.s.init.bRealtime && lastToIndex !== this.s.mouse.toIndex) {
          this.s.dt.oInstance.fnColReorder(this.s.mouse.fromIndex, this.s.mouse.toIndex);
          this.s.mouse.fromIndex = this.s.mouse.toIndex;
          this._fnRegions();
        }
      }
    },


    /**
     * Finish off the mouse drag and insert the column where needed
     *  @method  _fnMouseUp
     *  @param   event e Mouse event
     *  @returns void
     *  @private
     */
    "_fnMouseUp": function (e, colResized) {
      var that = this;

      $(document).off('mousemove.ColReorder mouseup.ColReorder');

      if (this.dom.drag !== null) {
        /* Remove the guide elements */
        this.dom.drag.remove();
        this.dom.pointer.remove();
        this.dom.drag = null;
        this.dom.pointer = null;

        /* Actually do the reorder */
        this.s.dt.oInstance.fnColReorder(this.s.mouse.fromIndex, this.s.mouse.toIndex);

        /* When scrolling we need to recalculate the column sizes to allow for the shift */
        if (this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "") {
          this.s.dt.oInstance.fnAdjustColumnSizing();
        }

        if (this.s.dropCallback !== null) {
          this.s.dropCallback.call(this, this.s.mouse.fromIndex, this.s.mouse.toIndex);
        }

        /* Save the state */
        this.s.dt.oInstance.oApi._fnSaveState(this.s.dt);
      }
      else if (this.dom.resize !== null) {
        var i;
        var j;
        var column;
        var currentColumn;
        var aoColumnsColumnindex;
        var nextVisibleColumnIndex;
        var previousVisibleColumnIndex;
        var scrollXEnabled;
        var resizeCol = this.dom.resizeCol;
        /*
         if (resizeCol == 'right') {
         colResized++;
         }
         */
        for (i = 0; i < this.s.dt.aoColumns.length; i++) {
          if (this.s.dt.aoColumns[i]._ColReorder_iOrigCol === colResized) {
            aoColumnsColumnindex = i;
            break;
          }
        }

        // Re-enable column sorting
        // only if sorting were previously enabled
        this.s.dt.aoColumns[aoColumnsColumnindex].bSortable = this.s.dt.aoColumns[aoColumnsColumnindex]._oldbSortable;

        // Save the new resized column's width
        this.s.dt.aoColumns[aoColumnsColumnindex].sWidth = $(this.s.mouse.resizeElem).innerWidth() + "px";

        // If other columns might have changed their size, save their size too
        scrollXEnabled = this.s.dt.oInit.sScrollX === "" ? false : true;
        if (!scrollXEnabled) {
          //The colResized index (internal model) here might not match the visible index since some columns might have been hidden
          for (nextVisibleColumnIndex = colResized + 1; nextVisibleColumnIndex < this.s.dt.aoColumns.length; nextVisibleColumnIndex++) {
            if (this.s.dt.aoColumns[nextVisibleColumnIndex].bVisible)
              break;
          }

          for (previousVisibleColumnIndex = colResized - 1; previousVisibleColumnIndex >= 0; previousVisibleColumnIndex--) {
            if (this.s.dt.aoColumns[previousVisibleColumnIndex].bVisible)
              break;
          }

          if (this.s.dt.aoColumns.length > nextVisibleColumnIndex)
            this.s.dt.aoColumns[nextVisibleColumnIndex].sWidth = $(this.s.mouse.resizeElem).next().innerWidth() + "px";
          else { //The column resized is the right-most, so save the sizes of all the columns at the left
            currentColumn = this.s.mouse.resizeElem;
            for (i = previousVisibleColumnIndex; i > 0; i--) {
              if (this.s.dt.aoColumns[i].bVisible) {
                currentColumn = $(currentColumn).prev();
                this.s.dt.aoColumns[i].sWidth = $(currentColumn).innerWidth() + "px";
              }
            }
          }
        }

        //Update the internal storage of the table's width (in case we changed it because the user resized some column and scrollX was enabled
        if (scrollXEnabled && $('div.dataTables_scrollHead', this.s.dt.nTableWrapper).length) {
          if ($('div.dataTables_scrollHead', this.s.dt.nTableWrapper).length > 0) {
            this.table_size = $($('div.dataTables_scrollHead', this.s.dt.nTableWrapper)[0].childNodes[0].childNodes[0]).width();
          }
        }

        if (this.s.bResizeTableWrapper) {
          $(this.s.dt.nTableWrapper).width($(this.s.dt.nTable).width());
        }

        //Save the state
        this.s.dt.oInstance.oApi._fnSaveState(this.s.dt);
      }
      ///////////////////////////////////////////////////////

      this.dom.resize = null;
    },


    /**
     * Calculate a cached array with the points of the column inserts, and the
     * 'to' points
     *  @method  _fnRegions
     *  @returns void
     *  @private
     */
    "_fnRegions": function () {
      var aoColumns = this.s.dt.aoColumns;

      this.s.aoTargets.splice(0, this.s.aoTargets.length);

      this.s.aoTargets.push({
        "x": $(this.s.dt.nTable).offset().left,
        "to": 0
      });

      var iToPoint = 0;
      for (var i = 0, iLen = aoColumns.length; i < iLen; i++) {
        /* For the column / header in question, we want it's position to remain the same if the
         * position is just to it's immediate left or right, so we only incremement the counter for
         * other columns
         */
        if (i != this.s.mouse.fromIndex) {
          iToPoint++;
        }

        if (aoColumns[i].bVisible) {
          this.s.aoTargets.push({
            "x": $(aoColumns[i].nTh).offset().left + $(aoColumns[i].nTh).outerWidth(),
            "to": iToPoint
          });
        }
      }

      /* Disallow columns for being reordered by drag and drop, counting right to left */
      if (this.s.fixedRight !== 0) {
        this.s.aoTargets.splice(this.s.aoTargets.length - this.s.fixedRight);
      }

      /* Disallow columns for being reordered by drag and drop, counting left to right */
      if (this.s.fixed !== 0) {
        this.s.aoTargets.splice(0, this.s.fixed);
      }
    },


    /**
     * Copy the TH element that is being drags so the user has the idea that they are actually
     * moving it around the page.
     *  @method  _fnCreateDragNode
     *  @returns void
     *  @private
     */
    "_fnCreateDragNode": function () {
      var scrolling = this.s.dt.oScroll.sX !== "" || this.s.dt.oScroll.sY !== "";

      var origCell = this.s.dt.aoColumns[this.s.mouse.targetIndex].nTh;
      var origTr = origCell.parentNode;
      var origThead = origTr.parentNode;
      var origTable = origThead.parentNode;
      var cloneCell = $(origCell).clone();

      // This is a slightly odd combination of jQuery and DOM, but it is the
      // fastest and least resource intensive way I could think of cloning
      // the table with just a single header cell in it.
      this.dom.drag = $(origTable.cloneNode(false))
        .addClass('DTCR_clonedTable')
        .append(
        origThead.cloneNode(false).appendChild(
          origTr.cloneNode(false).appendChild(
            cloneCell[0]
          )
        )
      )
        .css({
          position: 'absolute',
          top: 0,
          left: 0,
          width: $(origCell).outerWidth(),
          height: $(origCell).outerHeight()
        })
        .appendTo('body');

      this.dom.pointer = $('<div></div>')
        .addClass('DTCR_pointer')
        .css({
          position: 'absolute',
          top: scrolling ?
            $('div.dataTables_scroll', this.s.dt.nTableWrapper).offset().top :
            $(this.s.dt.nTable).offset().top,
          height: scrolling ?
            $('div.dataTables_scroll', this.s.dt.nTableWrapper).height() :
            $(this.s.dt.nTable).height()
        })
        .appendTo('body');
    },

    /**
     * Clean up ColReorder memory references and event handlers
     *  @method  _fnDestroy
     *  @returns void
     *  @private
     */
    "_fnDestroy": function () {
      var i, iLen;

      for (i = 0, iLen = this.s.dt.aoDrawCallback.length; i < iLen; i++) {
        if (this.s.dt.aoDrawCallback[i].sName === 'ColReorder_Pre') {
          this.s.dt.aoDrawCallback.splice(i, 1);
          break;
        }
      }

      for (i = 0, iLen = ColReorder.aoInstances.length; i < iLen; i++) {
        if (ColReorder.aoInstances[i] === this) {
          ColReorder.aoInstances.splice(i, 1);
          break;
        }
      }

      $(this.s.dt.nTHead).find('*').off('.ColReorder');

      this.s.dt.oInstance._oPluginColReorder = null;
      this.s = null;
    }
  };





  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Static parameters
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * Array of all ColReorder instances for later reference
   *  @property ColReorder.aoInstances
   *  @type     array
   *  @default  []
   *  @static
   *  @private
   */
  ColReorder.aoInstances = [];


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
   * Static functions
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * `Deprecated` Reset the column ordering for a DataTables instance
   *  @method  ColReorder.fnReset
   *  @param   object oTable DataTables instance to consider
   *  @returns void
   *  @static
   *  @deprecated Use `ColReorder( table ).fnReset()` instead.
   */
  ColReorder.fnReset = function (oTable) {
    for (var i = 0, iLen = ColReorder.aoInstances.length; i < iLen; i++) {
      if (ColReorder.aoInstances[i].s.dt.oInstance == oTable) {
        ColReorder.aoInstances[i].fnReset();
      }
    }
  };






  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Constants
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /**
   * ColReorder version
   *  @constant  VERSION
   *  @type      String
   *  @default   As code
   */
  ColReorder.VERSION = "1.1.0-dev";
  ColReorder.prototype.VERSION = ColReorder.VERSION;





  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Initialisation
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  /*
   * Register a new feature with DataTables
   */
  if (typeof $.fn.dataTable == "function" &&
    typeof $.fn.dataTableExt.fnVersionCheck == "function" &&
    $.fn.dataTableExt.fnVersionCheck('1.9.3')) {
    $.fn.dataTableExt.aoFeatures.push({
      "fnInit": function (settings) {
        var table = settings.oInstance;

        if (table._oPluginColReorder === undefined) {
          var opts = settings.oInit.oColReorder !== undefined ?
            settings.oInit.oColReorder :
          {};

          table._oPluginColReorder = new ColReorder(settings, opts);
        }
        else {
          table.oApi._fnLog(settings, 1, "ColReorder attempted to initialise twice. Ignoring second");
        }

        return null; /* No node for DataTables to insert */
      },
      "cFeature": "R",
      "sFeature": "ColReorder"
    });
  }
  else {
    alert("Warning: ColReorder requires DataTables 1.9.3 or greater - www.datatables.net/download");
  }


  window.ColReorder = ColReorder;
  $.fn.dataTable.ColReorder = ColReorder;


})(jQuery, window, document);


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
    return config.bulk;
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
    return (config.attr || config.title);
  });

  columnType.nodeMatcher(function(config) {
    return "." + Backdraft.Utils.toColumnCSSClass(config.id);
  });

  columnType.definition(function(dataTable, config) {
    var ignore = function() {
      return "";
    };

    return {
      bSortable: config.sort,
      bSearchable: config.search,
      asSorting: config.sortDir,
      sTitle: config.title,
      sClass : Backdraft.Utils.toColumnCSSClass(config.id),
      mData: function(source, type, val) {
        var rowModel = dataTable.collection.get(source);

        if (config.attr) {
          // if attr was provided, we expect to find the value in the model by that key
          //  otherwise return undefined and let DataTables show a warning for missing data
          //  because likely that means a contract mismatch bug
          return rowModel.get(config.id);
        } else {
          // when no attr is provided, return the entire rowModel so that renderers and sortBy etc
          // callbacks have access to the full model and all the attributes
          return rowModel;
        }
      },

      mRender : function(data, type, full) {
        if (config.attr) {
          if (type === "display") {
            // nothing to display so that the view can provide its own UI
            return "";
          } else {
            return data;
          }
        } else {
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
      }
    };
  });

  columnType.renderer(function(cell, config) {
    var renderer = this.renderers[config.id];
    if (renderer) {
      renderer.apply(this, arguments);
    } else {
      cell.text(this.model.get(config.id));
    }
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