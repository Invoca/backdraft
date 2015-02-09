app.view.dataTable.columnType(function(columnType) {
  columnType.matcher(function(config) {
    return !!config.attr;
  });

  columnType.definition(function(dataTable, config) {
    return {
      bSortable: config.sort,
      bSearchable: config.search,
      sTitle: config.title,
      sClass : Row.getCSSClass(config.title),
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

  // columnType.renderer(function(cell, config) {
  // });
});