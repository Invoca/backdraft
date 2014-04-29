(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

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

  _.extend(Class, {
    extend : extend
  });

  return Class;

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
      if (options.$el) this.$el = options.$el;
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
    app.view = function(name, properties) {
      app.Views[name] = View.extend(properties);
    };

    app.Collections = {}
    app.collection = function(name, properties) {
      app.Collections[name] = Collection.extend(properties);
    };

    app.Models = {};
    app.model = function(name, properties) {
      app.Models[name] = Model.extend(properties);
    };

    app.Routers = {};
    app.router = function(name, properties) {
      app.Routers[name] = Router.extend(properties);
    };

  });


});
  Backdraft.plugin("DataTable", function(plugin) {

  function cidMap(collection) {
    return collection.map(function(model) {
      return { cid : model.cid };
    });
  }

  $.fn.dataTableExt.oApi.fnPagingInfo = function (oSettings) {
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

  var Row = (function() {

  var Base = Backdraft.plugin("Base");
  var cssClass = /[^a-zA-Z_\-]/g;

  function invokeRenderer(row, node, config) {
    var renderer;
    if (config.bulk) {
      renderer = row.renderers.bulk;
    } else if (config.title) {
      renderer = row.renderers[config.title];
    } else {
      renderer = row.renderers.base;
    }
    (renderer || row.renderers.base).call(row, node, config);
  }

  function selectorForCell(config) {
    if (config.title) {
      return "." + Row.getCSSClass(config.title);
    } else if (config.bulk) {
      return ".bulk";
    }
  }

  var Row = Base.View.extend({

    constructor : function() {
      Row.__super__.constructor.apply(this, arguments);
      this.$el.data("row", this);
    },

    render : function() {
      var cells = this.getCells(), node;
      _.each(this.columns, function(config) {
        node = cells.filter(selectorForCell(config));
        if (node.length) invokeRenderer(this, node, config);
      }, this);
    },

    renderWithHint : function(hint) {
      // TODO
    },

    renderColumn : function(config) {
      var node = this.$el.find(selectorForCell(config));
      invokeRenderer(this, node, config);
    },

    setBulkState : function(state) {
      this.checkbox.prop("checked", state);
      this.$el.toggleClass("selected", state);
    },

    getCells : function() {
      return this.$el.find("td");
    }

  }, {

    finalize : function(name, rowClass) {
      // renderers are optional for a class
      var renderers = rowClass.prototype.renderers || {};
      // allow overriding of default renderers
      rowClass.prototype.renderers = _.extend({}, this.renderers, renderers)
    },

    // create a valid CSS class name based on input
    getCSSClass : function(input) {
      return input.replace(cssClass, function() {
        return "-";
      });
    },

    renderers : {

      base : function(cell, config) {
        var content = this.model.get(config.attr);
        cell.text(content);
      },

      bulk : function(cell, config) {
        if (this.checkbox) return;
        this.checkbox = $("<input>").attr("type", "checkbox");
        cell.html(this.checkbox);
      }

    }

  });

  return Row;

})();
  var Table = (function() {

  var Base = Backdraft.plugin("Base");

  var SelectionHelper = Backdraft.Utils.Class.extend({

    initialize : function() {
      // change to track models
      // render with bulk set correctly
    }

  });

  var Table = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    constructor : function(options) {
      X = this;
      this.options = options || {};
      _.bindAll(this, "_onDraw", "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick");
      this.cache = new Base.Cache();
      this.rowClass = this.getRowClass();
      this.columns = this.rowClass.prototype.columns;
      this._applyDefaults();
      this._resetSelected();
      // inject our own events in addition to the users
      this.events = _.extend(this.events || {}, {
        "click .dataTable tbody tr" : "_onRowClick"
      });
      Table.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    filter : function() {
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // return the row objects that have not been filtered out
    getVisibleRows : function() {
      return this.dataTable.$("tr", { filter : "applied" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      return this.dataTable.$("tr", { filter : "applied", page : "current" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    // returns row objects that have not been filtered out and are on all pages
    _visibleRowsOnAllPages : function() {
      if (!this.paginate) throw new Error("#_visibleRowsOnAllPages should only be used for paginated tables");
      return this.dataTable.$("tr", { filter : "applied" }).map(function(index, node) {
        return $(node).data("row");
      });
    },

    selectedModels : function() {
      return _.map(this.selected.rows, function(row) {
        return row.model;
      })
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this.trigger("change:stats");
      return this;
    },

    selectAll : function(state) {
      this.bulkCheckbox.prop("checked", state);
      this._resetSelected();
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row, state);
      }, this);
      this.trigger("change:stats");
    },

    selectAllComplete : function() {
      if (!this.paginate) throw new Error("#selectAllComplete cannot be used when pagination is disabled");
      if (this.dataTable.fnPagingInfo().iTotalPages <= 1) throw new Error("#selectAllComplete cannot be used when there are no additional paginated results");

      _.each(this._visibleRowsOnAllPages(), function(row) {
        this._setRowSelectedState(row, true);
      }, this);
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true
      });
    },

    _resetSelected : function() {
      this.selected = {
        rows : {},
        count : 0
      };
    },

    _setRowSelectedState : function(row, state) {
      // for paginated tables, the row may not have been rendered yet
      // TODO: selected math adjustments need to be done regardless of row or not, move logic outside of if (row)
      
      if (row) {
        var existing = this.selected.rows[row.cid];
        if (state) {
          if (!existing) {
            this.selected.rows[row.cid] = row;
            this.selected.count += 1;
          }
        } else {
          if (existing) {
            delete this.selected.rows[row.cid];
            this.selected.count = Math.max(0, this.selected.count -1);
          }
        }

        row.setBulkState(state);
      }
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._getDataTableConfig());
      if (this.collection.length) this.dataTable.fnAddData(cidMap(this.collection));
      var bulkCheckbox = this.$el.find("th :checkbox");
      if (bulkCheckbox.length) {
        this.bulkCheckbox = bulkCheckbox;
        this.bulkCheckbox.closest("th").click(this._onBulkHeaderClick);
        this.dataTable.on("click", "td.bulk :checkbox", this._onBulkRowClick);
      }

    },

    _getDataTableConfig : function() {
      return {
        bDeferRender : false,
        bPaginate : this.paginate,
        bInfo : true,
        fnCreatedRow : this._onRowCreated,
        fnDrawCallback : this._onDraw,
        aoColumns      : this._getColumnConfig(),
        aaSorting :  [ [ 0, 'asc' ] ]
      };
    },

    _getColumnConfig : function() {
      return _.map(this.columns, function(config) {
        if (config.bulk) {
          return this._columnBulk(config);
        } else if (config.attr) {
          return this._columnAttr(config);
        } else {
          return this._columnBase(config);
        }
      }, this);
    },

    _columnBulk : function(config) {
      return {
        bSortable: false,
        bSearchable: false,
        sTitle: "<input type='checkbox' />",
        sClass : "bulk",
        mData: null,
        mRender : function() {
          return "";
        }
      };
    },

    _columnAttr : function(config) {
      var self = this;
      return {
        bSortable: config.sort,
        bSearchable: config.search,
        sTitle: config.title,
        sClass : Row.getCSSClass(config.title),
        mData: function(source, type, val) {
          return self.collection.get(source).get(config.attr);
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
    },

    _columnBase : function(config) {
      var self = this, searchable = !_.isUndefined(config.searchBy), sortable = !_.isUndefined(config.sortBy);
      var ignore = function() {
        return "";
      };
      return {
        bSortable: sortable,
        bSearchable: searchable,
        sTitle: config.title,
        sClass : Row.getCSSClass(config.title),
        mData: function(source, type, val) {
          return self.collection.get(source);
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
    },

    // events

    _onBulkHeaderClick : function(event) {
      var state = this.bulkCheckbox.prop("checked");
      if (!$(event.target).is(this.bulkCheckbox)) state = !state;
      this.selectAll(state);
      return true;
    },

    _onBulkRowClick : function(event) {
      var checkbox = $(event.target), row = checkbox.closest("tr").data("row"), checked = checkbox.prop("checked");
      // ensure that when a single row checkbox is un-checked, we un-check the header bulk checkbox
      if (!checked) this.bulkCheckbox.prop("checked", false);
      this._setRowSelectedState(row, checked);
    },

    _onDraw : function() {
      if (!this.dataTable) return;
      // figure out which rows are visible
      var visible = {}, row, cid;
      _.each(this.getVisibleRows(), function(r) {
        visible[r.cid] = r;
      });
      // unselect the ones that are no longer visible
      for (cid in this.selected.rows) {
        if (!visible[cid]) {
          this._setRowSelectedState(this.selected.rows[cid], false);
        }
      }
      this.trigger("change:stats");
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({ el : node, model : model });
      this.cache.set(model, row);
      // TODO: visibilityHint
      this.child("child" + row.cid, row).render();
    },

    _onRowClick : function(event) {

    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid })
      this.trigger("change:stats");
    }, 

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:stats");
    }, 

    _onReset : function(collection) {
      if (!this.dataTable) return;
      // clean up old data
      this.dataTable.fnClearTable(false);
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this.trigger("change:stats");
    }

  }, {

    finalize : function(name, tableClass, views) {
      // method for late resolution of row class, removes dependency 
      // on needing access to the entire app
      tableClass.prototype.getRowClass = function() {
        return views[tableClass.prototype.rowClassName];
      }
    }

  });

  return Table;

})();

/*
  No pagination
    - select all - should select only what is visible on the screen, as some rows may have been filtered. all rows are rendered upfront since there is no pagination
    - no gmail style

  Pagination - local
    - select all (first time)  - should select only only what is visible on the screen - we don't want to select other pages.
    - select all (gmail style) - should only appear if there is more than 1 page of paginated data
                               - should select all models on all filter applied paginated pages, even if some have not been rendered. not sure how to find these models. 
                                 it may be easier to disable deferred rendering and use the visibleRow method we have. so lets say you filter 100 results to 34, 
                                 hit select all, we will select 10 visible ones. say you want all all. the 34 results will be selected

  ServerSide (pagination is implied)
    - disable datatables filtering as it's default issues too many ajax
    - select all (first time)  - should select whats in the collection, since its server side, everything in the collection is what we have.
    - select all (gmail style) - should only appear if there is more than 1 page of paginated data
                               - need to persist current filters and return those instead of selected ids.



TODO 
  - selecting single is not adjusting selected counts or adding rows/models
  - clear selectAllComplete data on fnDrawCallback or fnInfoCallback
  - getVisibleRows is returning other pages in case of local pagination, all ones that have been created - we may not need this method any more, see next note about drawcallback
  - need to fix drawcallback to deal with unselecting stuff

Questions:
  When should we unselect the "all selected" ones?
    - as soon as anything is changed
  On a local paginated page, if you select a bunch of things and then move to another page, should those previous options be persisted?
    - for the complete all case, we will nuke it
    - but what about just selection of that page, what should we do with header, leave it checked?
  Should we even bother with the selectallcomplete on a local paginated page???



*/
  var ServerSideDataTable = (function() {

  var ServerSideDataTable = Table.extend({

    constructor : function() {
      // force pagination
      this.paginate = true;
      ServerSideDataTable.__super__.constructor.apply(this, arguments);
      if (this.collection.length !== 0) throw new Error("Server side dataTables requires an empty collection");
      if (!this.collection.url) throw new Error("Server side dataTables require the collection to define a url");
      _.bindAll(this, "_fetchServerData");
    },

    selectAllComplete : function() {
      if (!this.paginate) throw new Error("#selectAllComplete cannot be used when pagination is disabled");
      if (this.dataTable.fnPagingInfo().iTotalPages <= 1) throw new Error("#selectAllComplete cannot be used when there are no additional paginated results");
      alert("Storing search variables");
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
      // #fnClearTable here - it is a client-side only function
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // actually add new data
      options.addData(cidMap(collection));
    },

    _fetchServerData : function(sUrl, aoData, fnCallback, oSettings) {
      var self = this;
      oSettings.jqXHR = $.ajax({
        url : sUrl,
        data : aoData,
        dataType : "json",
        cache : false,
        type : "GET",
        success : function(json) {
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
        }
      });
    },

    _getDataTableConfig : function() {
      var config = ServerSideDataTable.__super__._getDataTableConfig.apply(this, arguments);
      // add server side related options
      return _.extend(config, {
        bProcessing : true,
        bServerSide : true,
        sAjaxSource : this.collection.url,
        fnServerData : this._fetchServerData
      });
    },

    _dataTableCreate : function() {
      ServerSideDataTable.__super__._dataTableCreate.apply(this, arguments);
      // hide inefficient filter
      this.$(".dataTables_filter").css("visibility", "hidden");
    }

  });

  return ServerSideDataTable;

})();

  plugin.initializer(function(app) {

    app.view.dataTable = function(name, properties) {
      var klass = properties.serverSide ? ServerSideDataTable : Table;
      app.Views[name] = klass.extend(properties);
      klass.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, properties) {
      app.Views[name] = Row.extend(properties);
      Row.finalize(name, app.Views[name], app.Views);
    }
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