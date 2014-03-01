(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  {%= inline("src/utils/class.js") %}

  window.Backdraft = Backdraft;
  
})(jQuery);