(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['angular', 'jsonary', 'angular-bootstrap', 'bootstrap-decorator', 'lodash'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('angular'), require('Jsonary'), require('angularBootstrap'), require('bootstrapDecorator'), require('lodash'));
  } else {
    root.grid = factory(root.angular, root.Jsonary, root.angularBootstrap, root.bootstrapDecorator, root.lodash);
  }
}(this, function(angular, Jsonary, angularBootstrap, bootstrapDecorator, lodash) {

  var module = angular.module('grid', ['schemaForm', 'ui.bootstrap.tpls']);

  module.run(['$templateCache', function ($templateCache) {

    $templateCache.put('templates/grid/table.html',
      '<span ng-repeat="link in links">' +
        '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
      '</span>'+
      '<div>' +
        '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>'+
      '</div>' +
      '<table class="table grid">'+
        '<thead>'+
          '<tr>'+
            '<th ng-repeat="column in columns">{{column.title}}</th>'+
          '</tr>'+
        '</thead>'+
        '<tbody>'+
          '<tr ng-repeat="row in rows">'+
            '<td ng-repeat="column in columns">'+
              '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>'+
              '<span ng-if="column.attributeName == \'links\'">'+
                '<span ng-repeat="link in row.links">' +
                  '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
                '</span>'+
              '</span>'+
            '</td>'+
          '</tr>'+
        '</tbody>'+
      '</table>'
    );

    $templateCache.put('templates/grid/form.html',
    '<div>' +
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
    '</div>'
    );

  }]);

  module.factory('_', function () {
    return lodash;
  });

  module.provider('grid-entity', gridEntity);

  gridEntity.$inject = [];

  function gridEntity(_) {
    var data,
        schema;

    var provider = {
      $get: gridEntityGet
    };

    gridEntityGet.$inject = ['$timeout', '_'];

    return provider;

    function gridEntityGet($timeout, _) {
      var model,
          messages = {
            successDeleted: 'You successfully delete this resource',
            successCreated: 'You successfully create new resource',
            successUpdated: 'You successfully update this resource',
            serverError: 'Oops! server error'
          };

      return {
        TYPE_FORM: 'form',
        TYPE_TABLE: 'table',
        type: '',
        config: {},
        setData: setData,
        setModel: setModel,
        getModel: getModel,
        setSchema: setSchema,
        getMessage: getMessage,
        setMessage: setMessage,
        fetchData: fetchData,
        fetchSchema: fetchSchema,
        getTableInfo: getTableInfo,
        getFormInfo: getFormInfo
      };

      function setData(value) {
        data = value;
      }

      function setSchema(value) {
        schema = value;
      }

      function setModel(Model) {
        model = Model;
      }

      function getModel() {
        return model;
      }

      function getMessage(param) {
        return messages[param];
      }

      function setMessage(param, message) {
        messages[param] = message;
      }

      function fetchData(url, callback) {
        /*jshint validthis: true */
        var self = this;

        if (model === undefined) {
          alert('Please set model before call fetch data');
          return false;
        }

        Jsonary.getData(url, function (jData) {
          var data = jData;
          var schema = jData.property('data').schemas()[0].data.document.raw.value();

          self.setData(data);
          self.setSchema(schema);

          if (callback !== undefined) {
            callback(data, schema);
          }

        });

      }

      function fetchSchema(url, callback) {
        /*jshint validthis: true */
        var self = this;

        Jsonary.getSchema(url, function (jSchema) {

          var schema = jSchema.data.document.raw.value();
          var data = Jsonary.create(getEmptyData(jSchema.data.value(), schema));
          data.document.url = self.getModel().url;

          data.addSchema(jSchema);

          self.setData(data);
          self.setSchema(schema);

          if (callback !== undefined) {
            callback(data, schema);
          }

        });
      }

      function getEmptyData(schema, fullSchema) {
        var result;
        var schemaWithoutRef = mergeRelSchema(schema, fullSchema);

        result = _.clone(schemaWithoutRef.properties);
        result.data = getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties));
        result.data.attributes = getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties.attributes.properties));

        function getTypeProperty(obj) {
          var tmpObj = obj;
          _.forEach(tmpObj, function(value, key) {
            if (value.type) {
              switch(value.type) {
                case 'object':
                  tmpObj[key] = {};
                  break;
                case 'string':
                  tmpObj[key] = '';
                  break;
                case 'array':
                  tmpObj[key] = [];
                  break;
                case 'integer':
                  tmpObj[key] = '';
                  break;
              }
            }
          });
          return tmpObj;
        }
        return result;
      }

      function getTableInfo(callback) {
        /*jshint validthis: true */
        var self = this;
        var model = self.getModel();

        $timeout(function() {
          self.fetchData(model.url, fetchDataSuccess);
        });

        function fetchDataSuccess(data, schema) {

          var schemaWithoutRef = mergeRelSchema(data.schemas()[0].data.value(), schema);

            self.type = self.TYPE_TABLE;
            if (!self.config.table) {
              self.config.table = {};
            }

            self.config.table.rows = rowsToTableFormat(getRowsByData(data));
            self.config.table.links = data.links();
            self.config.table.columns = getColumnsBySchema(schemaWithoutRef);
            self.config.table.columns.push({
              title: 'Actions',
              type: 'string',
              attributeName: 'links'
            });

            if (callback !== undefined) {
              callback(self.config.table);
            }
        }

      }

      /**
       *
       * @param callback
       */
      function getFormInfo(callback) {
        /*jshint validthis: true */
        var self = this;
        var model = self.getModel();
        var url = model.url;

        if (model.params.type === 'update' || model.params.type === 'read') {
          url = model.url + '/' + model.params.type + '/' + model.params.id;

          $timeout(function() {
            self.fetchData(url, fetchDataSuccess);
          });
        } else if (model.params.type === 'create') {
          url = model.url + '/schema#/definitions/create';

          $timeout(function() {
            self.fetchSchema(url, fetchDataSuccess);
          });
        }

        function fetchDataSuccess(data, schema) {
          var newData = data.property('data').property('attributes');
          var schemaWithoutRef = mergeRelSchema(newData.schemas()[0].data.value(), schema);

          self.type = self.TYPE_FORM;
          if (!self.config.form) {
            self.config.form = {};
          }

          self.config.form.links = data.links();
          self.config.form.schema = schemaWithoutRef;
          self.config.form.model = newData.value();
          self.config.form.form = [
            '*'
          ];
          /** add button to config form */
          self.config.form.form =  _.union(self.config.form.form, getFormButtonBySchema(data.property('data').links()));


          if (callback !== undefined) {
            callback(self.config.form);
          }
        }

      }

      /**
       * Recursive function replacing $ref from schema
       * @param haystack
       * @param schemaFull
       * @returns {*}
       */
      function replaceFromFull(haystack, schemaFull) {
        for (var key in haystack) {
          if (haystack.hasOwnProperty(key)) {
            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && haystack[key].$ref) {
              haystack[key] = Object.byString(schemaFull, haystack[key].$ref.substring(2));
              replaceFromFull(haystack[key], schemaFull);
            }
            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && (haystack[key] !== 'links')) {
              replaceFromFull(haystack[key], schemaFull);
            }
          }
        }
        return haystack;
      }

      /**
       * Convert schema with $ref link to schema without $ref
       * @param schema
       * @param schemaFull
       * @returns {*}
       */
      function mergeRelSchema(schema, schemaFull) {
        var schemaWithoutRef = schema;

        schemaWithoutRef = replaceFromFull(schemaWithoutRef, schemaFull);

        return schemaWithoutRef;
      }

      /**
       * Get Columns info by schema
       *
       * @param schemaWithoutRef
       * @returns {Array}
       */
      function getColumnsBySchema(schemaWithoutRef) {
        var columns = schemaWithoutRef.properties.data.items.properties.attributes.properties;

        var result = [];
        _.forEach(columns, function(value, key) {
          value.attributeName = key;
          result.push(value);
        });
        return result;
      }

      /**
       * Convert array Jsonary Data to result array for rendering table
       *
       * @param rows
       * @returns {Array}
       */
      function rowsToTableFormat(rows) {
        var result = [];
        rows.forEach(function(data) {
          var tmp = data.property('attributes').value();
          tmp.links = [];
          _.forOwn(data.links(), function(link) {
            tmp.links.push(link);
          });
          result.push(tmp);
        });
        return result;
      }

      /**
       * Get array rows by Jsonary Data
       *
       * @param data Jsonary
       * @returns {Array}
       */
      function getRowsByData(data) {
        var rows = [];
        data.property('data').items(function(index, value) {
          rows.push(value);
        });

        return rows;
      }

      function getFormButtonBySchema(links) {
        var result = [];
        _.forEach(links, function(value) {
          result.push({
            type: 'button',
            title: value.title,
            link: value,
            onClick: 'edit($event, form)'
          });
        });
        return result;
      }

    }
  }

  module.factory('grid-action-goTo', gridActionGoTo);
  gridActionGoTo.$inject = ['$location'];
  function gridActionGoTo($location) {
    return function(link) {
      var templateLink = link.definition.data.propertyValue('href');
      var resultLink = templateLink.replace(/{([^\{,}]*)}/g, function(match, p1){
        return link.subjectData.propertyValue(p1);
      });

      $location.url(resultLink);
    };
  }

  module.factory('grid-action-delete', gridActionDelete);
  gridActionDelete.$inject = ['$http', 'grid-entity'];
  function gridActionDelete($http, gridEntity) {
    return function(link, scope) {
      var params = {
        method: link.method,
        url: link.href
      };

      $http(params).then(actionDeleteSuccess, actionDeleteError);

      function actionDeleteSuccess() {
        if (gridEntity.type === gridEntity.TYPE_TABLE) {
          gridEntity.getTableInfo(function (table) {
            scope.rows = table.rows;
            scope.columns = table.columns;
            scope.links = table.links;
          });
        } else if (gridEntity.type === gridEntity.TYPE_FORM) {
          scope.hideForm = true;
        }

        scope.alerts.push({
          type: 'success',
          msg: gridEntity.getMessage('successDeleted')
        });

      }

      function actionDeleteError(res) {
        scope.alerts.push({
          type: 'danger',
          msg: res.statusText || gridEntity.getMessage('serverError')
        });
      }
    };
  }

  module.factory('grid-action-update', gridActionUpdate);
  gridActionUpdate.$inject = ['$http', 'grid-entity'];
  function gridActionUpdate($http, gridEntity) {
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
      
      $http(params).then(actionUpdateSuccess, actionUpdateError);

      function actionUpdateSuccess() {
        gridEntity.getFormInfo(function (form) {
          scope.schema = form.schema;
          scope.form = form.form;
          scope.model = form.model;
          scope.alerts.push({
            type: 'success',
            msg: gridEntity.getMessage('successUpdated')
          });
        });
      }

      function actionUpdateError(res) {
        scope.alerts.push({
          type: 'danger',
          msg: res.statusText || gridEntity.getMessage('serverError')
        });
      }

    };
  }

  module.factory('grid-action-create', gridActionCreate);
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

  /* Grid links actions */
  module.provider('grid-actions', gridActions);
  gridActions.$inject = [];
  function gridActions() {

    var provider = {
      actions: {},
      $get: gridActionsGet
    };

    gridActionsGet.$inject = ['grid-action-goTo', 'grid-action-delete', 'grid-action-update', 'grid-action-create'];
    return provider;

    function gridActionsGet(ActionGoTo, ActionDelete, ActionUpdate, ActionCreate) {
      /*jshint validthis: true */
      this.actions = {
        goToUpdate: ActionGoTo,
        goToCreate: ActionGoTo,
        goToList: ActionGoTo,
        read: ActionGoTo,
        delete: ActionDelete,
        update: ActionUpdate,
        create: ActionCreate
      };
      return {
        action: function (link, scope) {
          this.actions[link.definition.data.propertyValue('rel')](link, scope);
        }.bind(this)
      };
    }
  }

  module.directive('gridForm', crudDirective);
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


  module.directive("gridTable", ['$timeout', 'grid-entity', 'grid-actions', function($timeout, gridEntity, gridActions) {
    return {
      restrict: 'E',
      templateUrl: 'templates/grid/table.html',
      scope: {
        gridModel: '=gridModel'
      },
      controller: function($scope) {
        $scope.alerts = [];
        gridEntity.setModel($scope.gridModel);

        gridEntity.getTableInfo(function(table) {
            $scope.rows = table.rows;
            $scope.columns = table.columns;
            $scope.links = table.links;
            $scope.$digest();
        });

        $scope.edit = function(link) {
          gridActions.action(link, $scope);
        };

        $scope.closeAlert = function(index) {
          $scope.alerts.splice(index, 1);
        };
      },
      link: function(scope, element, attributes, controller) {

      }
    };
  }]);

  Object.byString = function(obj, path) {
    path = path.replace(/\[(\w+)]/g, '.$1'); // convert indexes to properties
    path = path.replace(/\/(\w+)/g, '.$1'); // convert indexes to properties
    path = path.replace(/^\./, '');           // strip a leading dot
    var a = path.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (k in obj) {
        obj = obj[k];
      } else {
        return;
      }
    }
    return obj;
  };
return grid;
}));