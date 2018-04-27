const specFilesGlob = "spec/support/spec_bundle.js";

const clientOptions = {
  useIframe: false,
  runInParent: true
};

if (process.env.SPEC_FILTER) {
  clientOptions.args = ['--grep', process.env.SPEC_FILTER];
}

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      "vendor/json2.js",
      "vendor/jquery-1.10.2.js",
      "vendor/jquery-deparam.js",
      "node_modules/underscore/underscore.js",
      "node_modules/backbone/backbone.js",
      "vendor/mock-ajax.js",
      "vendor/bootstrap-3.1.1-dist/js/bootstrap.js",
      "vendor/jquery.dataTables-1.9.4.js",
      "vendor/jquery.dataTables.errorMode.js",
      specFilesGlob
    ],

    webpack: require('./webpack.config.js'),

    // Webpack each spec we run to resolve imports and transpile on the fly
    preprocessors: {
      [specFilesGlob]: ["webpack", "sourcemap"]
    },
    reporters: ["spec"],
    specReporter: {
      suppressPassed: true,
      suppressSkipped: false,
      showSpecTiming: true
    },

    port: 9876,
    colors: true,

    autoWatch: true,
    browsers: ['PhantomJS'],
    client: clientOptions,
    singleRun: false
  });
};
