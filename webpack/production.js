const config = require('./common');

config.entry = "./src/entry.js";
config.devtool = 'source-map';

config.externals = {
  "backbone": "Backbone",
  "bootstrap": "$",
  "jquery": "$",
  "jquery-deparam": "$",
  "underscore": "_"
};

module.exports = config;
