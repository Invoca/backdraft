var ServerSideDataTable = (function() {

  var ServerSideDataTable = Table.extend({

    constructor : function() {
      ServerSideDataTable.__super__.constructor.apply(this, arguments);
      if (this.collection.length !== 0) throw new Error("Server side dataTables requires an empty collection");
      if (!this.collection.url) throw new Error("Server side dataTables require the collection to define a url");
      _.bindAll(this, "_fetchServerData");
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
    }

  });

  return ServerSideDataTable;

})();