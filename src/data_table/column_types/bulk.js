import $ from "jquery";
import ColumnType from "../column_type";

export default function createBulkColumnType() {
  const columnType = new ColumnType();

  columnType.configMatcher(function(config) {
    return config.bulk;
  });

  columnType.nodeMatcher(function(config) {
    return ".bulk";
  });

  columnType.definition(function(dataTable, config) {
    return {
      bSortable: config.sort,
      bSearchable: false,
      sTitle: "<input type='checkbox' />",
      sClass: "bulk",
      mData: function(source, type, val) {
        return dataTable.collection.get(source);
      },
      mRender: function(data, type, full) {
        if (type === "sort" || type === "type") {
          return dataTable.selectionManager.has(data) ? 1 : -1;
        } else {
          return "";
        }
      }
    };
  });

  columnType.renderer(function(cell, config) {
    if (this.checkbox) return;
    this.checkbox = $("<input>").attr("type", "checkbox");
    cell.html(this.checkbox);
  });

  return columnType;
}
