const webpack = require('webpack');

module.exports = {
  devtool: 'inline-source-map',

  resolve: {
    alias: {
      "datatables.net": require.resolve('../vendor/jquery.dataTables-1.9.4.js'),
      "jquery": "jquery/jquery",
      "bootstrap": "bootstrap/dist/js/bootstrap.js"
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
