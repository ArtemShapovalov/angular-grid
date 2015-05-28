angular.module('grid').directive('gridForm', crudDirective);
crudDirective.$inject = [];
function crudDirective() {
  var directive = {
    restrict: 'EA',
    scope: {
      gridModel: '=gridModel'
    },
    replace: true,
    templateUrl: 'templates/grid/form.html',
    controller: crudDirectiveController
  };

  crudDirectiveController.$inject = ['$scope', 'grid-entity', 'grid-actions'];
  return directive;

  function crudDirectiveController($scope, gridEntity, gridActions) {
    $scope.alerts = [];
    $scope.scopeForm = {
      gridForm: {}
    };

    $scope.setFormScope= function(scope){
      $scope.scopeForm = scope;
    };

    gridEntity.setModel($scope.gridModel);
    gridEntity.getFormInfo(function (form) {
      $scope.schema = form.schema;
      $scope.form = form.form;
      $scope.model = form.model;
      $scope.links = form.links;
      $scope.$digest();
    });

    $scope.edit = function($event, form) {
      gridActions.action(form.link, $scope);
    };

    $scope.go = function(link) {
      gridActions.action(link, $scope);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
  }
}
