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

  var Row = (function() {

  var Base = Backdraft.plugin("Base");
  var cssClass = /[^a-zA-Z_0-9\-]/g;

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
      this.columns = _.result(this, 'columns');
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
  var LocalDataTable = (function() {

  var Base = Backdraft.plugin("Base");

  var SelectionHelper = Backdraft.Utils.Class.extend({

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

  var LocalDataTable = Base.View.extend({

    template : '\
      <table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered"></table>\
    ',

    // non-paginated tables will return all rows, ignoring the page param
    _visibleRowsCurrentPageArgs : { filter : "applied", page : "current" },

    constructor : function(options) {
      this.options = options || {};
      // copy over certain properties from options to the table itself
      _.extend(this, _.pick(this.options, [ "selectedIds" ]));
      _.bindAll(this, "_onRowCreated", "_onBulkHeaderClick", "_onBulkRowClick", "_bulkCheckboxAdjust", "_onDraw");
      this.cache = new Base.Cache();
      this.rowClass = this.getRowClass();
      this.columns = _.result(this.rowClass.prototype, 'columns');
      if (!_.isArray(this.columns)) throw new Error('Columns should be a valid array');
      this._applyDefaults();
      this.selectionHelper = new SelectionHelper();
      // inject our own events in addition to the users
      this.events = _.extend(this.events || {}, {
        "click .dataTable tbody tr" : "_onRowClick"
      });
      LocalDataTable.__super__.constructor.apply(this, arguments);
      this.listenTo(this.collection, "add", this._onAdd);
      this.listenTo(this.collection, "remove", this._onRemove);
      this.listenTo(this.collection, "reset", this._onReset);
    },

    // apply filtering
    filter : function() {
      this.dataTable.fnFilter.apply(this.dataTable, arguments);
    },

    // change pagination
    changePage : function() {
      if (!this.paginate) throw new Error("#changePage requires the table be enabled for pagination");
      return this.dataTable.fnPageChange.apply(this.dataTable, arguments);
    },

    // sort specific columns
    sort : function() {
      return this.dataTable.fnSort.apply(this.dataTable, arguments);
    },

    selectedModels : function() {
      return this.selectionHelper.models();
    },

    render : function() {
      this.$el.html(this.template);
      this._dataTableCreate();
      this._initBulkHandling();
      this.paginate && this._initPaginationHandling();
      this.trigger("change:selected", { count : this.selectionHelper.count() });
      return this;
    },

    selectAllVisible : function(state) {
      this.bulkCheckbox.prop("checked", state);
      _.each(this._visibleRowsOnCurrentPage(), function(row) {
        this._setRowSelectedState(row.model, row, state);
      }, this);
      var info = { count : this.selectionHelper.count() };
      if (state) {
        info.selectAllVisible = true;
      }
      this.trigger("change:selected", info);
    },

    selectAllMatching : function() {
      if (!this.paginate) throw new Error("#selectAllMatching can only be used with paginated tables");
      _.each(this._allMatchingModels(), function(model) {
        this._setRowSelectedState(model, this.cache.get(model), true);
      }, this);
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    },

    _allMatchingModels : function() {
      // returns all models matching the current filter criteria, regardless of pagination
      // since we are using deferred rendering, the dataTable.$ and dataTable._ methods don't return all 
      // matching data since some of the rows may not have been rendered yet.
      // here we use the the aiDisplay property to get indecies of the data matching the currenting filtering
      // and return the associated models
      return _.map(this.dataTable.fnSettings().aiDisplay, function(index) {
        return this.collection.at(index);
      }, this);
    },

    matchingCount : function() {
      return this.dataTable.fnSettings().aiDisplay.length;
    },

    // private
    _applyDefaults : function() {
      _.defaults(this, {
        paginate : true,
        paginateLengthMenu : [ 10, 25, 50, 100 ],
        paginateLength : 10,
        selectedIds : [],
        layout : "<'row'<'col-xs-6'l><'col-xs-6'f>r>t<'row'<'col-xs-6'i><'col-xs-6'p>>",
      });
      _.defaults(this, {
        sorting : [ [ 0, this.paginate ? "desc" : "asc" ] ]
      });
    },

    // returns row objects that have not been filtered out and are on the current page
    _visibleRowsOnCurrentPage : function() {
      return this.dataTable.$("tr", this._visibleRowsCurrentPageArgs).map(function(index, node) {
        return $(node).data("row");
      });
    },

    _setRowSelectedState : function(model, row, state) {
      this.selectionHelper.process(model, state);
      // the row may not exist yet as we utilize deferred rendering. we track the model as 
      // selected and make the ui reflect this when the row is finally created
      row && row.bulkState(state);
    },

    _dataTableCreate : function() {
      this.dataTable = this.$("table").dataTable(this._dataTableConfig());
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
      if (!bulkCheckbox.length) return
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
        aoColumns : this._getColumnConfig(),
        aaSorting : this.sorting,
        fnDrawCallback : this._onDraw
      };
    },

    _onDraw : function() {
      this.trigger("draw", arguments);
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
      var self = this;
      return {
        bSortable: true,
        bSearchable: false,
        sTitle: "<input type='checkbox' />",
        sClass : "bulk",
        mData: function(source, type, val) {
          return self.collection.get(source);
        },
        mRender : function(data, type, full) {
          if (type === "sort" || type === "type") {
            return self.selectionHelper.has(data) ? 1 : -1;
          } else {
            return "";            
          }
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
      this.selectAllVisible(state);
      // don't let dataTables sort this column on the click of checkbox
      event.stopPropagation();
    },

    _onBulkRowClick : function(event) {
      var checkbox = $(event.target), row = checkbox.closest("tr").data("row"), checked = checkbox.prop("checked");
      // ensure that when a single row checkbox is unchecked, we uncheck the header bulk checkbox
      if (!checked) this.bulkCheckbox.prop("checked", false);
      this._setRowSelectedState(row.model, row, checked);
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    },

    _onRowCreated : function(node, data) {
      var model = this.collection.get(data);
      var row = new this.rowClass({ el : node, model : model });
      this.cache.set(model, row);
      // TODO: visibilityHint
      this.child("child" + row.cid, row).render();
      // due to deferred rendering, the model associated with the row may have already been selected, but not rendered yet.
      this.selectionHelper.has(model) && row.bulkState(true);
    },

    _onRowClick : function(event) {

    },

    _onAdd : function(model) {
      if (!this.dataTable) return;
      this.dataTable.fnAddData({ cid : model.cid })
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    },

    _onRemove : function(model) {
      if (!this.dataTable) return;
      var cache = this.cache, row = cache.get(model);
      this.dataTable.fnDeleteRow(row.el, function() {
        cache.unset(model);
        row.close();
      });
      this.trigger("change:selected", { count : this.selectionHelper.count() });
    },

    _onReset : function(collection) {
      if (!this.dataTable) return;
      // clean up old data
      this.dataTable.fnClearTable(false);
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // populate with preselected items
      this.selectionHelper = new SelectionHelper();
      _.each(this.selectedIds, function(id) {
        // its possible that a selected id is provided for a model that doesn't actually exist in the table, ignore it
        var selectedModel = this.collection.get(id);
        selectedModel && this._setRowSelectedState(selectedModel, null, true);
      }, this);

      // add new data
      this.dataTable.fnAddData(cidMap(collection));
      this.trigger("change:selected", { count : this.selectionHelper.count() });
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

  return LocalDataTable;

})();


  var ServerSideDataTable = (function() {

  var ServerSideDataTable = LocalDataTable.extend({

    // serverSide dataTables have a bug finding rows when the "page" param is provided on pages other than the first one
    _visibleRowsCurrentPageArgs : { filter : "applied" },

    constructor : function() {
      // force pagination
      this.paginate = true;
      ServerSideDataTable.__super__.constructor.apply(this, arguments);
      if (this.collection.length !== 0) throw new Error("Server side dataTables requires an empty collection");
      if (!this.collection.url) throw new Error("Server side dataTables require the collection to define a url");
      _.bindAll(this, "_fetchServerData", "_addServerParams", "_drawCallback");
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
      // #fnClearTable here - it is a client-side only function
      this.cache.each(function(row) {
        row.close();
      });
      this.cache.reset();
      // actually add new data
      options.addData(cidMap(collection));
    },

    // dataTables callback to allow addition of params to the ajax request
    _addServerParams : function(aoData) {
      for (var key in this._serverParams) {
        aoData.push({ name : key, value : this._serverParams[key] });
      }
      // add column attribute mappings as a parameter
      _.each(this.columns, function(col) {
        aoData.push({ name: "column_attrs[]", value: col.attr });
      });
    },

    // dataTables callback after a draw event has occurred
    _drawCallback : function() {
      // anytime a draw occurrs (pagination change, pagination size change, sorting, etc) we want
      // to clear out any stored selectAllMatchingParams
      this.selectAllMatching(false);
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

    _dataTableConfig : function() {
      var config = ServerSideDataTable.__super__._dataTableConfig.apply(this, arguments);
      // add server side related options
      return _.extend(config, {
        bProcessing : true,
        bServerSide : true,
        sAjaxSource : _.result(this.collection, "url"),
        fnServerData : this._fetchServerData,
        fnServerParams : this._addServerParams,
        fnDrawCallback : this._drawCallback
      });
    },

    _dataTableCreate : function() {
      ServerSideDataTable.__super__._dataTableCreate.apply(this, arguments);
      // hide inefficient filter
      this.$(".dataTables_filter").css("visibility", "hidden");
    },

    // overriden to just clear the header bulk checkbox between page transitions
    // since rows are re-rendered on every interaction with the server
    _initPaginationHandling : function() {
      var self = this;
      if (this.bulkCheckbox) {
        this.dataTable.on("page", function() {
          self.bulkCheckbox.prop("checked", false);
        });
      }
    },

    _initBulkHandling : function() {
      ServerSideDataTable.__super__._initBulkHandling.apply(this, arguments);
      // whenever selections change, clear out stored server params
      this.on("change:selected", function() {
        this.selectAllMatching(false);
      }, this);
    }

  });

  return ServerSideDataTable;

})();

  plugin.initializer(function(app) {

    app.view.dataTable = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = properties.serverSide ? ServerSideDataTable : LocalDataTable;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
    };

    app.view.dataTable.row = function(name, baseClassName, properties) {
      var baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Row;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
      baseClass.finalize(name, app.Views[name], app.Views);
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