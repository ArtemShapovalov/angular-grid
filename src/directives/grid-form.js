angular.module('grid').directive('gridForm', gridFormDirective);

function gridFormDirective() {
  var directive = {
    restrict: 'E',
    replace: true,
    controller: gridFormDirectiveCtrl
  };

  gridFormDirectiveCtrl.$inject = ['$scope', 'grid-entity', 'grid-actions'];

  return directive;

  function gridFormDirectiveCtrl($scope, gridEntity, gridActions) {
    $scope.alerts = [];

    $scope.scopeForm = {
      gridForm: {}
    };

    $scope.setFormScope= function(scope){
      $scope.scopeForm = scope;
    };

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
