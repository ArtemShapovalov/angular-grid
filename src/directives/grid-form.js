angular.module('grid').directive('gridForm', gridFormDirective);

//TODO: should be set require ... depends on vmsGrid
function gridFormDirective() {
  var directive = {
    restrict: 'E',
    replace: true,
    controller: gridFormDirectiveCtrl
  };

  gridFormDirectiveCtrl.$inject = ['$scope', 'gridForm', 'grid-actions'];

  return directive;

  function gridFormDirectiveCtrl($scope, gridForm, gridActions) {
    $scope.alerts = [];

    $scope.scopeForm = {
      gridForm: {}
    };

    $scope.setFormScope = function(scope) {
      $scope.scopeForm = scope;
    };

    var formInst = new gridForm($scope.gridModel);

    formInst.getFormInfo(function(form) {
      $scope.schema = form.schema;
      $scope.form = form.form;
      $scope.model = form.model;
      $scope.links = form.links;
      $scope.$digest();
    });

    $scope.edit = function($event, form) {
      gridActions.action(formInst, form.link, $scope);
    };

    $scope.go = function(link) {
      gridActions.action(formInst, link, $scope);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
  }
}
