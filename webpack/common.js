const webpack = require('webpack');

module.exports = {
  devtool: 'inline-source-map',

  resolve: {
    alias: {
      "jquery": "jquery/jquery"
    }
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  },

  plugins: [
    new webpack.ProvidePlugin({
      "jQuery": "jquery"
    })
  ]
};
