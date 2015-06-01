angular.module('grid').directive('vmsGrid', vmsGridDirective);

function vmsGridDirective() {
  var directive = {
    restrict: 'E',
    template: '<ng-include src="getTemplateUrl()" />',
    scope: {
      gridModel: '=gridModel'
    },
    controller: vmsGridDirectiveCtrl,
    link: function(scope, el, attr, ctrl) {

    }
  };

  vmsGridDirectiveCtrl.$inject = ['$scope', 'grid-entity'];

  return directive;

  function vmsGridDirectiveCtrl($scope, gridEntity) {
    $scope.getTemplateUrl = function() {
      if ($scope.gridModel.params.type) {
        return 'templates/grid/form.html';
      }
      return 'templates/grid/table.html';
    };

    gridEntity.setModel($scope.gridModel);
  }
}