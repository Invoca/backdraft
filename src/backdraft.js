(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  {%= inline("src/utils/class.js") %}

  {%= inline("src/app.js") %}
  Backdraft.app = App.factory;
  Backdraft.destroyAll = App.destroyAll;
  Backdraft.destroy = App.destroy;

  {%= inline("src/plugins/plugin.js") %}
  Backdraft.plugin = Plugin.factory;

  window.Backdraft = Backdraft;

})(jQuery);