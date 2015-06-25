angular.module('grid').directive('tablePagination', tablePaginationDirective);

tablePaginationDirective.$inject = [];

function tablePaginationDirective() {
  var directive = {
      scope: {
        tableInst: '=table'
      },
      require: '^gridTable',
      templateUrl: 'templates/grid/table-pagination.html',
      restrict: 'A',
      controller: tablePaginationCtrl
  };

  tablePaginationCtrl.$inject = ['$scope', '$location'];

  return directive;

  function tablePaginationCtrl($scope, $location) {

    /** @type {gridPagination} */
    var pagination = $scope.tableInst.pagination;

    $scope.$on('onBeforeLoadData', function() {
      pagination.setCurrentPage($location.search().page);
    });

    $scope.$on('onLoadData', function() {
      $scope.show = true;
      $scope.setPagination();
    });

    $scope.setPagination = function() {
      $scope.totalItems = pagination.getTotalCount();
      $scope.currentPage = pagination.getCurrentPage();
      $scope.itemsPerPage = pagination.getPerPage();
    };

    $scope.pageChanged = function(pageNo) {
      pagination.setCurrentPage(pageNo);
      $scope.currentPage = pagination.getCurrentPage();
      $location.search('page', pageNo);
    };

  }
}