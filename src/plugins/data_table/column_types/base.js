app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return !config.bulk;
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
          return rowModel.get(config.attr);
        } else {
          // when no attr is provided, look in the collection by id but fallback to prevent
          //  unnecessary DataTable warnings (since likely a custom renderer is being used)
          // TODO - add missing test for this case (that confirms no warning by dataTables)
          return rowModel.get(config.id) || "";
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
          // TODO - add missing tests for sortBy and searchBy
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
