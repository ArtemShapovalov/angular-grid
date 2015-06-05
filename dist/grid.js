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
                        self.config.form.links = data.links();
                        self.config.form.schema = schemaWithoutRef;
                        self.config.form.model = newData.value();
                        self.config.form.form = ['*'];
                        /** add button to config form */
                        self.config.form.form = _.union(self.config.form.form, getFormButtonBySchema(data.property('data').links()));
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
                    var relationships = {};
                    if (schemaWithoutRef.properties.data.items.properties.relationships) {
                        relationships = schemaWithoutRef.properties.data.items.properties.relationships.properties;
                    }
                    _.forEach(columns, function (value, key) {
                        value.attributeName = key;
                        result.push(value);
                    });
                    _.forEach(relationships, function (value, key) {
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
                    _.forEach(rows, function (resource) {
                        var data = resource.own;
                        var tmp = data.property('attributes').value();
                        _.forEach(resource.relationships, function (relation, key) {
                            tmp[key] = _.map(relation, function (relationItem) {
                                var field = resource.own.property('relationships').property(key).schemas()[0].data.propertyValue('name');
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
                                }
                            });
                        });
                    });
                    var interval = setInterval(function () {
                        if (_.size(resources) + _.size(cached) === total) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJ2YWx1ZSIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwidXJsIiwiY2FsbGJhY2siLCJzZWxmIiwicGFyYW1zIiwiZmV0Y2hEYXRhU3VjY2VzcyIsInVuZGVmaW5lZCIsImFsZXJ0IiwiSnNvbmFyeSIsImdldERhdGEiLCJqRGF0YSIsInJlcXVlc3QiLCJwcm9wZXJ0eSIsInNjaGVtYXMiLCJkb2N1bWVudCIsInJhdyIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJnZXRFbXB0eURhdGEiLCJhZGRTY2hlbWEiLCJmdWxsU2NoZW1hIiwicmVzdWx0Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwiY2xvbmUiLCJwcm9wZXJ0aWVzIiwiZ2V0VHlwZVByb3BlcnR5IiwiYXR0cmlidXRlcyIsIm9iaiIsInRtcE9iaiIsImZvckVhY2giLCJrZXkiLCJnZXRSZXNvdXJjZVVybCIsInJlc291cmNlIiwiaWQiLCJ0YWJsZSIsImdldFJvd3NCeURhdGEiLCJyb3dzIiwicmVsYXRpb25zIiwicm93c1RvVGFibGVGb3JtYXQiLCJsaW5rcyIsImNvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJ0aXRsZSIsImF0dHJpYnV0ZU5hbWUiLCJuZXdEYXRhIiwiZm9ybSIsInVuaW9uIiwiZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwicmVwbGFjZUZyb21GdWxsIiwiaGF5c3RhY2siLCJzY2hlbWFGdWxsIiwiaGFzT3duUHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCIkcmVmIiwiT2JqZWN0IiwiYnlTdHJpbmciLCJzdWJzdHJpbmciLCJpdGVtcyIsInJlbGF0aW9uc2hpcHMiLCJvd24iLCJ0bXAiLCJyZWxhdGlvbiIsIm1hcCIsInJlbGF0aW9uSXRlbSIsImZpZWxkIiwicHJvcGVydHlWYWx1ZSIsImpvaW4iLCJmb3JPd24iLCJsaW5rIiwiaW5jbHVkZWQiLCJpbmRleCIsImdldFJlbGF0aW9uUmVzb3VyY2UiLCJiYXRjaExvYWREYXRhIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsInJlcyIsInJvdyIsInRtcFJvdyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwicmVsSXRlbSIsInJlbEtleSIsImdldFJlbGF0aW9uTGluayIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJyZXNvdXJjZXMiLCJjYWNoZWQiLCJ0b3RhbCIsInJlbCIsImNvbnNvbGUiLCJsb2ciLCJzdWNjZXNzIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsInNpemUiLCJjbGVhckludGVydmFsIiwia2kiLCJrciIsImtyaSIsIm9uQ2xpY2siLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJrIiwiZ3JpZEFjdGlvbkNyZWF0ZSIsIiRodHRwIiwic2NvcGUiLCJtZXRob2QiLCJocmVmIiwiJGJyb2FkY2FzdCIsInNjb3BlRm9ybSIsImdyaWRGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwiZ3JpZE1vZGVsIiwidm1zR3Jp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QSxZQUNBLElBQUFmLFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBYyxRQUFBLEVBQUEsdUNBRkE7QUFBQSxnQkFHQTNELEtBQUEsRUFBQSxFQUNBNEQsU0FBQSxFQUFBLFlBREEsRUFIQTtBQUFBLGdCQU1BZCxVQUFBLEVBQUFlLG9CQU5BO0FBQUEsZ0JBT0F2RyxJQUFBLEVBQUEsVUFBQTBDLEtBQUEsRUFBQThELEVBQUEsRUFBQUMsSUFBQSxFQUFBQyxJQUFBLEVBQUE7QUFBQSxpQkFQQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFlBYUFILG9CQUFBLENBQUF6TSxPQUFBLEdBQUE7QUFBQSxnQkFBQSxRQUFBO0FBQUEsZ0JBQUEsYUFBQTtBQUFBLGFBQUEsQ0FiQTtBQUFBLFlBZUEsT0FBQXVMLFNBQUEsQ0FmQTtBQUFBLFlBaUJBLFNBQUFrQixvQkFBQSxDQUFBYixNQUFBLEVBQUFqTSxVQUFBLEVBQUE7QUFBQSxnQkFDQWlNLE1BQUEsQ0FBQWlCLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQWpCLE1BQUEsQ0FBQVksU0FBQSxDQUFBekssTUFBQSxDQUFBcEIsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFoQixVQUFBLENBQUFtQixRQUFBLENBQUE4SyxNQUFBLENBQUFZLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUyIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpOyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJyxcbiAgICAnPGdyaWQtdGFibGU+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8dGFibGUgY2xhc3M9XCJ0YWJsZSBncmlkXCI+JytcbiAgICAgICAgJzx0aGVhZD4nK1xuICAgICAgICAgICc8dHI+JytcbiAgICAgICAgICAgICc8dGggbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj57e2NvbHVtbi50aXRsZX19PC90aD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3RoZWFkPicrXG4gICAgICAgICc8dGJvZHk+JytcbiAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAgICAgICAgICc8dGQgbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1wiPicrXG4gICAgICAgICAgICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gcm93LmxpbmtzXCI+JyArXG4gICAgICAgICAgICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAnPC90ZD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3Rib2R5PicrXG4gICAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPidcbiAgKTtcblxuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCcsXG4gICAgJzxncmlkLWZvcm0+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImdvKGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxkaXY+JyArXG4gICAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzwvZGl2PicgK1xuICAgICAgJzxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cImdyaWRGb3JtXCIgbmctaW5pdD1cInNldEZvcm1TY29wZSh0aGlzKVwiJyArXG4gICAgICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICAgICAnY2xhc3M9XCJmb3JtLWhvcml6b250YWxcIiByb2xlPVwiZm9ybVwiIG5nLWlmPVwiaGlkZUZvcm0gIT09IHRydWVcIj4nK1xuICAgICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuICB2YXIgZGF0YSxcbiAgICAgIHNjaGVtYTtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXREYXRhOiBzZXREYXRhLFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0U2NoZW1hOiBzZXRTY2hlbWEsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldERhdGEodmFsdWUpIHtcbiAgICAgIGRhdGEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTY2hlbWEodmFsdWUpIHtcbiAgICAgIHNjaGVtYSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHNlbGYuc2V0RGF0YShkYXRhKTtcbiAgICAgICAgc2VsZi5zZXRTY2hlbWEoc2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZXQgbW9kZWwgYmVmb3JlIGNhbGwgZmV0Y2ggZGF0YScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKGdldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVtcHR5RGF0YShzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICAgIHJlc3VsdCA9IF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzKTtcbiAgICAgIHJlc3VsdC5kYXRhID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcykpO1xuICAgICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSk7XG5cbiAgICAgIGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0eShvYmopIHtcbiAgICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIGlmICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBzd2l0Y2godmFsdWUudHlwZSkge1xuICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgICB1cmw7XG5cbiAgICAgIHVybCA9IGdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9UQUJMRTtcbiAgICAgICAgICBpZiAoIXNlbGYuY29uZmlnLnRhYmxlKSB7XG4gICAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZSA9IHt9O1xuICAgICAgICAgIH1cblxuXG4gICAgICAgIGdldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5yb3dzID0gcm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucyA9IGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgICAgdGl0bGU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY29uZmlnLnRhYmxlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgICB1cmw7XG5cbiAgICAgIHVybCA9IGdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX0ZPUk07XG4gICAgICAgIGlmICghc2VsZi5jb25maWcuZm9ybSkge1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0gPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuY29uZmlnLmZvcm0ubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29uZmlnLmZvcm0uc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgc2VsZi5jb25maWcuZm9ybS5tb2RlbCA9IG5ld0RhdGEudmFsdWUoKTtcbiAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gW1xuICAgICAgICAgICcqJ1xuICAgICAgICBdO1xuICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSAgXy51bmlvbihzZWxmLmNvbmZpZy5mb3JtLmZvcm0sIGdldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soc2VsZi5jb25maWcuZm9ybSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrLCBzY2hlbWFGdWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gaGF5c3RhY2spIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIGhheXN0YWNrW2tleV0uJHJlZikge1xuICAgICAgICAgICAgaGF5c3RhY2tba2V5XSA9IE9iamVjdC5ieVN0cmluZyhzY2hlbWFGdWxsLCBoYXlzdGFja1trZXldLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgIHJlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIHJlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IHJlcGxhY2VGcm9tRnVsbChzY2hlbWFXaXRob3V0UmVmLCBzY2hlbWFGdWxsKTtcblxuICAgICAgcmV0dXJuIHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFXaXRob3V0UmVmXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuICAgICAgdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICAgfVxuXG4gICAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyZXNvdXJjZSkge1xuICAgICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgICAgdmFyIHRtcCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgICAgdG1wW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgICB2YXIgZmllbGQgPSByZXNvdXJjZS5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcblxuICAgICAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRtcC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB0bXAubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRtcCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciByb3dzID0gW107XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgICBpbmNsdWRlZC5wdXNoKGdldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcblxuICAgICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcblxuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlZFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgY2FjaGVkID0ge307XG4gICAgICB2YXIgdG90YWwgPSAwO1xuXG4gICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjYWNoZWRbcmVsSXRlbS51cmxdKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWNoZScpO1xuICAgICAgICAgICAgICB0b3RhbCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZERhdGEocmVsSXRlbS51cmwsIHN1Y2Nlc3MpO1xuICAgICAgICAgICAgICBjYWNoZWRbcmVsSXRlbS51cmxdID0ge307XG4gICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoKF8uc2l6ZShyZXNvdXJjZXMpICsgXy5zaXplKGNhY2hlZCkpID09PSB0b3RhbCkge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuXG4gICAgICAgICAgXy5mb3JFYWNoKGluY2x1ZGVkLCBmdW5jdGlvbihpdGVtLCBraSkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCwga3IpIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga3JpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tpXSA9IHJlc3VsdFtraV0gfHwge307XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl0gPSByZXN1bHRba2ldW2tyXSB8fCBbXTtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldW2tyXVtrcmldID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdClcbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgcmVzb3VyY2VzW2RhdGEuZG9jdW1lbnQudXJsXSA9IHtcbiAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgIHNjaGVtYTogc2NoZW1hXG4gICAgICAgIH07XG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2FkJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfVEFCTEUpIHtcbiAgICAgICAgZ3JpZEVudGl0eS5nZXRUYWJsZUluZm8oZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGdyaWRFbnRpdHkudHlwZSA9PT0gZ3JpZEVudGl0eS5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5J107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHkpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuc2V0TW9kZWwoJHNjb3BlLmdyaWRNb2RlbCk7XG4gIH1cbn0iXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==