+function ($) {
  'use strict';

  // POPOVER MENU PUBLIC CLASS DEFINITION
  // ===============================

  var PopoverMenu = function (element, options) {
    this.init('popover', element, options);
  };

  if (!$.fn.popover) {throw new Error('Popover-Menu requires popover.js');}

  PopoverMenu.DEFAULTS = $.extend({}, $.fn.popover.Constructor.DEFAULTS, {
    content: '',
    animation: false,
    container: 'body',
    placement: 'bottom auto',
    trigger: 'click',
    template: '<div class="popover popover-menu"><div class="popover-content"></div></div>',
    html: true
  });


  // NOTE: POPOVER MENU EXTENDS popover.js
  // ================================

  PopoverMenu.prototype = $.extend({}, $.fn.popover.Constructor.prototype);

  PopoverMenu.prototype.constructor = PopoverMenu;

  PopoverMenu.prototype.getDefaults = function () {
    return PopoverMenu.DEFAULTS;
  };

  // override placement method to be able to adjust menu position when it would exceed the right margin of the window
  PopoverMenu.prototype.applyPlacement = function() {
    $.fn.popover.Constructor.prototype.applyPlacement.apply(this, arguments);
    if (typeof this.options.placement == 'string' && this.options.placement.match(/top|bottom/)) {
      this.adjustPlacementWhenClippedOnRight();
    }
  };

  // custom function for repositioning the menu tooltip when it's not entirely visible (right side clipped)
  PopoverMenu.prototype.adjustPlacementWhenClippedOnRight = function() {
    var $tip = this.tip();
    var actualWidth  = $tip[0].offsetWidth;
    var tipOffset = $tip.offset();
    var deltaRight = tipOffset.left + actualWidth - (document.body.scrollLeft + $('body').innerWidth());
    if (deltaRight > 0) {
      $tip.offset({ left: tipOffset.left - deltaRight, top: tipOffset.top });
    }
  };

  // POPOVER MENU PLUGIN DEFINITION
  // =========================

  var old = $.fn.popoverMenu;

  $.fn.popoverMenu = function (option) {
    return this.each(function () {
      var $this   = $(this);
      var data    = $this.data('bs.popover');
      var options = typeof option == 'object' && option;

      if (!data && option == 'destroy') { return; }
      if (!data) {
        $this.data('bs.popover', (data = new PopoverMenu(this, options)));

        // Fixing a bug caused by v3.3.5, that wasn't fix in 3.x series
        // https://github.com/twbs/bootstrap/issues/16732
        $this.on('hidden.bs.popover', function(evt) {
          var inState = $this.data("bs.popover").inState;

          // be defensive for jasmine tests that do not have this property
          if (inState) {
            inState.click = false;
          }
        });
      }
      if (typeof option == 'string') { data[option](); }
    });
  };

  $.fn.popoverMenu.Constructor = PopoverMenu;


  // POPOVER MENU NO CONFLICT
  // ===================

  $.fn.popoverMenu.noConflict = function () {
    $.fn.popoverMenu = old;
    return this;
  };

}(jQuery);

// Hide popover-menu on blur, but allow clicks inside popover-menu content
// Any implementation of a popover not using this data-toggle will remain open on blur.
jQuery(document).ready(function($) {
  $("body").on("click", function(e) {
    $("[data-toggle='popover-menu']").each(function() {
      if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $(".popover").has(e.target).length === 0) {
        $(this).popover("hide");
      }
    });
  });
});
