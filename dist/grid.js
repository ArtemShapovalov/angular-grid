(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            'angular',
            'jsonary',
            'angular-bootstrap',
            'bootstrap-decorator',
            'lodash'
        ], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('angular'), require('Jsonary'), require('angularBootstrap'), require('bootstrapDecorator'), require('lodash'));
    } else {
        root.vmsGrid = factory(root.angular, root.Jsonary, root.angularBootstrap, root.bootstrapDecorator, root._);
    }
}(this, function (angular, Jsonary, angularBootstrap, bootstrapDecorator, lodash) {
    {
        var deps = [];
        try {
            angular.module('schemaForm');
            deps.push('schemaForm');
        } catch (e) {
        }
        try {
            angular.module('ui.bootstrap');
            deps.push('ui.bootstrap');
        } catch (e) {
        }
        var vmsGrid = angular.module('grid', deps);
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/table.html', '<grid-table>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '<table class="table grid">' + '<thead>' + '<tr>' + '<th ng-repeat="column in columns">{{column.title}}</th>' + '</tr>' + '</thead>' + '<tbody>' + '<tr ng-repeat="row in rows">' + '<td ng-repeat="column in columns">' + '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>' + '<span ng-if="column.attributeName == \'links\'">' + '<span ng-repeat="link in row.links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '</span>' + '</td>' + '</tr>' + '</tbody>' + '</table>' + '</grid-table>');
                $templateCache.put('templates/grid/form.html', '<grid-form>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a> ' + '</span>' + '<div>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '</div>' + '<form novalidate name="gridForm" ng-init="setFormScope(this)"' + 'sf-schema="schema" sf-form="form" sf-model="model"' + 'class="form-horizontal" role="form" ng-if="hideForm !== true">' + '</form>' + '</grid-form>');
            }
        ]);
        angular.module('grid').factory('_', function () {
            return lodash;
        });
        angular.module('grid').provider('grid-entity', gridEntity);
        function gridEntity() {
            var data, schema;
            var provider = { $get: gridEntityGet };
            gridEntityGet.$inject = [
                '$timeout',
                '_'
            ];
            return provider;
            function gridEntityGet($timeout, _) {
                var model, messages = {
                        successDeleted: 'Successfully delete',
                        successCreated: 'Successfully create',
                        successUpdated: 'Successfully update',
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
                    loadData: loadData,
                    loadSchema: loadSchema,
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
                    if (model.params.type === 'create') {
                        self.loadSchema(url, fetchDataSuccess);
                    } else {
                        self.loadData(url, fetchDataSuccess);
                    }
                    function fetchDataSuccess(data, schema) {
                        self.setData(data);
                        self.setSchema(schema);
                        if (callback !== undefined) {
                            callback(data, schema);
                        }
                    }
                }
                /**
     * Fetch data by url and include schema from header data
     * @param url
     * @param callback
     * @returns {boolean}
     */
                function loadData(url, callback) {
                    /*jshint validthis: true */
                    if (model === undefined) {
                        alert('Please set model before call fetch data');
                        return false;
                    }
                    Jsonary.getData(url, function (jData, request) {
                        var data = jData;
                        var schema = jData.property('data').schemas()[0].data.document.raw.value();
                        if (callback !== undefined) {
                            callback(data, schema, request);
                        }
                    });
                }
                /**
     * Fetch schema by url, create empty data and join them
     * @param url
     * @param callback
     */
                function loadSchema(url, callback) {
                    /*jshint validthis: true */
                    var self = this;
                    Jsonary.getSchema(url, function (jSchema) {
                        var schema = jSchema.data.document.raw.value();
                        var data = Jsonary.create(getEmptyData(jSchema.data.value(), schema));
                        data.document.url = self.getModel().url;
                        data.addSchema(jSchema);
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
                        _.forEach(tmpObj, function (value, key) {
                            if (value.type) {
                                switch (value.type) {
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
                function getResourceUrl(url, params) {
                    var result = url;
                    if (params.resource) {
                        result = url + '/' + params.resource;
                    }
                    if (params.type) {
                        if (params.type === 'update' || params.type === 'read') {
                            result += '/' + params.type + '/' + params.id;
                        } else if (params.type === 'create') {
                            result += '/schema#/definitions/create';
                        }
                    }
                    return result;
                }
                function getTableInfo(callback) {
                    /*jshint validthis: true */
                    var self = this, model = self.getModel(), url;
                    url = getResourceUrl(model.url, model.params);
                    $timeout(function () {
                        self.fetchData(url, fetchDataSuccess);
                    });
                    function fetchDataSuccess(data, schema) {
                        var schemaWithoutRef = mergeRelSchema(data.schemas()[0].data.value(), schema);
                        self.type = self.TYPE_TABLE;
                        if (!self.config.table) {
                            self.config.table = {};
                        }
                        getRowsByData(data, function (rows, relations) {
                            self.config.table.rows = rowsToTableFormat(rows);
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
                        });
                    }
                }
                /**
     *
     * @param callback
     */
                function getFormInfo(callback) {
                    /*jshint validthis: true */
                    var self = this, model = self.getModel(), url;
                    url = getResourceUrl(model.url, model.params);
                    $timeout(function () {
                        self.fetchData(url, fetchDataSuccess);
                    });
                    function fetchDataSuccess(data, schema) {
                        var newData = data.property('data').property('attributes');
                        var schemaWithoutRef = mergeRelSchema(newData.schemas()[0].data.value(), schema);
                        self.type = self.TYPE_FORM;
                        if (!self.config.form) {
                            self.config.form = {};
                        }
                        getFieldsForm(data, function (fields, relations) {
                            self.config.form.links = data.links();
                            self.config.form.schema = schemaWithoutRef;
                            self.config.form.model = fieldsToFormFormat(fields);
                            self.config.form.form = ['*'];
                            /** add button to config form */
                            self.config.form.form = _.union(self.config.form.form, getFormButtonBySchema(data.property('data').links()));
                            if (callback !== undefined) {
                                callback(self.config.form);
                            }
                        });
                    }
                }
                function getFieldsForm(data, callback) {
                    var fields;
                    var included = [];
                    fields = data.property('data');
                    included.push(getRelationResource(data.property('data')));
                    batchLoadData(included, batchLoaded);
                    function batchLoaded(relationResources) {
                        var result = {
                            own: fields,
                            relationships: _.mapValues(relationResources[0], function (n) {
                                _.forEach(n, function (item, index) {
                                    n[index] = item.data;
                                });
                                return n;
                            })
                        };
                        callback(result);
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
                            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && haystack[key] !== 'links') {
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
                    var result = [];
                    var columns = schemaWithoutRef.properties.data.items.properties.attributes.properties;
                    _.forEach(columns, function (value, key) {
                        value.attributeName = key;
                        result.push(value);
                    });
                    /*var relationships = {};
      if (schemaWithoutRef.properties.data.items.properties.relationships) {
        relationships = schemaWithoutRef.properties.data.items.properties.relationships.properties;
      }
      _.forEach(relationships, function(value, key) {
        value.attributeName = key;
        result.push(value);
      });*/
                    return result;
                }
                function fieldsToFormFormat(resource) {
                    var data = resource.own;
                    var fields = data.property('attributes').value();
                    _.forEach(resource.relationships, function (relation, key) {
                        fields[key] = _.map(relation, function (relationItem) {
                            return relationItem.property('data').propertyValue('id');
                        });
                        /** check if data as array then return string else array */
                        if (!Array.isArray(data.property('relationships').property(key).propertyValue('data'))) {
                            fields[key] = fields[key][0];
                        }
                    });
                    return fields;
                }
                /**
     * Convert array Jsonary Data to result array for rendering table
     *
     * @param rows
     * @returns {Array}
     */
                function rowsToTableFormat(rows) {
                    var result = [];
                    _.forEach(rows, function (resource) {
                        var data = resource.own;
                        var tmp = data.property('attributes').value();
                        _.forEach(resource.relationships, function (relation, key) {
                            tmp[key] = _.map(relation, function (relationItem) {
                                var field = resource.own.property('relationships').property(key).schemas()[0].data.propertyValue('name');
                                /**
             * name additional field(relation resource)
             */
                                if (field) {
                                    return relationItem.property('data').property('attributes').propertyValue(field);
                                }
                                return relationItem.property('data').propertyValue('id');
                            }).join(', ');
                        });
                        tmp.links = [];
                        _.forOwn(data.links(), function (link) {
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
                function getRowsByData(data, callback) {
                    var rows = [];
                    var included = [];
                    data.property('data').items(function (index, value) {
                        included.push(getRelationResource(value));
                        rows.push(value);
                    });
                    batchLoadData(included, batchLoaded);
                    function batchLoaded(relationResources) {
                        var res = [];
                        _.forEach(rows, function (row, index) {
                            var tmpRow = {
                                own: row,
                                relationships: _.mapValues(relationResources[index], function (n) {
                                    _.forEach(n, function (item, index) {
                                        n[index] = item.data;
                                    });
                                    return n;
                                })
                            };
                            res.push(tmpRow);
                        });
                        callback(res);
                    }
                }
                /**
     * Circumvention the array relationships and get links for late them load
     *
     * @param data
     * @returns {Object} link for get resource
     */
                function getRelationResource(data) {
                    var relations;
                    var result = {};
                    if (relations = data.property('relationships').value()) {
                        _.forEach(relations, function (relItem, relKey) {
                            result[relKey] = getRelationLink(relItem);
                        });
                    }
                    return result;
                }
                /**
     * Get link from relation for load resource data
     *
     * "data": [{
     *    "type": "posts",
     *    "id": "1",
     *    "attributes": {
     *      ...
     *    },
     *    "relationships": {
     *      "author": {           <-- input data
     *         "links": {
     *           "self": "http://example.com/posts/1/relationships/author",
     *           "related": "http://example.com/posts/1/author"
     *         },
     *         "data": { "type": "people", "id": "9" }
     *      }
     *    }
     *}]
     * @param relItem
     * @returns {Array}
     */
                function getRelationLink(relItem) {
                    var resource = [];
                    if (Array.isArray(relItem.data)) {
                        var linkArray = [];
                        _.forEach(relItem.data, function (dataObj) {
                            linkArray.push({
                                url: getResourceUrl(relItem.links.self, {
                                    type: 'read',
                                    id: dataObj.id
                                })
                            });
                        });
                        resource = linkArray;
                    } else {
                        resource = [{
                                url: getResourceUrl(relItem.links.self, {
                                    type: 'read',
                                    id: relItem.data.id
                                })
                            }];
                    }
                    return resource;
                }
                /**
     * Multiple (batch) load data
     *
     * @param included
     * @param callback
     */
                function batchLoadData(included, callback) {
                    var result = [];
                    var resources = {};
                    var cached = {};
                    var total = 0;
                    var loaded = 0;
                    _.forEach(included, function (item) {
                        _.forEach(item, function (rel) {
                            _.forEach(rel, function (relItem) {
                                if (cached[relItem.url]) {
                                    console.log('cache');
                                    total++;
                                } else {
                                    loadData(relItem.url, success);
                                    cached[relItem.url] = {};
                                    total++;
                                    loaded++;
                                }
                            });
                        });
                    });
                    var interval = setInterval(function () {
                        if (_.size(resources) === loaded) {
                            clearInterval(interval);
                            _.forEach(included, function (item, ki) {
                                _.forEach(item, function (rel, kr) {
                                    _.forEach(rel, function (relItem, kri) {
                                        result[ki] = result[ki] || {};
                                        result[ki][kr] = result[ki][kr] || [];
                                        result[ki][kr][kri] = resources[relItem.url];
                                    });
                                });
                            });
                            callback(result);
                        }
                    }, 100);
                    function success(data, schema, request) {
                        resources[data.document.url] = {
                            data: data,
                            schema: schema
                        };
                        console.log('load');
                    }
                }
                /**
     *
     * @param links
     * @returns {Array}
     */
                function getFormButtonBySchema(links) {
                    var result = [];
                    _.forEach(links, function (value) {
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
        Object.byString = function (obj, path) {
            path = path.replace(/\[(\w+)]/g, '.$1');
            // convert indexes to properties
            path = path.replace(/\/(\w+)/g, '.$1');
            // convert indexes to properties
            path = path.replace(/^\./, '');
            // strip a leading dot
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
        angular.module('grid').factory('grid-action-create', gridActionCreate);
        gridActionCreate.$inject = [
            '$http',
            'grid-entity'
        ];
        function gridActionCreate($http, gridEntity) {
            return function (link, scope) {
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
        angular.module('grid').factory('grid-action-delete', gridActionDelete);
        gridActionDelete.$inject = [
            '$http',
            'grid-entity'
        ];
        function gridActionDelete($http, gridEntity) {
            return function (link, scope) {
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
        angular.module('grid').factory('grid-action-goTo', gridActionGoTo);
        gridActionGoTo.$inject = ['$location'];
        function gridActionGoTo($location) {
            return function (link) {
                var templateLink = link.definition.data.propertyValue('href');
                var resultLink = templateLink.replace(/{([^\{,}]*)}/g, function (match, p1) {
                    return link.subjectData.propertyValue(p1);
                });
                $location.url(resultLink);
            };
        }
        /* Grid links actions */
        angular.module('grid').provider('grid-actions', gridActions);
        gridActions.$inject = [];
        function gridActions() {
            var provider = {
                actions: {},
                $get: gridActionsGet
            };
            gridActionsGet.$inject = [
                'grid-action-goTo',
                'grid-action-delete',
                'grid-action-update',
                'grid-action-create'
            ];
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
        angular.module('grid').factory('grid-action-update', gridActionUpdate);
        gridActionUpdate.$inject = [
            '$http',
            'grid-entity'
        ];
        function gridActionUpdate($http, gridEntity) {
            return function (link, scope) {
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
        angular.module('grid').directive('gridForm', gridFormDirective);
        //TODO: should be set require ... depends on vmsGrid
        function gridFormDirective() {
            var directive = {
                restrict: 'E',
                replace: true,
                controller: gridFormDirectiveCtrl
            };
            gridFormDirectiveCtrl.$inject = [
                '$scope',
                'grid-entity',
                'grid-actions'
            ];
            return directive;
            function gridFormDirectiveCtrl($scope, gridEntity, gridActions) {
                $scope.alerts = [];
                $scope.scopeForm = { gridForm: {} };
                $scope.setFormScope = function (scope) {
                    $scope.scopeForm = scope;
                };
                gridEntity.getFormInfo(function (form) {
                    $scope.schema = form.schema;
                    $scope.form = form.form;
                    $scope.model = form.model;
                    $scope.links = form.links;
                    $scope.$digest();
                });
                $scope.edit = function ($event, form) {
                    gridActions.action(form.link, $scope);
                };
                $scope.go = function (link) {
                    gridActions.action(link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
            }
        }
        angular.module('grid').directive('gridTable', gridTableDirective);
        gridTableDirective.$inject = [
            'grid-entity',
            'grid-actions'
        ];
        //TODO: should be set require ... depends on vmsGrid
        function gridTableDirective(gridEntity, gridActions) {
            var directive = {
                restrict: 'E',
                controller: gridTableDirectiveCtrl
            };
            gridTableDirectiveCtrl.$inject = ['$scope'];
            return directive;
            function gridTableDirectiveCtrl($scope) {
                $scope.alerts = [];
                gridEntity.getTableInfo(function (table) {
                    $scope.rows = table.rows;
                    $scope.columns = table.columns;
                    $scope.links = table.links;
                    $scope.$digest();
                });
                $scope.edit = function (link) {
                    gridActions.action(link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
            }
        }
        angular.module('grid').directive('vmsGrid', vmsGridDirective);
        function vmsGridDirective() {
            var directive = {
                restrict: 'E',
                template: '<ng-include src="getTemplateUrl()" />',
                scope: { gridModel: '=gridModel' },
                controller: vmsGridDirectiveCtrl,
                link: function (scope, el, attr, ctrl) {
                }
            };
            vmsGridDirectiveCtrl.$inject = [
                '$scope',
                'grid-entity'
            ];
            return directive;
            function vmsGridDirectiveCtrl($scope, gridEntity) {
                $scope.getTemplateUrl = function () {
                    if ($scope.gridModel.params.type) {
                        return 'templates/grid/form.html';
                    }
                    return 'templates/grid/table.html';
                };
                gridEntity.setModel($scope.gridModel);
            }
        }
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJ2YWx1ZSIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwidXJsIiwiY2FsbGJhY2siLCJzZWxmIiwicGFyYW1zIiwiZmV0Y2hEYXRhU3VjY2VzcyIsInVuZGVmaW5lZCIsImFsZXJ0IiwiSnNvbmFyeSIsImdldERhdGEiLCJqRGF0YSIsInJlcXVlc3QiLCJwcm9wZXJ0eSIsInNjaGVtYXMiLCJkb2N1bWVudCIsInJhdyIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJnZXRFbXB0eURhdGEiLCJhZGRTY2hlbWEiLCJmdWxsU2NoZW1hIiwicmVzdWx0Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwiY2xvbmUiLCJwcm9wZXJ0aWVzIiwiZ2V0VHlwZVByb3BlcnR5IiwiYXR0cmlidXRlcyIsIm9iaiIsInRtcE9iaiIsImZvckVhY2giLCJrZXkiLCJnZXRSZXNvdXJjZVVybCIsInJlc291cmNlIiwiaWQiLCJ0YWJsZSIsImdldFJvd3NCeURhdGEiLCJyb3dzIiwicmVsYXRpb25zIiwicm93c1RvVGFibGVGb3JtYXQiLCJsaW5rcyIsImNvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJ0aXRsZSIsImF0dHJpYnV0ZU5hbWUiLCJuZXdEYXRhIiwiZm9ybSIsImdldEZpZWxkc0Zvcm0iLCJmaWVsZHMiLCJmaWVsZHNUb0Zvcm1Gb3JtYXQiLCJ1bmlvbiIsImdldEZvcm1CdXR0b25CeVNjaGVtYSIsImluY2x1ZGVkIiwiZ2V0UmVsYXRpb25SZXNvdXJjZSIsImJhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwib3duIiwicmVsYXRpb25zaGlwcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJyZXBsYWNlRnJvbUZ1bGwiLCJoYXlzdGFjayIsInNjaGVtYUZ1bGwiLCJoYXNPd25Qcm9wZXJ0eSIsIkFycmF5IiwiaXNBcnJheSIsIiRyZWYiLCJPYmplY3QiLCJieVN0cmluZyIsInN1YnN0cmluZyIsIml0ZW1zIiwicmVsYXRpb24iLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJwcm9wZXJ0eVZhbHVlIiwidG1wIiwiZmllbGQiLCJqb2luIiwiZm9yT3duIiwibGluayIsInJlcyIsInJvdyIsInRtcFJvdyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJnZXRSZWxhdGlvbkxpbmsiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwicmVzb3VyY2VzIiwiY2FjaGVkIiwidG90YWwiLCJsb2FkZWQiLCJyZWwiLCJjb25zb2xlIiwibG9nIiwic3VjY2VzcyIsImludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJzaXplIiwiY2xlYXJJbnRlcnZhbCIsImtpIiwia3IiLCJrcmkiLCJvbkNsaWNrIiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibGVuZ3RoIiwiayIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCJncmlkRm9ybSIsIiR2YWxpZCIsInRoZW4iLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsIiRkaWdlc3QiLCJlZGl0IiwiJGV2ZW50IiwiZ28iLCJjbG9zZUFsZXJ0Iiwic3BsaWNlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCIsInZtc0dyaWREaXJlY3RpdmUiLCJ0ZW1wbGF0ZSIsImdyaWRNb2RlbCIsInZtc0dyaWREaXJlY3RpdmVDdHJsIiwiZWwiLCJhdHRyIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUE7QUFBQSxZQUNBSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxjQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxjQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUFDLE9BQUEsR0FBQUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBRixJQUFBLENBQUEsQztRQ2pCQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxHQUFBLENBQUE7QUFBQSxZQUFBLGdCQUFBO0FBQUEsWUFBQSxVQUFBQyxjQUFBLEVBQUE7QUFBQSxnQkFDQUEsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFDQSxpQkFDQSxrQ0FEQSxHQUVBLHlFQUZBLEdBR0EsU0FIQSxHQUlBLDJHQUpBLEdBS0EsNEJBTEEsR0FNQSxTQU5BLEdBT0EsTUFQQSxHQVFBLHlEQVJBLEdBU0EsT0FUQSxHQVVBLFVBVkEsR0FXQSxTQVhBLEdBWUEsOEJBWkEsR0FhQSxvQ0FiQSxHQWNBLHVGQWRBLEdBZUEsa0RBZkEsR0FnQkEsc0NBaEJBLEdBaUJBLHlFQWpCQSxHQWtCQSxTQWxCQSxHQW1CQSxTQW5CQSxHQW9CQSxPQXBCQSxHQXFCQSxPQXJCQSxHQXNCQSxVQXRCQSxHQXVCQSxVQXZCQSxHQXdCQSxlQXpCQSxF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QUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQVFBaEIsVUFBQSxDQUFBbUIsUUFBQSxDQUFBa0wsTUFBQSxDQUFBWSxTQUFBLEVBUkE7QUFBQSxhQWpCQTtBQUFBLFMiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCcsXG4gICAgJzxncmlkLXRhYmxlPicgK1xuICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gbGlua3NcIj4nICtcbiAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJlZGl0KGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgICAnPHRhYmxlIGNsYXNzPVwidGFibGUgZ3JpZFwiPicrXG4gICAgICAgICc8dGhlYWQ+JytcbiAgICAgICAgICAnPHRyPicrXG4gICAgICAgICAgICAnPHRoIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+e3tjb2x1bW4udGl0bGV9fTwvdGg+JytcbiAgICAgICAgICAnPC90cj4nK1xuICAgICAgICAnPC90aGVhZD4nK1xuICAgICAgICAnPHRib2R5PicrXG4gICAgICAgICAgJzx0ciBuZy1yZXBlYXQ9XCJyb3cgaW4gcm93c1wiPicrXG4gICAgICAgICAgICAnPHRkIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+JytcbiAgICAgICAgICAgICAgJzxzcGFuIG5nLWlmPVwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXCI+e3tyb3dbY29sdW1uLmF0dHJpYnV0ZU5hbWVdfX08L3NwYW4+JytcbiAgICAgICAgICAgICAgJzxzcGFuIG5nLWlmPVwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgPT0gXFwnbGlua3NcXCdcIj4nK1xuICAgICAgICAgICAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIHJvdy5saW5rc1wiPicgK1xuICAgICAgICAgICAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJlZGl0KGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgJzwvdGQ+JytcbiAgICAgICAgICAnPC90cj4nK1xuICAgICAgICAnPC90Ym9keT4nK1xuICAgICAgJzwvdGFibGU+JyArXG4gICAgJzwvZ3JpZC10YWJsZT4nXG4gICk7XG5cbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnLFxuICAgICc8Z3JpZC1mb3JtPicgK1xuICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gbGlua3NcIj4nICtcbiAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJnbyhsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8ZGl2PicgK1xuICAgICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XCJncmlkRm9ybVwiIG5nLWluaXQ9XCJzZXRGb3JtU2NvcGUodGhpcylcIicgK1xuICAgICAgICAnc2Ytc2NoZW1hPVwic2NoZW1hXCIgc2YtZm9ybT1cImZvcm1cIiBzZi1tb2RlbD1cIm1vZGVsXCInICtcbiAgICAgICAgJ2NsYXNzPVwiZm9ybS1ob3Jpem9udGFsXCIgcm9sZT1cImZvcm1cIiBuZy1pZj1cImhpZGVGb3JtICE9PSB0cnVlXCI+JytcbiAgICAgICc8L2Zvcm0+JytcbiAgICAnPC9ncmlkLWZvcm0+J1xuICApO1xufV0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcbiAgdmFyIGRhdGEsXG4gICAgICBzY2hlbWE7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldCgkdGltZW91dCwgXykge1xuICAgIHZhciBtb2RlbCxcbiAgICAgICAgbWVzc2FnZXMgPSB7XG4gICAgICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgVFlQRV9GT1JNOiAnZm9ybScsXG4gICAgICBUWVBFX1RBQkxFOiAndGFibGUnLFxuICAgICAgdHlwZTogJycsXG4gICAgICBjb25maWc6IHt9LFxuICAgICAgc2V0RGF0YTogc2V0RGF0YSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldFNjaGVtYTogc2V0U2NoZW1hLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBmZXRjaERhdGE6IGZldGNoRGF0YSxcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRUYWJsZUluZm86IGdldFRhYmxlSW5mbyxcbiAgICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mb1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXREYXRhKHZhbHVlKSB7XG4gICAgICBkYXRhID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U2NoZW1hKHZhbHVlKSB7XG4gICAgICBzY2hlbWEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLnNldERhdGEoZGF0YSk7XG4gICAgICAgIHNlbGYuc2V0U2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2V0IG1vZGVsIGJlZm9yZSBjYWxsIGZldGNoIGRhdGEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbiAoakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uIChqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShnZXRFbXB0eURhdGEoalNjaGVtYS5kYXRhLnZhbHVlKCksIHNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfVEFCTEU7XG4gICAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy50YWJsZSkge1xuICAgICAgICAgICAgc2VsZi5jb25maWcudGFibGUgPSB7fTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICBnZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUucm93cyA9IHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMgPSBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy50YWJsZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuICAgICAgICBpZiAoIXNlbGYuY29uZmlnLmZvcm0pIHtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBnZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLm1vZGVsID0gZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gW1xuICAgICAgICAgICAgJyonXG4gICAgICAgICAgXTtcbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uZm9ybSA9IF8udW5pb24oc2VsZi5jb25maWcuZm9ybS5mb3JtLCBnZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy5mb3JtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgIH1cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBmaWVsZHM7XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgICAgaW5jbHVkZWQucHVzaChnZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgICBiYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICByZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICByZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSByZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuXG4gICAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgICB9XG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTsqL1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZmllbGRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICAgIHZhciB0bXAgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICAgIHRtcFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gcmVzb3VyY2Uub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJlc291cmNlKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRtcC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB0bXAubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRtcCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciByb3dzID0gW107XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgICBpbmNsdWRlZC5wdXNoKGdldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcblxuICAgICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcblxuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlZFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgY2FjaGVkID0ge307XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG5cbiAgICAgIF8uZm9yRWFjaChpbmNsdWRlZCwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBfLmZvckVhY2goaXRlbSwgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuICAgICAgICAgICAgaWYgKGNhY2hlZFtyZWxJdGVtLnVybF0pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhY2hlJyk7XG4gICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2FkRGF0YShyZWxJdGVtLnVybCwgc3VjY2Vzcyk7XG4gICAgICAgICAgICAgIGNhY2hlZFtyZWxJdGVtLnVybF0gPSB7fTtcbiAgICAgICAgICAgICAgdG90YWwrKztcbiAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoXy5zaXplKHJlc291cmNlcykgPT09IGxvYWRlZCkge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuXG4gICAgICAgICAgXy5mb3JFYWNoKGluY2x1ZGVkLCBmdW5jdGlvbihpdGVtLCBraSkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCwga3IpIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga3JpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tpXSA9IHJlc3VsdFtraV0gfHwge307XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl0gPSByZXN1bHRba2ldW2tyXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldW2tyXVtrcmldID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdClcbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgcmVzb3VyY2VzW2RhdGEuZG9jdW1lbnQudXJsXSA9IHtcbiAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgIHNjaGVtYTogc2NoZW1hXG4gICAgICAgIH07XG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2FkJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfVEFCTEUpIHtcbiAgICAgICAgZ3JpZEVudGl0eS5nZXRUYWJsZUluZm8oZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGdyaWRFbnRpdHkudHlwZSA9PT0gZ3JpZEVudGl0eS5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5J107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHkpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuc2V0TW9kZWwoJHNjb3BlLmdyaWRNb2RlbCk7XG4gIH1cbn0iXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==