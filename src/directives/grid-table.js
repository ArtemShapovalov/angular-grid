angular.module('grid').directive("gridTable", tableDirective);
tableDirective.$inject = ['grid-entity', 'grid-actions'];
function tableDirective(gridEntity, gridActions) {
  var directive = {
      restrict: 'E',
      templateUrl: 'templates/grid/table.html',
      scope: {
        gridModel: '=gridModel'
      },
      controller: tableDirectiveCtrl,
      link: tableDirectiveLink
    };

  tableDirectiveCtrl.$inject = ['$scope'];
  return directive;

  function tableDirectiveCtrl($scope) {
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
  }

  function tableDirectiveLink(scope, element, attributes, controller) {

  }
}