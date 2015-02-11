// create a valid CSS class name based on input
Backdraft.Utils.toCSSClass = (function() {
  var cssClass = /[^a-zA-Z_0-9\-]/g;
  return function(input) {
    return input.replace(cssClass, "-");
  };
})();