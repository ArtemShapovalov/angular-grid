angular.module('grid').directive('tableThead', gridTheadDirective);

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

    $scope.$on('onBeforeLoadData', function() {
      console.log('sorting before load');
      setSortingBySearch($location.search());
    });

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

    $scope.sortBy = function(column) {
      var direction;

      column.sorting = direction = sorting.getDirectionColumn(column.sorting);
      $scope.tableInst.setSorting(column.attributeName, direction);
      $location.search('sort', $scope.tableInst.getSortingParamValue());

    };

    function setSortingBySearch(fields) {
      var sorting = $scope.tableInst.sorting;

      if (!fields[sorting.sortParam]) {
        return false;
      }
      var pos = fields[sorting.sortParam].lastIndexOf('_');
      var field = fields[sorting.sortParam].slice(0, pos);
      var direction = fields[sorting.sortParam].slice(pos + 1);

      sorting.setSorting(field, direction);
    }

  }
}