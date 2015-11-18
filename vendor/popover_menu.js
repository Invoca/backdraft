+function ($) {
  'use strict';

  // POPOVER MENU PUBLIC CLASS DEFINITION
  // ===============================

  var PopoverMenu = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.popover) throw new Error('Popover-Menu requires popover.js')

  PopoverMenu.DEFAULTS = $.extend({}, $.fn.popover.Constructor.DEFAULTS, {
    content: '',
    animation: false,
    container: 'body',
    placement: 'bottom auto',
    trigger: 'click',
    template: '<div class="popover popover-menu"><div class="popover-content"></div></div>',
    html: true
  })


  // NOTE: POPOVER MENU EXTENDS popover.js
  // ================================

  PopoverMenu.prototype = $.extend({}, $.fn.popover.Constructor.prototype)

  PopoverMenu.prototype.constructor = PopoverMenu

  PopoverMenu.prototype.getDefaults = function () {
    return PopoverMenu.DEFAULTS
  }

  // POPOVER MENU PLUGIN DEFINITION
  // =========================

  var old = $.fn.popoverMenu

  $.fn.popoverMenu = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data && option == 'destroy') return
      if (!data) $this.data('bs.popover', (data = new PopoverMenu(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.popoverMenu.Constructor = PopoverMenu


  // POPOVER MENU NO CONFLICT
  // ===================

  $.fn.popoverMenu.noConflict = function () {
    $.fn.popoverMenu = old
    return this
  }

}(jQuery);

// Hide popover-menu on blur, but allow clicks inside popover-menu content
jQuery(document).ready(function($) {
  $("body").on("click", function(e) {
    $(".btn-popover-menu").each(function() {
      if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $(".popover").has(e.target).length === 0) {
        $(this).popover("hide");
      }
    });
  });
});
