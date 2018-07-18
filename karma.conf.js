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
      specFilesGlob
    ],

    webpack: require('./webpack/test.js'),

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
