import "datatables.net"; // jQuery DataTables
import "datatables.net-plugins/api/fnPagingInfo"; // fnPagingInfo plugin
import "../../vendor/1.10_two_button"; // integration file for migrating from datatables 1.9 to 1.10

import initializeBootstrap from "./datatables/configure";
import initializeColReorderPlugin from "./datatables/col_reorder_with_resize";

initializeBootstrap();
initializeColReorderPlugin();
