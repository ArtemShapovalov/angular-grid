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
      .when('/users', {
        title: 'Users',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      })
      .when('/users/:action', {
        title: 'User form',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      })
      .when('/users/:action/:id', {
        title: 'User form',
        templateUrl: '/views/test.html',
        controller: 'TestCtrl'
      });
  }
]);

app.controller('TestCtrl', mainController);

mainController.$inject = ['$scope', '$routeParams', 'userGrid'];
function mainController($scope, $routeParams, UserGrid) {
  UserGrid.params = {
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
    url: 'http://private-f4056-jsonschema.apiary-mock.com/jsonary/users',
    /**
     * {
       *    id:   undefined|string
       *    type: create|update
       * }
     */
    params: {}
  };
}