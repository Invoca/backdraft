module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-jasmine");
  grunt.loadNpmTasks("grunt-contrib-jst");
  grunt.loadNpmTasks("grunt-contrib-watch");

  // register delimeters other than the default erb ones so that we go into an infinite loop
  grunt.template.addDelimiters("inline", "{%", "%}");

  // helper function for inlining content based on non erb delims
  var inline = function(filePath) {
    var contents = grunt.file.read(filePath);
    return grunt.template.process(contents, { delimiters : "inline" });
  };

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
            "vendor/underscore-1.6.0.js",
            "vendor/backbone-1.1.2.js"
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
    }

  });

  grunt.registerTask("build", function() {
    grunt.file.write("dist/backdraft.js", inline("src/backdraft.js"));
  });

  grunt.registerTask("spec", [ "build", "jasmine:specs" ]);
  grunt.registerTask("dev", [ "watch:autotest" ]);

};