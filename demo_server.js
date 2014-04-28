var express = require("express");
var morgan = require('morgan');

var app = express();

var data = [];


for (var iter = 0; iter < 100; ++iter) {
  data.push({ name : iter + 1 + " - hey hey " + (iter + 1) });
}

app.use(morgan('dev'));
app.use(express.static(__dirname));

app.get("/data", function(req, res) {
  console.log(req.query);
  var startIndex = parseInt(req.param("iDisplayStart"), 10);
  var displayLength = parseInt(req.param("iDisplayLength"), 10);
  var endIndex = startIndex + displayLength;

  setTimeout(function() {
    var response = {
      sEcho : req.param("sEcho"),
      iTotalRecords : data.length,
      iTotalDisplayRecords : data.length,
      aaData : data.slice(startIndex, endIndex)
    };

    console.log(response);
    res.send(response);
  }, 4000)

});

console.log("http://localhost:10010");
app.listen(10010);


// server needs to return
// sEcho - just echo back
// "iTotalRecords": "57" - total # of records completely
//  "iTotalDisplayRecords": "1" - number of records returned that matched filter - not sure if we need to do this

// clearTable is useless for serverside
// http://82.113.152.82/forums/discussion/19949/fncleartable-does-not-clear-the-table/p1