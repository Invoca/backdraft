import $ from "jquery";

export default function initializeBootstrap() {
  /* Set the defaults for DataTables initialisation */
  $.extend( true, $.fn.dataTable.defaults, {
    "sDom":
      "<'row'<'col-xs-6'l><'col-xs-6'f>r>"+
      "t"+
      "<'row'<'col-xs-6'i><'col-xs-6'p>>",
    "oLanguage": {
      "sLengthMenu": "_MENU_ records per page",
      "sInfoFiltered": "<br/>(filtered from _MAX_ total)"
    }
  } );


  /* Default class modification */
  $.extend( $.fn.dataTableExt.oStdClasses, {
    "sWrapper": "dataTables_wrapper",
    "sFilterInput": "form-control input-sm",
    "sLengthSelect": "form-control input-sm"
  } );

  // Integration for 1.9-
  $.fn.dataTable.defaults.sPaginationType = 'bootstrap';

  /* API method to get paging information */
  $.fn.dataTableExt.oApi.fnPagingInfo = function ( oSettings )
  {
    return {
      "iStart":         oSettings._iDisplayStart,
      "iEnd":           oSettings.fnDisplayEnd(),
      "iLength":        oSettings._iDisplayLength,
      "iTotal":         oSettings.fnRecordsTotal(),
      "iFilteredTotal": oSettings.fnRecordsDisplay(),
      "iPage":          oSettings._iDisplayLength === -1 ?
        0 : Math.ceil( oSettings._iDisplayStart / oSettings._iDisplayLength ),
      "iTotalPages":    oSettings._iDisplayLength === -1 ?
        0 : Math.ceil( oSettings.fnRecordsDisplay() / oSettings._iDisplayLength )
    };
  };

  /* Bootstrap style pagination control */
  $.extend( $.fn.dataTableExt.oPagination, {
    "bootstrap": {
      "fnInit": function( oSettings, nPaging, fnDraw ) {
        var oLang = oSettings.oLanguage.oPaginate;
        var fnClickHandler = function ( e ) {
          e.preventDefault();
          // prevent clicks on disabled links
          if ($(e.target).closest("li").is(".disabled")) {
            return;
          }
          if ( oSettings.oApi._fnPageChange(oSettings, e.data.action) ) {
            fnDraw( oSettings );
          }
        };

        $(nPaging).append(
          '<ul class="pagination pagination-sm">'+
            '<li class="prev disabled"><a href="#">&larr; </a></li>'+
            '<li class="next disabled"><a href="#"> &rarr; </a></li>'+
          '</ul>'
        );
        var els = $('a', nPaging);
        $(els[0]).bind( 'click.DT', { action: "previous" }, fnClickHandler );
        $(els[1]).bind( 'click.DT', { action: "next" }, fnClickHandler );
      },

      "fnUpdate": function ( oSettings, fnDraw ) {
        var iListLength = 5;
        var oPaging = oSettings.oInstance.fnPagingInfo();
        var an = oSettings.aanFeatures.p;
        var i, ien, j, sClass, iStart, iEnd, iHalf=Math.floor(iListLength/2);

        if ( oPaging.iTotalPages < iListLength) {
          iStart = 1;
          iEnd = oPaging.iTotalPages;
        }
        else if ( oPaging.iPage <= iHalf ) {
          iStart = 1;
          iEnd = iListLength;
        } else if ( oPaging.iPage >= (oPaging.iTotalPages-iHalf) ) {
          iStart = oPaging.iTotalPages - iListLength + 1;
          iEnd = oPaging.iTotalPages;
        } else {
          iStart = oPaging.iPage - iHalf + 1;
          iEnd = iStart + iListLength - 1;
        }

        for ( i=0, ien=an.length ; i<ien ; i++ ) {
          // Remove the middle elements
          $('li:gt(0)', an[i]).filter(':not(:last)').remove();

          // Add the new list items and their event handlers
          for ( j=iStart ; j<=iEnd ; j++ ) {
            sClass = (j==oPaging.iPage+1) ? 'class="active"' : '';
            $('<li '+sClass+'><a href="#">'+j+'</a></li>')
              .insertBefore( $('li:last', an[i])[0] )
              .bind('click', function (e) {
                e.preventDefault();
                // EUGE - patched to make sure the "page" event is fired when numbers are clicked
                oSettings.oInstance.fnPageChange(parseInt($('a', this).text(),10)-1);
              } );
          }

          // Add / remove disabled classes from the static elements
          if ( oPaging.iPage === 0 ) {
            $('li:first', an[i]).addClass('disabled');
          } else {
            $('li:first', an[i]).removeClass('disabled');
          }

          if ( oPaging.iPage === oPaging.iTotalPages-1 || oPaging.iTotalPages === 0 ) {
            $('li:last', an[i]).addClass('disabled');
          } else {
            $('li:last', an[i]).removeClass('disabled');
          }
        }
      }
    }
  } );
}
