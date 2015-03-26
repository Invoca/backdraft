app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return !!config.attr;
  });

  columnType.nodeMatcher(function(config) {
    return "." + Backdraft.Utils.toCSSClass(config.title);
  });

  columnType.definition(function(dataTable, config) {
    return {
      bSortable: config.sort,
      bSearchable: config.search,
      asSorting: config.sortDir,
      sTitle: config.title,
      sClass : Backdraft.Utils.toCSSClass(config.title),
      mData: function(source, type, val) {
        return dataTable.collection.get(source).get(config.attr);
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
  });

  columnType.renderer(function(cell, config) {
    var renderer = this.renderers[config.title];
    if (renderer) {
      renderer.apply(this, arguments);
    } else {
       cell.text(this.model.get(config.attr));
    }
  });
});
