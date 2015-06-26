angular.module('grid').factory('grid-action-delete', gridActionDelete);
gridActionDelete.$inject = ['$http', 'gridTable', 'gridForm'];
function gridActionDelete($http, gridTable, gridForm) {
  return function(obj, link, scope) {
    var params = {
      method: link.method,
      url: link.href
    };

    $http(params).then(actionDeleteSuccess, actionDeleteError);

    function actionDeleteSuccess() {
      if (obj instanceof gridTable) {
        obj.getTableInfo(function(table) {
          scope.rows = table.rows;
          scope.columns = table.columns;
          scope.links = table.links;
        });
      } else if (obj instanceof gridForm) {
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