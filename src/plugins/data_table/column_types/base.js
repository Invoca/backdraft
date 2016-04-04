app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return !!config.attr;
  });

  columnType.nodeMatcher(function(config) {
    return "." + Backdraft.Utils.toColumnCSSClass(config.attr);
  });

  columnType.definition(function(dataTable, config) {
    var searchable = !_.isUndefined(config.searchBy), sortable = !_.isUndefined(config.sortBy);
    var ignore = function() {
      return "";
    };

    return {
      bSortable: sortable,
      bSearchable: searchable,
      asSorting: config.sortDir,
      sTitle: config.title,
      sClass : Backdraft.Utils.toColumnCSSClass(config.attr),
      mData: function(source, type, val) {
        return dataTable.collection.get(source).get(config.attr);
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
    // TODO: Fixup backend code that generates list of renderers
    var renderer = this.renderers[config.attr];
    if (renderer) {
      renderer.apply(this, arguments);
    } else {
      cell.text(this.model.get(config.attr));
    }
  });
});
