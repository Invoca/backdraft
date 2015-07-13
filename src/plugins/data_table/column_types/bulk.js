app.view.dataTable.columnType(function(columnType) {
  columnType.configMatcher(function(config) {
    return config.bulk === true;
  });

  columnType.nodeMatcher(function(config) {
    return ".bulk";
  });

  columnType.definition(function(dataTable, config) {
    return {
      orderable: config.sort,
      searchable: false,
      title: "<input type='checkbox' />",
      "class" : "bulk",
      data: function(source, type, val) {
        return dataTable.collection.get(source);
      },
      render : function(data, type, full) {
        if (type === "sort" || type === "type") {
          return dataTable.selectionManager.has(data) ? 1 : -1;
        } else {
          return "";
        }
      }
    };
  });

  columnType.renderer(function(cell, config) {
    this.checkbox = $("<input>").attr("type", "checkbox");
    this.checkbox.prop("checked", this._bulkSate);
    cell.html(this.checkbox);
  });
});