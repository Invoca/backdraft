const webpack = require('webpack');
const config = require('./common');

// File filter for targeting specific spec files.
const defaultSpecFileFilter = "/_spec\\.js$/";

config.devtool = 'inline-source-map';

config.resolve.alias["jquery"] = "jquery/jquery";
config.resolve.alias["bootstrap"] = "bootstrap/dist/js/bootstrap.js";

config.plugins = [
  new webpack.DefinePlugin({
    SPEC_FILE_FILTER: process.env.SPEC_FILE_FILTER || defaultSpecFileFilter,
    DEFAULT_SPEC_FILE_FILTER: defaultSpecFileFilter
  }),

  new webpack.ProvidePlugin({
    "jQuery": "jquery"
  })
];

module.exports = config;
