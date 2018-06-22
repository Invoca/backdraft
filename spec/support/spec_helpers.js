import Row from "../../src/data_table/row";
import LocalDataTable from "../../src/data_table/local_data_table";
import ServerSideDataTable from "../../src/data_table/server_side_data_table";

import _ from "underscore";

import $ from "jquery";

// set error mode to throw exceptions
//  useful for specs where "alert" (the Datatable default) does nothing
$.fn.dataTableExt.sErrMode = 'error';

export function inDom(element, block) {
  $("body").append(element);

  try {
    block();
  } finally {
    element.remove();
  }
}

export function createRowClass(protoProperties) {
  class RowClass extends Row {}
  _.extend(RowClass.prototype, protoProperties);

  return RowClass;
}

function createDataTableClass(baseClass, constructorOptions, protoProperties) {
  class TableClass extends baseClass {
    constructor(options) {
      super(_.extend({}, options, constructorOptions));
    }
  }

  _.extend(TableClass.prototype, protoProperties);
  return TableClass;
}

export function createLocalDataTableClass(...args) {
  return createDataTableClass(LocalDataTable, ...args);
}

export function createServerSideDataTableClass(...args) {
  return createDataTableClass(ServerSideDataTable, ...args);
}
