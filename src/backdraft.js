(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  {%= inline("src/utils/class.js") %}
  {%= inline("src/app.js") %}

  {%= inline("src/plugins/plugin_loader.js") %}
  Backdraft.plugin = PluginLoader.factory;

  window.Backdraft = Backdraft;

})(jQuery);