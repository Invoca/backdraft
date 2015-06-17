(function($) {

  var Backdraft = {};
  Backdraft.Utils = {};

  // use squiggly braces for underscore templating so we don't conflict with ruby templating
  _.templateSettings = {
    evaluate    : /{{([\s\S]+?)}}/g,
    interpolate : /{{=([\s\S]+?)}}/g,
    escape      : /{{-([\s\S]+?)}}/g
  }

  {%= inline("src/utils/class.js") %}
  {%= inline("src/utils/css.js") %}

  {%= inline("src/app.js") %}
  Backdraft.app = App.factory;

  {%= inline("src/plugin.js") %}
  Backdraft.plugin = Plugin.factory;

  {%= inline("src/plugins/base/base.js") %}
  {%= inline("src/plugins/data_table/index.js") %}
  {%= inline("src/plugins/listing/index.js") %}

  window.Backdraft = Backdraft;

})(jQuery);