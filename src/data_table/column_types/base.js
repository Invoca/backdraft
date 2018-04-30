import ColumnType from "../column_type";
import {toColumnCSSClass} from "../../utils/css";

export default function createBaseColumnType() {
  const columnType = new ColumnType();

  columnType.configMatcher(function(config) {
    return (config.attr || config.title);
  });

  columnType.nodeMatcher(function(config) {
    return "." + toColumnCSSClass(config.id);
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
      sClass: toColumnCSSClass(config.id),
      mData: function(source, type, val) {
        var rowModel = dataTable.collection.get(source);

        if (config.attr) {
          // if attr was provided, we expect to find the value in the model by that key
          //  otherwise return undefined and let DataTables show a warning for missing data
          //  because likely that means a contract mismatch bug
          return rowModel.get(config.id);
        } else {
          // when no attr is provided, return the entire rowModel so that renderers and sortBy etc
          // callbacks have access to the full model and all the attributes
          return rowModel;
        }
      },

      mRender: function(data, type, full) {
        if (config.attr) {
          if (type === "display") {
            // nothing to display so that the view can provide its own UI
            return "";
          } else {
            return data;
          }
        } else {
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

  return columnType;
}
