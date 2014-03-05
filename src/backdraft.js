(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  {%= inline("src/utils/class.js") %}

  {%= inline("src/app.js") %}
  Backdraft.app = App.factory;

  {%= inline("src/plugin.js") %}
  Backdraft.plugin = Plugin.factory;

  {%= inline("src/plugins/base/base.js") %}
  {%= inline("src/plugins/data_table/data_table.js") %}
  {%= inline("src/plugins/listing/listing.js") %}

  window.Backdraft = Backdraft;

})(jQuery);