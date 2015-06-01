/*!
 * VmsGrid v0.1.1 (https://github.com/VertaMedia/angular-grid)
 * Copyright 2015 VertaMedia, Inc.
 * Licensed under MIT (https://github.com/VertaMedia/angular-grid/master/LICENSE)
 */

var deps = [];
try {
  angular.module('schemaForm');
  deps.push('schemaForm');
} catch (e) {}

try {
  angular.module('ui.bootstrap');
  deps.push('ui.bootstrap');
} catch (e) {}

var vmsGrid = angular.module('grid', deps);