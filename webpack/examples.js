const path = require('path');
const config = require('./common');

config.entry = "./examples_server/js/main.js";

config.output = {
  path: path.resolve(__dirname, '../examples_server/js'),
  filename: 'bundle.js'
};

module.exports = config;
