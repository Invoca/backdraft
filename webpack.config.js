const path = require('path');
const webpack = require('webpack');

// File filter for targeting specific spec files.
const defaultSpecFileFilter = "/_spec\\.js$/";

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  entry: "./src/entry.js",

  devtool: (isProduction ? 'source-map' : 'inline-source-map'),

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
