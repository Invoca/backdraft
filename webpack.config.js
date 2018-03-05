const path = require('path');

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
    "underscore": "_",
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  }
};
