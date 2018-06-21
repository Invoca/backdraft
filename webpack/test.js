const webpack = require('webpack');
const config = require('./common');

// File filter for targeting specific spec files.
const defaultSpecFileFilter = "/_spec\\.js$/";

config.plugins.push(
  new webpack.DefinePlugin({
    SPEC_FILE_FILTER: process.env.SPEC_FILE_FILTER || defaultSpecFileFilter,
    DEFAULT_SPEC_FILE_FILTER: defaultSpecFileFilter
  })
);

module.exports = config;
