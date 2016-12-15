var express = require("express");
var path = require("path");

module.exports = function(port) {
  var repoRootPath = path.resolve(__dirname, "../");
  var redirectPath = path.relative(repoRootPath, "/.grunt/_SpecRunner.html");
  var app = express();

  app.use(express.static(repoRootPath));
  app.get("/", function(req, res) {
    res.redirect(redirectPath);
  });

  console.log("\nSpec Server running at:\n\n\thttp://localhost:" + port);
  app.listen(port);
}
