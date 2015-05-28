angular.module('grid').directive("gridTable", ['$timeout', 'grid-entity', 'grid-actions', function($timeout, gridEntity, gridActions) {
  return {
    restrict: 'E',
    templateUrl: 'templates/grid/table.html',
    scope: {
      gridModel: '=gridModel'
    },
    controller: function($scope) {
      $scope.alerts = [];
      gridEntity.setModel($scope.gridModel);

      gridEntity.getTableInfo(function(table) {
        $scope.rows = table.rows;
        $scope.columns = table.columns;
        $scope.links = table.links;
        $scope.$digest();
      });

      $scope.edit = function(link) {
        gridActions.action(link, $scope);
      };

      $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
      };
    },
    link: function(scope, element, attributes, controller) {
    }
  };
}]);