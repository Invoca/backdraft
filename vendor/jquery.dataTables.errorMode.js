// set error mode to throw exceptions
//  useful for specs where "alert" (the Datatable default) does nothing
if ($.fn.dataTableExt) {
  $.fn.dataTableExt.sErrMode = 'error';
}
