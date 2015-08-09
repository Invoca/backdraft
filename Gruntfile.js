module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-jasmine");
  grunt.loadNpmTasks("grunt-contrib-jst");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-docco");

  // register delimeters other than the default erb ones so that we go into an infinite loop
  grunt.template.addDelimiters("inline", "{%", "%}");

  // helper function for inlining content based on non erb delims
  var inline = function(filePath) {
    var contents = grunt.file.read(filePath);
    return grunt.template.process(contents, { delimiters : "inline" });
  };

  var exampleServer = require("./lib/example_server");

  grunt.initConfig({

    inline : inline,

    pkg: grunt.file.readJSON('package.json'),

    jasmine : {
      specs : {
        src : [
          "dist/backdraft.js"
        ],
        options : {
          keepRunner : true,
          outfile : ".grunt/_SpecRunner.html",
          vendor : [
            "vendor/json2.js",
            "vendor/jquery-1.10.2.js",
            "vendor/underscore-1.8.3.js",
            "vendor/backbone-1.1.2.js",
            "vendor/jquery.dataTables-1.9.4.js",
            "vendor/mock-ajax.js"
          ],
          specs : [
            "spec/**/*.js"
          ]
        }
      }
    },

    watch : {
      src : {
        files : [ "src/**/*.js" ],
        tasks : [ "build" ]
      },
      autotest : {
        files : [ "src/**/*.js", "spec/**/*.js" ],
        tasks : [ "build", "jasmine:specs" ]
      }
    },

    docco: {
      docs: {
        src: ["dist/backdraft.js"],
        options: {
          output: 'docs/'
        }
      }
    }

  });

  grunt.registerTask("build", function() {
    grunt.file.write("dist/backdraft.js", inline("src/backdraft.js"));
  });

  grunt.registerTask("servers", function() {
    exampleServer(9873);
  });

  grunt.registerTask("spec", [ "build", "jasmine:specs" ]);
  grunt.registerTask("dev", [ "servers", "watch:autotest" ]);
  grunt.registerTask("default", "dev");

};
