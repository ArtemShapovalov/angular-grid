angular.module('grid').run(['$templateCache', function ($templateCache) {
  $templateCache.put('templates/grid/table.html',
    '<grid-table>' +
    '<span ng-repeat="link in links">' +
    '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
    '</span>'+
    '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>'+
    '<table class="table grid">'+
    '<thead>'+
    '<tr>'+
    '<th ng-repeat="column in columns">{{column.title}}</th>'+
    '</tr>'+
    '</thead>'+
    '<tbody>'+
    '<tr ng-repeat="row in rows">'+
    '<td ng-repeat="column in columns">'+
    '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>'+
    '<span ng-if="column.attributeName == \'links\'">'+
    '<span ng-repeat="link in row.links">' +
    '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
    '</span>'+
    '</span>'+
    '</td>'+
    '</tr>'+
    '</tbody>'+
    '</table>' +
    '</grid-table>'
  );
}]);

angular.module('grid').directive('gridTable', gridTableDirective);

gridTableDirective.$inject = ['grid-entity', 'gridTable', 'grid-actions'];

//TODO: should be set require ... depends on vmsGrid
function gridTableDirective(gridEntity, gridTable, gridActions) {
  var directive = {
      restrict: 'E',
      controller: gridTableDirectiveCtrl
    };

  gridTableDirectiveCtrl.$inject = ['$scope'];

  return directive;

  function gridTableDirectiveCtrl($scope) {
    $scope.alerts = [];

    var tableInst = new gridTable();

    tableInst.getTableInfo(function(table) {
      $scope.rows = table.rows;
      $scope.columns = table.columns;
      $scope.links = table.links;
      //$scope.$digest();
    });

    $scope.edit = function(link) {
      gridActions.action(tableInst, link, $scope);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
  }
}