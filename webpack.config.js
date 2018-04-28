const path = require('path');
const webpack = require('webpack');

// File filter for targeting specific spec files.
const defaultSpecFileFilter = "/_spec\\.js$/";

module.exports = {
  entry: "./src/legacy/entry.js",

  devtool: 'inline-source-map',

  output: {
    path: path.resolve(__dirname, 'dist'),
    library: 'Backdraft',
    libraryTarget: "var",
    libraryExport: "default",
    filename: 'backdraft.js'
  },

  externals: {
    "backbone": "Backbone",
    "jquery": "$",
    "underscore": "_"
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  },

  plugins: [
    new webpack.DefinePlugin({
      SPEC_FILE_FILTER: process.env.SPEC_FILE_FILTER || defaultSpecFileFilter,
      DEFAULT_SPEC_FILE_FILTER: defaultSpecFileFilter
    })
  ]
};
