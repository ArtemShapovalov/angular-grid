angular.module('grid').factory('grid-action-delete', gridActionDelete);
gridActionDelete.$inject = ['$http', 'grid-entity'];
function gridActionDelete($http, gridEntity) {
  return function(obj, link, scope) {
    var params = {
      method: link.method,
      url: link.href
    };

    $http(params).then(actionDeleteSuccess, actionDeleteError);

    function actionDeleteSuccess() {
      if (obj.type === obj.TYPE_TABLE) {
        obj.getTableInfo(function (table) {
          scope.rows = table.rows;
          scope.columns = table.columns;
          scope.links = table.links;
        });
      } else if (obj.type === obj.TYPE_FORM) {
        scope.hideForm = true;
      }

      scope.alerts.push({
        type: 'success',
        msg: obj.getMessage('successDeleted')
      });

    }

    function actionDeleteError(res) {
      scope.alerts.push({
        type: 'danger',
        msg: res.statusText || obj.getMessage('serverError')
      });
    }
  };
}