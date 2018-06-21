const path = require('path');
const exampleServer = require("./lib/example_server");

module.exports = function(grunt) {
  const webpackConfig = require('./webpack/production.js');

  webpackConfig.output = {
    path: path.resolve(__dirname, 'dist'),
    library: 'Backdraft',
    libraryTarget: "var",
    libraryExport: "default",
    filename: 'backdraft.js'
  };

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    webpack: {
      options: {
        stats: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
      },

      dev: webpackConfig
    },

    watch: {
      autobuild: {
        files: ["src/**/*.js"],
        tasks: ["build"]
      }
    }
  });

  grunt.loadNpmTasks('grunt-webpack');
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("build", "webpack");

  grunt.registerTask("start_examples_server", function() {
    exampleServer(9888);
  });

  grunt.registerTask("examples", ["build", "start_examples_server", "watch:autobuild"]);
};
