angular.module('grid').directive('gridThead', gridTheadDirective);

gridTheadDirective.$inject = [];

function gridTheadDirective() {
  var directive = {
      scope: {
        tableInst: '=table'
      },
      require: '^gridTable',
      templateUrl: 'templates/grid/table-head.html',
      restrict: 'A',
      controller: gridTheadCtrl,
      link: function (scope, element, attr) {
        //console.log(attr);
      }
  };

  gridTheadCtrl.$inject = ['$scope', '$location'];

  return directive;

  function gridTheadCtrl($scope, $location) {

    /** @type {Sorting} */
    var sorting = $scope.tableInst.sorting;

    $scope.$on('onLoadData', function() {
      $scope.columns = $scope.tableInst.columns;
      $scope.sortFields = sorting.sortFields;
      $scope.setSorting();
    });

    $scope.setSorting = function() {
      var field = sorting.getColumn();

      if (field) {
        _.where(this.columns, {'attributeName': field})[0].sorting = sorting.direction;
      }
    };

    $scope.sortBy = function(column, event) {

      column.sorting = sorting.getDirectionColumn(column.sorting);

      $scope.tableInst.setSorting(column.attributeName, column.sorting);

      var field = $scope.tableInst.getSortingParamByField(column.attributeName);

      if (column.sorting) {
        $location.search('sort', field +'_'+ column.sorting);
      } else {
        $location.search('sort', null);
      }

    };

  }
}