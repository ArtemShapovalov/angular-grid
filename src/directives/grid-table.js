angular.module('grid').directive('gridTable', gridTableDirective);

gridTableDirective.$inject = ['grid-entity', 'grid-actions'];

//TODO: should be set require ... depends on vmsGrid
function gridTableDirective(gridEntity, gridActions) {
  var directive = {
      restrict: 'E',
      controller: gridTableDirectiveCtrl
    };

  gridTableDirectiveCtrl.$inject = ['$scope'];

  return directive;

  function gridTableDirectiveCtrl($scope) {
    $scope.alerts = [];

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
  }
}