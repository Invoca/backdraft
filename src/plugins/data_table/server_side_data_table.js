var ServerSideDataTable = (function() {

  var ServerSideDataTable = LocalDataTable.extend({

    constructor : function() {
      // force pagination
      this.paginate = true;
      ServerSideDataTable.__super__.constructor.apply(this, arguments);
      if (this.collection.length !== 0) throw new Error("Server side dataTables requires an empty collection");
      if (!this.collection.url) throw new Error("Server side dataTables require the collection to define a url");
      _.bindAll(this, "_onCreateAjax", "_onDraw");
      this.serverParams({});
      this.selectAllMatching(false);
    },

    selectAllMatching : function(val) {
      // getter
      if (arguments.length === 0) return this._selectAllMatchingParams;

      // setter
      if (val) {
        if (this.dataTable.api().page.info().pages <= 1) throw new Error("#selectAllMatching cannot be used when there are no additional paginated results");
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

    // dataTables callback after a draw event has occurred
    _onDraw : function() {
      // anytime a draw occurrs (pagination change, pagination size change, sorting, etc) we want
      // to clear out any stored selectAllMatchingParams and reset the bulk select checbox
      this.selectAllMatching(false);
      this.bulkCheckbox && this.bulkCheckbox.prop("checked", false);
      this.trigger("draw", arguments);
    },

    _onCreateAjax : function(data, callback, settings) {
      // set additional params for the request
      // replace all undefined/null values with empty string or the serialization breaks
      var self = this;
      var columnAttrs = _.map(this._columnManager.columnAttrs(), function(attr) {
          return attr || "";
      });
      _.extend(data, this._serverParams, { column_attrs: columnAttrs });

      return $.ajax({
        url: _.result(this.collection, "url"),
        data : data,
        dataType : "json",
        cache : false,
        type : this.ajaxMethod || "GET",
        beforeSend: function(xhr) {
          xhr.setRequestHeader('X-Backdraft', "1");
          self._triggerGlobalEvent("ajax-start.backdraft", [xhr, self]);
        },
        success : function(json) {
          // ensure we ignore old Ajax responses
          // this piece of logic was taken from the _fnAjaxUpdateDraw method of dataTables, which is
          // what gets called by callback. However, callback should only be invoked after we reset the
          // collection, so we must perform the check at this point as well.
          if (_.isUndefined(json.draw)) return;
          if (json.draw * 1 < settings.draw) return;

          self.collection.reset(json.data, {
            addData : function(modelCidData) {
              // invoking callback is what will actually causes the data to be populated
              // note the data we pass into the callback is not the raw server data, but rather the cids for
              // indexing into the collection
              json.data = modelCidData;
              settings.json = json;
              callback(json);
            }
          });
        },
        complete: function(xhr, status) {
          self._triggerGlobalEvent("ajax-finish.backdraft", [xhr, status, self, data]);
        }
      });
    },

    _dataTableConfig : function() {
      var config = ServerSideDataTable.__super__._dataTableConfig.apply(this, arguments);
      // add server side related options
      return _.extend(config, {
        processing : true,
        serverSide : true,
        ajax: this._onCreateAjax,
        drawCallback : this._onDraw,
        language: {
          processing: this.processingText,
          emptyTable: this.emptyText
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
