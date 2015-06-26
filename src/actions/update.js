angular.module('grid').factory('grid-action-update', gridActionUpdate);
gridActionUpdate.$inject = ['$http', 'grid-entity'];
function gridActionUpdate($http, gridEntity) {
  return function(obj, link, scope) {
    var params = {
      method: link.method,
      url: link.href,
      data: scope.model
    };

    scope.$broadcast('schemaFormValidate');
    if (!scope.scopeForm.gridForm.$valid) {
      return false;
    }

    $http(params).then(actionUpdateSuccess, actionUpdateError);

    function actionUpdateSuccess() {
      obj.getFormInfo(function(form) {
        scope.schema = form.schema;
        scope.form = form.form;
        scope.model = form.model;
        scope.alerts.push({
          type: 'success',
          msg: obj.getMessage('successUpdated')
        });
      });
    }

    function actionUpdateError(res) {
      scope.alerts.push({
        type: 'danger',
        msg: res.statusText || obj.getMessage('serverError')
      });
    }

  };
}