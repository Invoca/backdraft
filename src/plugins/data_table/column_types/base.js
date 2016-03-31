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
