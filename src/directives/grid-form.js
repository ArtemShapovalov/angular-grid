angular.module('grid').run(['$templateCache', function ($templateCache) {
  $templateCache.put('templates/grid/form.html',
    '<grid-form>' +
    '<span ng-repeat="link in links">' +
    '<a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a> ' +
    '</span>'+
    '<div>' +
    '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>'+
    '</div>' +
    '<form novalidate name="gridForm" ng-init="setFormScope(this)"' +
    'sf-schema="schema" sf-form="form" sf-model="model"' +
    'class="form-horizontal" role="form" ng-if="hideForm !== true">'+
    '</form>'+
    '</grid-form>'
  );
}]);

angular.module('grid').directive('gridForm', gridFormDirective);

//TODO: should be set require ... depends on vmsGrid
function gridFormDirective() {
  var directive = {
    restrict: 'E',
    replace: true,
    controller: gridFormDirectiveCtrl
  };

  gridFormDirectiveCtrl.$inject = ['$scope', 'grid-entity', 'gridForm', 'grid-actions'];

  return directive;

  function gridFormDirectiveCtrl($scope, gridEntity, gridForm, gridActions) {
    $scope.alerts = [];

    $scope.scopeForm = {
      gridForm: {}
    };

    $scope.setFormScope= function(scope){
      $scope.scopeForm = scope;
    };


    var formInst = new gridForm();

    formInst.getFormInfo(function (form) {
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
