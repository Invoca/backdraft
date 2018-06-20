module.exports = {
  resolve: {
    alias: {
      "datatables.net": require.resolve('../vendor/jquery.dataTables-1.9.4.js')
    }
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }]
  }
};
