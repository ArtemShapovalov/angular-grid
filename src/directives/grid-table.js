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
            '<th ' +
              'ng-repeat="column in columns"' +
              'ng-class="{ \'sortable\': column.sortable(this), \'sort-asc\': params.sorting()[column.sortable(this)]==\'asc\', \'sort-desc\': params.sorting()[column.sortable(this)]==\'desc\' }"'+
              'ng-click="sortBy(column, $event)">{{column.title}}</th>'+
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
    '</grid-table>'+
    '<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>'
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

    pagination.setCurrentPage($location.search().page);

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
  }
}