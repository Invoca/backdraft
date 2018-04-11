var express = require("express");
var morgan = require('morgan');
var serveIndex = require('serve-index');
var data = [];

// fake data
for (var iter = 0; iter < 100; ++iter) {
  data.push({
    name: "Jane Doe " + (iter + 1),
    address: iter + " Chapala St",
    income: (iter % 5) * 57300,
    children: iter % 4
  });
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
    var startIndex = parseInt(req.param("iDisplayStart"), 10);
    var displayLength = parseInt(req.param("iDisplayLength"), 10);
    var endIndex = startIndex + displayLength;
    // be sure to get a copy and not modify the "global" data
    var localData = data.slice();

    if (req.param("iSortCol_0") === "1") {
      if (req.param("sSortDir_0") === "desc") {
        localData.reverse();
      }
    }

    var response = {
      sEcho: req.param("sEcho"),
      iTotalRecords: data.length,
      iTotalDisplayRecords: data.length,
      aaData: localData.slice(startIndex, endIndex),
    };

    if (req.param("total") === "1") {
      response.total =  { name: null, address: null, income: 11460000, children: 150 };
    }

    console.log("response", response);
    res.send(response);

  });

  console.log("Examples running at:\n\n\thttp://localhost:" + port);
  app.listen(port);
};
