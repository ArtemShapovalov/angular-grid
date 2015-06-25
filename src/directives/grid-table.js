angular.module('grid').directive('gridTable', gridTableDirective);

gridTableDirective.$inject = ['gridTable', 'grid-actions'];

function gridTableDirective(gridTable, gridActions) {
  var directive = {
      restrict: 'E',
      controller: gridTableDirectiveCtrl
    };

  gridTableDirectiveCtrl.$inject = ['$timeout', '$scope'];

  return directive;

  function gridTableDirectiveCtrl($timeout, $scope) {
    /** @type {gridTable} */
    var tableInst = new gridTable($scope.gridModel);

    $scope.alerts = [];
    $scope.tableInst = tableInst;

    $timeout(function(){
      $scope.$broadcast('onBeforeLoadData');

      tableInst.getTableInfo(function(table) {
        $scope.rows = table.rows;
        $scope.columns = table.columns;
        $scope.links = table.links;

        $scope.$broadcast('onLoadData');
      });

    });

    $scope.edit = function(link) {
      gridActions.action(tableInst, link, $scope);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
  }
}