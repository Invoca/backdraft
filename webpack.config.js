const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: "./src/entry.js",

  output: {
    path: path.resolve(__dirname, 'dist'),
    library: 'Backdraft',
    libraryTarget: "var",
    libraryExport: "default",
    filename: 'backdraft.js'
  },

  externals: [
    "backbone",
    "jquery",
    "underscore"
  ],

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  }
};
