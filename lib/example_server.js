var express = require("express");
var morgan = require('morgan');
var serveIndex = require('serve-index');
var data = [];

// fake data
for (var iter = 0; iter < 100; ++iter) {
  data.push({ name : "Jane Doe " + (iter + 1) });
}

module.exports = function(port) {
  var app = express();
  app.use(morgan('dev'));
  app.use(express.static(__dirname + "/../examples_server"));
  app.use(express.static(__dirname + "/../"));
  app.use("/examples", serveIndex('examples_server/examples', { stylesheet: 'examples_server/css/index.css', icons: true }));
  app.get("/", function(req, res) {
    res.redirect("/examples");
  });
  app.get("/server_side_data", function(req, res) {
    console.log("query", req.query);
    var startIndex = parseInt(req.param("start"), 10);
    var displayLength = parseInt(req.param("length"), 10);
    var endIndex = startIndex + displayLength;
    // be sure to get a copy and not modify the "global" data
    var localData = data.slice();
    var order = req.param("order")[0];

    if (order.column === "1" && order.dir === "desc") {
      localData.reverse();
    }

    var response = {
      draw : req.param("draw"),
      recordsTotal : data.length,
      recordsFiltered : data.length,
      data : localData.slice(startIndex, endIndex)
    };

    console.log("response", response);
    res.send(response);

  });

  console.log("Examples running at:\n\n\thttp://localhost:" + port);
  app.listen(port);
}
