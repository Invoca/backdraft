import "datatables.net"; // jQuery DataTables
import "datatables.net-plugins/api/fnPagingInfo"; // fnPagingInfo plugin

import initializeBootstrap from "./datatable_configuration/initialize_bootstrap";
import initializeColReorderPlugin from "./datatable_configuration/initialize_col_reorder_plugin";

initializeBootstrap();
initializeColReorderPlugin();
