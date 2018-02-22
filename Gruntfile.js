module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-jasmine");
  grunt.loadNpmTasks("grunt-contrib-jst");
  grunt.loadNpmTasks("grunt-contrib-watch");

  var exampleServer = require("./lib/example_server");
  var specServer = require("./lib/spec_server");

  const webpackConfig = require('./webpack.config.js');

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    webpack: {
      options: {
        stats: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
      },

      dev: webpackConfig
    },

    jasmine: {
      specs: {
        src: [
          "dist/backdraft.js"
        ],
        options: {
          keepRunner: true,
          outfile: ".grunt/_SpecRunner.html",
          summary: true,
          display: process.env["GRUNT_QUIET"] === "true" ? 'none' : 'short',
          vendor : [
            "vendor/json2.js",
            "vendor/jquery-1.10.2.js",
            "vendor/jquery-deparam.js",
            "node_modules/underscore/underscore.js",
            "node_modules/backbone/backbone.js",
            "vendor/mock-ajax.js",
            "vendor/bootstrap-3.1.1-dist/js/bootstrap.js",
            "vendor/jquery.dataTables-1.9.4.js",
            "vendor/jquery.dataTables.errorMode.js"
          ],
          specs: [
            "spec/**/*.js"
          ]
        }
      }
    },

    watch : {
      autotest : {
        files : [ "src/**/*.js", "spec/**/*.js" ],
        tasks : [ "build", "jasmine:specs" ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask("servers", function() {
    exampleServer(9888);
    specServer(9738);
  });

  grunt.registerTask("build",  "webpack");
  grunt.registerTask("spec",   ["build", "jasmine:specs"]);
  grunt.registerTask("dev",    ["servers", "spec", "watch:autotest"]);
  grunt.registerTask("default", "dev");
};
