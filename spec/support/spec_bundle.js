// require.context is a Webpack expansion. The last argument is a regex
// that Webpack statically evaluates to discover files. These files are delivered
// in a new module built during bundling. See the following example for details:
// https://github.com/webpack/webpack/blob/e3202900e5aaed13ed9c265c5feba349dd9a6a0a/examples/require.context/README.md
// eslint-disable-next-line no-undef
const context = require.context('../', true, SPEC_FILE_FILTER);

const targetedFiles = context.keys();

targetedFiles.forEach((file) => {
  // eslint-disable-next-line no-undef
  if (DEFAULT_SPEC_FILE_FILTER.toString() !== SPEC_FILE_FILTER.toString()) {
    console.info(`Reading tests from: ${file}`);
  }
  context(file);
});
