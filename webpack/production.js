const path = require('path');
const config = require('./common');

config.entry = "./src/entry.js";
config.devtool = 'source-map';

config.output = {
  path: path.resolve(__dirname, 'dist'),
  library: 'Backdraft',
  libraryTarget: "var",
  libraryExport: "default",
  filename: 'backdraft.js'
};

config.externals = {
  "backbone": "Backbone",
  "bootstrap": "$",
  "jquery": "$",
  "jquery-deparam": "$",
  "underscore": "_"
};

module.exports = config;
