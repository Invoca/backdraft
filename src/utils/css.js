// create a valid CSS class name based on input
Backdraft.Utils.toCSSClass = function(input) {
  var cssClass = /[^a-zA-Z_0-9\-]/g;
  return input.replace(cssClass, "-").toLowerCase();
};

// create a data tables column CSS class name based on input
Backdraft.Utils.toColumnCSSClass = function(input) {
  return "column-" + Backdraft.Utils.toCSSClass(input);
};

// extract the column CSS class from a list of classes, returns undefined if not found
Backdraft.Utils.extractColumnCSSClass = function(classNames) {
  var matches = classNames.match(/(?:^|\s)column-(?:[^\s]+)/);
  if (matches && matches[0]) {
    return matches[0].trim();
  } else {
    return undefined;
  }
};
