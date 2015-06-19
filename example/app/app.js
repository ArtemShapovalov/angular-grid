var app = angular.module('test', [
  'ngRoute',
  'grid'
]);

app.config([
  '$routeProvider', '$locationProvider',
  function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });

    $routeProvider
      .when('/grid/:resource', {
        title: 'Users',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      })
      .when('/grid/:resource/:action', {
        title: 'User form',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      })
      .when('/grid/:resource/:action/:id', {
        title: 'User form',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      });

    $locationProvider.html5Mode(true);
  }
]);

app.controller('TestCtrl', mainController);

mainController.$inject = ['$scope', '$routeParams', 'userGrid'];
function mainController($scope, $routeParams, UserGrid) {
  UserGrid.params = {
    'resource': $routeParams.resource,
    'id': $routeParams.id,
    'type': $routeParams.action
  };
  $scope.userGrid = UserGrid;
}

app.factory('userGrid', userSrv);
userSrv.$inject = [];
function userSrv() {
  return {
    /**
     * create - SCHEMA -> jsonary/users/schema#/definitions/create
     * list   - DATA   -> jsonary/users
     * update - DATA   -> jsonary/users/:id
     * read   - DATA   -> jsonary/users/:id
     */
    url: 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary',
    /**
     * {
       *    id:   undefined|string
       *    type: create|update
       * }
     */
    params: {}
  };
}