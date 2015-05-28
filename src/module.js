// Deps is sort of a problem for us, maybe in the future we will ask the user to depend
// on modules for add-ons

var deps = [];
try {
  //This throws an expection if module does not exist.
  angular.module('schemaForm');
  deps.push('schemaForm');
} catch (e) {}

try {
  //This throws an expection if module does not exist.
  angular.module('ui.bootstrap.tpls');
  deps.push('ui.bootstrap.tpls');
} catch (e) {}

var vmsGrid = angular.module('grid', deps);