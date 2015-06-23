angular.module('grid').directive('gridTable', gridTableDirective);

gridTableDirective.$inject = ['grid-entity', 'gridTable', 'grid-actions'];

//TODO: should be set require ...  depends on vmsGrid
function gridTableDirective(gridEntity, gridTable, gridActions) {
  var directive = {
      restrict: 'E',
      controller: gridTableDirectiveCtrl
    };

  gridTableDirectiveCtrl.$inject = ['$scope', '$location'];

  return directive;

  function gridTableDirectiveCtrl($scope, $location) {
    $scope.alerts = [];

    /**
     * @type {gridTable}
     */
    var tableInst = new gridTable();
    /**
     * @type {gridPagination}
     */
    var pagination = tableInst.pagination;

    $scope.tableInst = tableInst;

    pagination.setCurrentPage($location.search().page);
    setSortingBySearch($location.search());

    tableInst.getTableInfo(function(table) {
      $scope.setPagination();

      $scope.rows = table.rows;
      $scope.columns = table.columns;
      $scope.links = table.links;
    });

    $scope.edit = function(link) {
      gridActions.action(tableInst, link, $scope);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

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

    function setSortingBySearch(fields) {
      var sorting = tableInst.sorting;

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