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

  var exampleServer = require("./lib/example_server");
  var specServer = require("./lib/spec_server");

  grunt.initConfig({

    inline : inline,

    pkg: grunt.file.readJSON('package.json'),

    jasmine: {
      specs: {
        src: [
          "dist/es5/backdraft.js"
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
            "vendor/underscore-1.8.3.js",
            "vendor/backbone-1.1.2.js",
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
    var babel          = require("babel-core");
    var originalSource = inline("src/backdraft.js");

    try {
      let es5code = babel.transform(originalSource, {
        presets: [
          `es2016`,
          [`es2015`, { modules: false }]
        ]
      }).code;

      let uglifiedCode = babel.transform(es5code, {
        presets: ["minify"]
      }).code;

      grunt.file.write(`dist/es5/backdraft.js`,     es5code);
      grunt.file.write(`dist/es5/backdraft.min.js`, uglifiedCode);
      grunt.file.write(`dist/backdraft.js`,         originalSource);
    } catch(ex) {
      console.log(ex);
      throw new Error("Error building backdraft");
    }

  });

  grunt.registerTask("servers", function() {
    exampleServer(9888);
    specServer(9738);
  });

  grunt.registerTask("spec",   ["build", "jasmine:specs"]);
  grunt.registerTask("dev",    ["servers", "watch:autotest"]);
  grunt.registerTask("default", "dev");

};
