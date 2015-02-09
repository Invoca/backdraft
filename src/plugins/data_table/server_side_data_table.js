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
      _.each(this._columnManager.columnAttrs(), function(attr) {
        aoData.push({ name: "column_attrs[]", value: attr });
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
        fnDrawCallback : this._drawCallback,
        oLanguage: {
          sProcessing: this.processingText,
          sEmptyTable: this.emptyText
        }
      });
    },

    _dataTableCreate : function() {
      try {
        ServerSideDataTable.__super__._dataTableCreate.apply(this, arguments);
      }
      catch(ex) {
        throw new Error("Unable to create ServerSide dataTable. Does your layout template have the 'r' setting for showing the processing status? Exception: " + ex.message);
      }

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
