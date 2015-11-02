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
      this._fetchCSV(sUrl);
    },

    _fetchCSV : function (sUrl) {
      if (this.serverSideFiltering) {
        var filterJson = {};
        filterJson.name = "ext_filter_json";
        filterJson.value = this._getFilteringSettings();
        this._goToWindowLocation(sUrl + "&ext_filter_json=" + encodeURIComponent(filterJson.value));
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
