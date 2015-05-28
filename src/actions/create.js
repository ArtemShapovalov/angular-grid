angular.module('grid').factory('grid-action-create', gridActionCreate);
gridActionCreate.$inject = ['$http', 'grid-entity'];
function gridActionCreate($http, gridEntity) {
  return function(link, scope) {
    var params = {
      method: link.method,
      url: link.href,
      data: scope.model
    };

    scope.$broadcast('schemaFormValidate');
    if (!scope.scopeForm.gridForm.$valid) {
      return false;
    }

    $http(params).then(actionCreateSuccess, actionCreateError);

    function actionCreateSuccess() {
      gridEntity.getFormInfo(function (form) {
        scope.schema = form.schema;
        scope.form = form.form;
        scope.model = form.model;

        scope.alerts.push({
          type: 'success',
          msg: gridEntity.getMessage('successCreated')
        });
      });
    }

    function actionCreateError(res) {
      scope.alerts.push({
        type: 'danger',
        msg: res.statusText || gridEntity.getMessage('serverError')
      });
    }

  };
}