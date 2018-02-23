const exampleServer = require("./lib/example_server");

module.exports = function(grunt) {
  const webpackConfig = require('./webpack.config.js');

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    webpack: {
      options: {
        stats: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
      },

      dev: webpackConfig
    },

    watch : {
      autotest : {
        files : [ "src/**/*.js" ],
        tasks : [ "build" ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-webpack');
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("build",  "webpack");

  grunt.registerTask("start_examples_server", function() {
    exampleServer(9888);
  });

  grunt.registerTask("examples", ["start_examples_server", "watch:autotest"]);
};
