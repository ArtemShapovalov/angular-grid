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
                '$interval',
                '_'
            ];
            return provider;
            function gridEntityGet($timeout, $interval, _) {
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
                    getFormInfo: getFormInfo,
                    _getFormConfig: _getFormConfig,
                    _createTitleMap: _createTitleMap,
                    _replaceFromFull: replaceFromFull
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
                            self._getFormConfig(data, callbackFormConfig);
                            function callbackFormConfig(config) {
                                self.config.form.form = config;
                                /** add button to config form */
                                self.config.form.form = _.union(self.config.form.form, getFormButtonBySchema(data.property('data').links()));
                                if (callback !== undefined) {
                                    callback(self.config.form);
                                }
                            }
                        });
                    }
                }
                function _getFormConfig(data, callback) {
                    var self = this;
                    var result = [];
                    self._createTitleMap(data.property('data'), function (titleMaps) {
                        var attributes = mergeRelSchema(data.property('data').schemas()[0].data.value(), data.schemas()[0].data.document.raw.value()).properties.attributes.properties;
                        _.forEach(attributes, function (value, key) {
                            if (titleMaps[key]) {
                                result.push({
                                    key: key,
                                    titleMap: titleMaps[key]
                                });
                            } else {
                                result.push({ key: key });
                            }
                        });
                        callback(result);
                    });
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
                function _createTitleMap(data, callback) {
                    var self = this;
                    var titleMaps = {};
                    var loaded = 0;
                    var total = 0;
                    var dataRelations = data.property('relationships');
                    var dataAttributes = data.property('attributes');
                    var relations = dataRelations.value();
                    var attributes = dataAttributes.value();
                    var documentSchema = dataRelations.schemas()[0].data.document.raw.value();
                    _.forEach(relations, function (item, key) {
                        var resourceLink = item.links.self;
                        /** get name from schema */
                        var attributeName = dataRelations.property(key).schemas()[0].data.propertyValue('name');
                        var schemaAttributeWithoutRef = self._replaceFromFull(dataAttributes.schemas()[0].data.value(), documentSchema)['properties'][key];
                        var sourceEnum = {};
                        if (schemaAttributeWithoutRef.items && schemaAttributeWithoutRef.items.enum) {
                            sourceEnum = schemaAttributeWithoutRef.items.enum;
                        } else if (schemaAttributeWithoutRef.enum) {
                            sourceEnum = schemaAttributeWithoutRef.enum;
                        }
                        if (sourceEnum) {
                            titleMaps[key] = [];
                            _.forEach(sourceEnum, function (enumItem) {
                                var url = resourceLink + '/read/' + enumItem;
                                self.loadData(url, function (data, schema) {
                                    titleMaps[key].push({
                                        value: enumItem,
                                        name: data.property('data').property('attributes').propertyValue(attributeName) || enumItem
                                    });
                                    loaded++;
                                });
                                total++;
                            });
                        }
                    });
                    var interval = $interval(function () {
                        if (total === loaded) {
                            $interval.cancel(interval);
                            if (callback !== undefined) {
                                callback(titleMaps);
                            }
                        }
                    }, 100);
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
                    var interval = $interval(function () {
                        if (_.size(resources) === loaded) {
                            $interval.cancel(interval);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJfZ2V0Rm9ybUNvbmZpZyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJyZXBsYWNlRnJvbUZ1bGwiLCJ2YWx1ZSIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwidXJsIiwiY2FsbGJhY2siLCJzZWxmIiwicGFyYW1zIiwiZmV0Y2hEYXRhU3VjY2VzcyIsInVuZGVmaW5lZCIsImFsZXJ0IiwiSnNvbmFyeSIsImdldERhdGEiLCJqRGF0YSIsInJlcXVlc3QiLCJwcm9wZXJ0eSIsInNjaGVtYXMiLCJkb2N1bWVudCIsInJhdyIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJnZXRFbXB0eURhdGEiLCJhZGRTY2hlbWEiLCJmdWxsU2NoZW1hIiwicmVzdWx0Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwiY2xvbmUiLCJwcm9wZXJ0aWVzIiwiZ2V0VHlwZVByb3BlcnR5IiwiYXR0cmlidXRlcyIsIm9iaiIsInRtcE9iaiIsImZvckVhY2giLCJrZXkiLCJnZXRSZXNvdXJjZVVybCIsInJlc291cmNlIiwiaWQiLCJ0YWJsZSIsImdldFJvd3NCeURhdGEiLCJyb3dzIiwicmVsYXRpb25zIiwicm93c1RvVGFibGVGb3JtYXQiLCJsaW5rcyIsImNvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJ0aXRsZSIsImF0dHJpYnV0ZU5hbWUiLCJuZXdEYXRhIiwiZm9ybSIsImdldEZpZWxkc0Zvcm0iLCJmaWVsZHMiLCJmaWVsZHNUb0Zvcm1Gb3JtYXQiLCJjYWxsYmFja0Zvcm1Db25maWciLCJ1bmlvbiIsImdldEZvcm1CdXR0b25CeVNjaGVtYSIsInRpdGxlTWFwcyIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJnZXRSZWxhdGlvblJlc291cmNlIiwiYmF0Y2hMb2FkRGF0YSIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJvd24iLCJyZWxhdGlvbnNoaXBzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsImxvYWRlZCIsInRvdGFsIiwiZGF0YVJlbGF0aW9ucyIsImRhdGFBdHRyaWJ1dGVzIiwiZG9jdW1lbnRTY2hlbWEiLCJyZXNvdXJjZUxpbmsiLCJwcm9wZXJ0eVZhbHVlIiwic2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiIsInNvdXJjZUVudW0iLCJpdGVtcyIsImVudW0iLCJlbnVtSXRlbSIsIm5hbWUiLCJpbnRlcnZhbCIsImNhbmNlbCIsImhheXN0YWNrIiwic2NoZW1hRnVsbCIsImhhc093blByb3BlcnR5IiwiQXJyYXkiLCJpc0FycmF5IiwiJHJlZiIsIk9iamVjdCIsImJ5U3RyaW5nIiwic3Vic3RyaW5nIiwicmVsYXRpb24iLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJ0bXAiLCJmaWVsZCIsImpvaW4iLCJmb3JPd24iLCJsaW5rIiwicmVzIiwicm93IiwidG1wUm93IiwicmVsSXRlbSIsInJlbEtleSIsImdldFJlbGF0aW9uTGluayIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJyZXNvdXJjZXMiLCJjYWNoZWQiLCJyZWwiLCJjb25zb2xlIiwibG9nIiwic3VjY2VzcyIsInNpemUiLCJraSIsImtyIiwia3JpIiwib25DbGljayIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiZ3JpZEZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwiZGlyZWN0aXZlIiwiZ3JpZEZvcm1EaXJlY3RpdmUiLCJyZXN0cmljdCIsImNvbnRyb2xsZXIiLCJncmlkRm9ybURpcmVjdGl2ZUN0cmwiLCIkc2NvcGUiLCJzZXRGb3JtU2NvcGUiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiYXR0ciIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztRQU1BLElBQUFBLElBQUEsR0FBQSxFQUFBLEM7UUFDQSxJQUFBO0FBQUEsWUFDQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsWUFBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBO0FBQUEsWUFDQUgsT0FBQSxDQUFBQyxNQUFBLENBQUEsY0FBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsY0FBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBQyxPQUFBLEdBQUFKLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUYsSUFBQSxDQUFBLEM7UUNqQkFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQ0FBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDJCQUFBLEVBQ0EsaUJBQ0Esa0NBREEsR0FFQSx5RUFGQSxHQUdBLFNBSEEsR0FJQSwyR0FKQSxHQUtBLDRCQUxBLEdBTUEsU0FOQSxHQU9BLE1BUEEsR0FRQSx5REFSQSxHQVNBLE9BVEEsR0FVQSxVQVZBLEdBV0EsU0FYQSxHQVlBLDhCQVpBLEdBYUEsb0NBYkEsR0FjQSx1RkFkQSxHQWVBLGtEQWZBLEdBZ0JBLHNDQWhCQSxHQWlCQSx5RUFqQkEsR0FrQkEsU0FsQkEsR0FtQkEsU0FuQkEsR0FvQkEsT0FwQkEsR0FxQkEsT0FyQkEsR0FzQkEsVUF0QkEsR0F1QkEsVUF2QkEsR0F3QkEsZUF6QkEsRUFEQTtBQUFBLGdCQTZCQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsMEJBQUEsRUFDQSxnQkFDQSxrQ0FEQSxHQUVBLHVFQUZBLEdBR0EsU0FIQSxHQUlBLE9BSkEsR0FLQSwyR0FMQSxHQU1BLFFBTkEsR0FPQSwrREFQQSxHQVFBLG9EQVJBLEdBU0EsZ0VBVEEsR0FVQSxTQVZBLEdBV0EsY0FaQSxFQTdCQTtBQUFBLGFBQUE7QUFBQSxTQUFBLEU7UUE2Q0FQLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQU8sT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUFJQVQsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBUyxRQUFBLENBQUEsYUFBQSxFQUFBQyxVQUFBLEU7UUFFQSxTQUFBQSxVQUFBLEdBQUE7QUFBQSxZQUNBLElBQUFDLElBQUEsRUFDQUMsTUFEQSxDQURBO0FBQUEsWUFJQSxJQUFBSCxRQUFBLEdBQUEsRUFDQUksSUFBQSxFQUFBQyxhQURBLEVBQUEsQ0FKQTtBQUFBLFlBUUFBLGFBQUEsQ0FBQUMsT0FBQSxHQUFBO0FBQUEsZ0JBQUEsVUFBQTtBQUFBLGdCQUFBLFdBQUE7QUFBQSxnQkFBQSxHQUFBO0FBQUEsYUFBQSxDQVJBO0FBQUEsWUFVQSxPQUFBTixRQUFBLENBVkE7QUFBQSxZQVlBLFNBQUFLLGFBQUEsQ0FBQUUsUUFBQSxFQUFBQyxTQUFBLEVBQUFDLENBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFDLEtBQUEsRUFDQUMsUUFBQSxHQUFBO0FBQUEsd0JBQ0FDLGNBQUEsRUFBQSxxQkFEQTtBQUFBLHdCQUVBQyxjQUFBLEVBQUEscUJBRkE7QUFBQSx3QkFHQUMsY0FBQSxFQUFBLHFCQUhBO0FBQUEsd0JBSUFDLFdBQUEsRUFBQSxvQkFKQTtBQUFBLHFCQURBLENBREE7QUFBQSxnQkFTQSxPQUFBO0FBQUEsb0JBQ0FDLFNBQUEsRUFBQSxNQURBO0FBQUEsb0JBRUFDLFVBQUEsRUFBQSxPQUZBO0FBQUEsb0JBR0FDLElBQUEsRUFBQSxFQUhBO0FBQUEsb0JBSUFDLE1BQUEsRUFBQSxFQUpBO0FBQUEsb0JBS0FDLE9BQUEsRUFBQUEsT0FMQTtBQUFBLG9CQU1BQyxRQUFBLEVBQUFBLFFBTkE7QUFBQSxvQkFPQUMsUUFBQSxFQUFBQSxRQVBBO0FBQUEsb0JBUUFDLFNBQUEsRUFBQUEsU0FSQTtBQUFBLG9CQVNBQyxVQUFBLEVBQUFBLFVBVEE7QUFBQSxvQkFVQUMsVUFBQSxFQUFBQSxVQVZBO0FBQUEsb0JBV0FDLFNBQUEsRUFBQUEsU0FYQTtBQUFBLG9CQVlBQyxRQUFBLEVBQUFBLFFBWkE7QUFBQSxvQkFhQUMsVUFBQSxFQUFBQSxVQWJBO0FBQUEsb0JBY0FDLFlBQUEsRUFBQUEsWUFkQTtBQUFBLG9CQWVBQyxXQUFBLEVBQUFBLFdBZkE7QUFBQSxvQkFnQkFDLGNBQUEsRUFBQUEsY0FoQkE7QUFBQSxvQkFpQkFDLGVBQUEsRUFBQUEsZUFqQkE7QUFBQSxvQkFrQkFDLGdCQUFBLEVBQUFDLGVBbEJBO0FBQUEsaUJBQUEsQ0FUQTtBQUFBLGdCQThCQSxTQUFBZCxPQUFBLENBQUFlLEtBQUEsRUFBQTtBQUFBLG9CQUNBakMsSUFBQSxHQUFBaUMsS0FBQSxDQURBO0FBQUEsaUJBOUJBO0FBQUEsZ0JBa0NBLFNBQUFaLFNBQUEsQ0FBQVksS0FBQSxFQUFBO0FBQUEsb0JBQ0FoQyxNQUFBLEdBQUFnQyxLQUFBLENBREE7QUFBQSxpQkFsQ0E7QUFBQSxnQkFzQ0EsU0FBQWQsUUFBQSxDQUFBZSxLQUFBLEVBQUE7QUFBQSxvQkFDQTFCLEtBQUEsR0FBQTBCLEtBQUEsQ0FEQTtBQUFBLGlCQXRDQTtBQUFBLGdCQTBDQSxTQUFBZCxRQUFBLEdBQUE7QUFBQSxvQkFDQSxPQUFBWixLQUFBLENBREE7QUFBQSxpQkExQ0E7QUFBQSxnQkE4Q0EsU0FBQWMsVUFBQSxDQUFBYSxLQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBMUIsUUFBQSxDQUFBMEIsS0FBQSxDQUFBLENBREE7QUFBQSxpQkE5Q0E7QUFBQSxnQkFrREEsU0FBQVosVUFBQSxDQUFBWSxLQUFBLEVBQUFDLE9BQUEsRUFBQTtBQUFBLG9CQUNBM0IsUUFBQSxDQUFBMEIsS0FBQSxJQUFBQyxPQUFBLENBREE7QUFBQSxpQkFsREE7QUFBQSxnQkF1REEsU0FBQVosU0FBQSxDQUFBYSxHQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFDLElBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSxvQkFJQSxJQUFBL0IsS0FBQSxDQUFBZ0MsTUFBQSxDQUFBeEIsSUFBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLHdCQUNBdUIsSUFBQSxDQUFBYixVQUFBLENBQUFXLEdBQUEsRUFBQUksZ0JBQUEsRUFEQTtBQUFBLHFCQUFBLE1BRUE7QUFBQSx3QkFDQUYsSUFBQSxDQUFBZCxRQUFBLENBQUFZLEdBQUEsRUFBQUksZ0JBQUEsRUFEQTtBQUFBLHFCQU5BO0FBQUEsb0JBVUEsU0FBQUEsZ0JBQUEsQ0FBQXpDLElBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsd0JBQ0FzQyxJQUFBLENBQUFyQixPQUFBLENBQUFsQixJQUFBLEVBREE7QUFBQSx3QkFFQXVDLElBQUEsQ0FBQWxCLFNBQUEsQ0FBQXBCLE1BQUEsRUFGQTtBQUFBLHdCQUlBLElBQUFxQyxRQUFBLEtBQUFJLFNBQUEsRUFBQTtBQUFBLDRCQUNBSixRQUFBLENBQUF0QyxJQUFBLEVBQUFDLE1BQUEsRUFEQTtBQUFBLHlCQUpBO0FBQUEscUJBVkE7QUFBQSxpQkF2REE7QUFBQSxnQkFpRkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUF3QixRQUFBLENBQUFZLEdBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsb0JBR0E7QUFBQSx3QkFBQTlCLEtBQUEsS0FBQWtDLFNBQUEsRUFBQTtBQUFBLHdCQUNBQyxLQUFBLENBQUEseUNBQUEsRUFEQTtBQUFBLHdCQUVBLE9BQUEsS0FBQSxDQUZBO0FBQUEscUJBSEE7QUFBQSxvQkFRQUMsT0FBQSxDQUFBQyxPQUFBLENBQUFSLEdBQUEsRUFBQSxVQUFBUyxLQUFBLEVBQUFDLE9BQUEsRUFBQTtBQUFBLHdCQUNBLElBQUEvQyxJQUFBLEdBQUE4QyxLQUFBLENBREE7QUFBQSx3QkFFQSxJQUFBN0MsTUFBQSxHQUFBNkMsS0FBQSxDQUFBRSxRQUFBLENBQUEsTUFBQSxFQUFBQyxPQUFBLEdBQUEsQ0FBQSxFQUFBakQsSUFBQSxDQUFBa0QsUUFBQSxDQUFBQyxHQUFBLENBQUFsQixLQUFBLEVBQUEsQ0FGQTtBQUFBLHdCQUlBLElBQUFLLFFBQUEsS0FBQUksU0FBQSxFQUFBO0FBQUEsNEJBQ0FKLFFBQUEsQ0FBQXRDLElBQUEsRUFBQUMsTUFBQSxFQUFBOEMsT0FBQSxFQURBO0FBQUEseUJBSkE7QUFBQSxxQkFBQSxFQVJBO0FBQUEsaUJBakZBO0FBQUEsZ0JBMEdBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQXJCLFVBQUEsQ0FBQVcsR0FBQSxFQUFBQyxRQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLHdCQUFBQyxJQUFBLEdBQUEsSUFBQSxDQUZBO0FBQUEsb0JBSUFLLE9BQUEsQ0FBQVEsU0FBQSxDQUFBZixHQUFBLEVBQUEsVUFBQWdCLE9BQUEsRUFBQTtBQUFBLHdCQUVBLElBQUFwRCxNQUFBLEdBQUFvRCxPQUFBLENBQUFyRCxJQUFBLENBQUFrRCxRQUFBLENBQUFDLEdBQUEsQ0FBQWxCLEtBQUEsRUFBQSxDQUZBO0FBQUEsd0JBR0EsSUFBQWpDLElBQUEsR0FBQTRDLE9BQUEsQ0FBQVUsTUFBQSxDQUFBQyxZQUFBLENBQUFGLE9BQUEsQ0FBQXJELElBQUEsQ0FBQWlDLEtBQUEsRUFBQSxFQUFBaEMsTUFBQSxDQUFBLENBQUEsQ0FIQTtBQUFBLHdCQUlBRCxJQUFBLENBQUFrRCxRQUFBLENBQUFiLEdBQUEsR0FBQUUsSUFBQSxDQUFBbkIsUUFBQSxHQUFBaUIsR0FBQSxDQUpBO0FBQUEsd0JBS0FyQyxJQUFBLENBQUF3RCxTQUFBLENBQUFILE9BQUEsRUFMQTtBQUFBLHdCQU9BLElBQUFmLFFBQUEsS0FBQUksU0FBQSxFQUFBO0FBQUEsNEJBQ0FKLFFBQUEsQ0FBQXRDLElBQUEsRUFBQUMsTUFBQSxFQURBO0FBQUEseUJBUEE7QUFBQSxxQkFBQSxFQUpBO0FBQUEsaUJBMUdBO0FBQUEsZ0JBNEhBLFNBQUFzRCxZQUFBLENBQUF0RCxNQUFBLEVBQUF3RCxVQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQyxNQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBQyxnQkFBQSxHQUFBQyxjQUFBLENBQUEzRCxNQUFBLEVBQUF3RCxVQUFBLENBQUEsQ0FGQTtBQUFBLG9CQUlBQyxNQUFBLEdBQUFuRCxDQUFBLENBQUFzRCxLQUFBLENBQUFGLGdCQUFBLENBQUFHLFVBQUEsQ0FBQSxDQUpBO0FBQUEsb0JBS0FKLE1BQUEsQ0FBQTFELElBQUEsR0FBQStELGVBQUEsQ0FBQXhELENBQUEsQ0FBQXNELEtBQUEsQ0FBQUYsZ0JBQUEsQ0FBQUcsVUFBQSxDQUFBOUQsSUFBQSxDQUFBOEQsVUFBQSxDQUFBLENBQUEsQ0FMQTtBQUFBLG9CQU1BSixNQUFBLENBQUExRCxJQUFBLENBQUFnRSxVQUFBLEdBQUFELGVBQUEsQ0FBQXhELENBQUEsQ0FBQXNELEtBQUEsQ0FBQUYsZ0JBQUEsQ0FBQUcsVUFBQSxDQUFBOUQsSUFBQSxDQUFBOEQsVUFBQSxDQUFBRSxVQUFBLENBQUFGLFVBQUEsQ0FBQSxDQUFBLENBTkE7QUFBQSxvQkFRQSxTQUFBQyxlQUFBLENBQUFFLEdBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFDLE1BQUEsR0FBQUQsR0FBQSxDQURBO0FBQUEsd0JBRUExRCxDQUFBLENBQUE0RCxPQUFBLENBQUFELE1BQUEsRUFBQSxVQUFBakMsS0FBQSxFQUFBbUMsR0FBQSxFQUFBO0FBQUEsNEJBQ0EsSUFBQW5DLEtBQUEsQ0FBQWpCLElBQUEsRUFBQTtBQUFBLGdDQUNBLFFBQUFpQixLQUFBLENBQUFqQixJQUFBO0FBQUEsZ0NBQ0EsS0FBQSxRQUFBO0FBQUEsb0NBQ0FrRCxNQUFBLENBQUFFLEdBQUEsSUFBQSxFQUFBLENBREE7QUFBQSxvQ0FFQSxNQUhBO0FBQUEsZ0NBSUEsS0FBQSxRQUFBO0FBQUEsb0NBQ0FGLE1BQUEsQ0FBQUUsR0FBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLG9DQUVBLE1BTkE7QUFBQSxnQ0FPQSxLQUFBLE9BQUE7QUFBQSxvQ0FDQUYsTUFBQSxDQUFBRSxHQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsb0NBRUEsTUFUQTtBQUFBLGdDQVVBLEtBQUEsU0FBQTtBQUFBLG9DQUNBRixNQUFBLENBQUFFLEdBQUEsSUFBQSxFQUFBLENBREE7QUFBQSxvQ0FFQSxNQVpBO0FBQUEsaUNBREE7QUFBQSw2QkFEQTtBQUFBLHlCQUFBLEVBRkE7QUFBQSx3QkFvQkEsT0FBQUYsTUFBQSxDQXBCQTtBQUFBLHFCQVJBO0FBQUEsb0JBOEJBLE9BQUFSLE1BQUEsQ0E5QkE7QUFBQSxpQkE1SEE7QUFBQSxnQkE2SkEsU0FBQVcsY0FBQSxDQUFBaEMsR0FBQSxFQUFBRyxNQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBa0IsTUFBQSxHQUFBckIsR0FBQSxDQURBO0FBQUEsb0JBR0EsSUFBQUcsTUFBQSxDQUFBOEIsUUFBQSxFQUFBO0FBQUEsd0JBQ0FaLE1BQUEsR0FBQXJCLEdBQUEsR0FBQSxHQUFBLEdBQUFHLE1BQUEsQ0FBQThCLFFBQUEsQ0FEQTtBQUFBLHFCQUhBO0FBQUEsb0JBT0EsSUFBQTlCLE1BQUEsQ0FBQXhCLElBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUF3QixNQUFBLENBQUF4QixJQUFBLEtBQUEsUUFBQSxJQUFBd0IsTUFBQSxDQUFBeEIsSUFBQSxLQUFBLE1BQUEsRUFBQTtBQUFBLDRCQUNBMEMsTUFBQSxJQUFBLE1BQUFsQixNQUFBLENBQUF4QixJQUFBLEdBQUEsR0FBQSxHQUFBd0IsTUFBQSxDQUFBK0IsRUFBQSxDQURBO0FBQUEseUJBQUEsTUFFQSxJQUFBL0IsTUFBQSxDQUFBeEIsSUFBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLDRCQUNBMEMsTUFBQSxJQUFBLDZCQUFBLENBREE7QUFBQSx5QkFIQTtBQUFBLHFCQVBBO0FBQUEsb0JBY0EsT0FBQUEsTUFBQSxDQWRBO0FBQUEsaUJBN0pBO0FBQUEsZ0JBOEtBLFNBQUEvQixZQUFBLENBQUFXLFFBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFDLElBQUEsR0FBQSxJQUFBLEVBQ0EvQixLQUFBLEdBQUErQixJQUFBLENBQUFuQixRQUFBLEVBREEsRUFFQWlCLEdBRkEsQ0FGQTtBQUFBLG9CQU1BQSxHQUFBLEdBQUFnQyxjQUFBLENBQUE3RCxLQUFBLENBQUE2QixHQUFBLEVBQUE3QixLQUFBLENBQUFnQyxNQUFBLENBQUEsQ0FOQTtBQUFBLG9CQVFBbkMsUUFBQSxDQUFBLFlBQUE7QUFBQSx3QkFDQWtDLElBQUEsQ0FBQWYsU0FBQSxDQUFBYSxHQUFBLEVBQUFJLGdCQUFBLEVBREE7QUFBQSxxQkFBQSxFQVJBO0FBQUEsb0JBWUEsU0FBQUEsZ0JBQUEsQ0FBQXpDLElBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQTBELGdCQUFBLEdBQUFDLGNBQUEsQ0FBQTVELElBQUEsQ0FBQWlELE9BQUEsR0FBQSxDQUFBLEVBQUFqRCxJQUFBLENBQUFpQyxLQUFBLEVBQUEsRUFBQWhDLE1BQUEsQ0FBQSxDQUZBO0FBQUEsd0JBSUFzQyxJQUFBLENBQUF2QixJQUFBLEdBQUF1QixJQUFBLENBQUF4QixVQUFBLENBSkE7QUFBQSx3QkFLQSxJQUFBLENBQUF3QixJQUFBLENBQUF0QixNQUFBLENBQUF1RCxLQUFBLEVBQUE7QUFBQSw0QkFDQWpDLElBQUEsQ0FBQXRCLE1BQUEsQ0FBQXVELEtBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx5QkFMQTtBQUFBLHdCQVVBQyxhQUFBLENBQUF6RSxJQUFBLEVBQUEsVUFBQTBFLElBQUEsRUFBQUMsU0FBQSxFQUFBO0FBQUEsNEJBRUFwQyxJQUFBLENBQUF0QixNQUFBLENBQUF1RCxLQUFBLENBQUFFLElBQUEsR0FBQUUsaUJBQUEsQ0FBQUYsSUFBQSxDQUFBLENBRkE7QUFBQSw0QkFHQW5DLElBQUEsQ0FBQXRCLE1BQUEsQ0FBQXVELEtBQUEsQ0FBQUssS0FBQSxHQUFBN0UsSUFBQSxDQUFBNkUsS0FBQSxFQUFBLENBSEE7QUFBQSw0QkFJQXRDLElBQUEsQ0FBQXRCLE1BQUEsQ0FBQXVELEtBQUEsQ0FBQU0sT0FBQSxHQUFBQyxrQkFBQSxDQUFBcEIsZ0JBQUEsQ0FBQSxDQUpBO0FBQUEsNEJBS0FwQixJQUFBLENBQUF0QixNQUFBLENBQUF1RCxLQUFBLENBQUFNLE9BQUEsQ0FBQXhGLElBQUEsQ0FBQTtBQUFBLGdDQUNBMEYsS0FBQSxFQUFBLFNBREE7QUFBQSxnQ0FFQWhFLElBQUEsRUFBQSxRQUZBO0FBQUEsZ0NBR0FpRSxhQUFBLEVBQUEsT0FIQTtBQUFBLDZCQUFBLEVBTEE7QUFBQSw0QkFXQSxJQUFBM0MsUUFBQSxLQUFBSSxTQUFBLEVBQUE7QUFBQSxnQ0FDQUosUUFBQSxDQUFBQyxJQUFBLENBQUF0QixNQUFBLENBQUF1RCxLQUFBLEVBREE7QUFBQSw2QkFYQTtBQUFBLHlCQUFBLEVBVkE7QUFBQSxxQkFaQTtBQUFBLGlCQTlLQTtBQUFBLGdCQTROQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBNUMsV0FBQSxDQUFBVSxRQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLHdCQUFBQyxJQUFBLEdBQUEsSUFBQSxFQUNBL0IsS0FBQSxHQUFBK0IsSUFBQSxDQUFBbkIsUUFBQSxFQURBLEVBRUFpQixHQUZBLENBRkE7QUFBQSxvQkFNQUEsR0FBQSxHQUFBZ0MsY0FBQSxDQUFBN0QsS0FBQSxDQUFBNkIsR0FBQSxFQUFBN0IsS0FBQSxDQUFBZ0MsTUFBQSxDQUFBLENBTkE7QUFBQSxvQkFRQW5DLFFBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0FrQyxJQUFBLENBQUFmLFNBQUEsQ0FBQWEsR0FBQSxFQUFBSSxnQkFBQSxFQURBO0FBQUEscUJBQUEsRUFSQTtBQUFBLG9CQVlBLFNBQUFBLGdCQUFBLENBQUF6QyxJQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFpRixPQUFBLEdBQUFsRixJQUFBLENBQUFnRCxRQUFBLENBQUEsTUFBQSxFQUFBQSxRQUFBLENBQUEsWUFBQSxDQUFBLENBREE7QUFBQSx3QkFFQSxJQUFBVyxnQkFBQSxHQUFBQyxjQUFBLENBQUFzQixPQUFBLENBQUFqQyxPQUFBLEdBQUEsQ0FBQSxFQUFBakQsSUFBQSxDQUFBaUMsS0FBQSxFQUFBLEVBQUFoQyxNQUFBLENBQUEsQ0FGQTtBQUFBLHdCQUlBc0MsSUFBQSxDQUFBdkIsSUFBQSxHQUFBdUIsSUFBQSxDQUFBekIsU0FBQSxDQUpBO0FBQUEsd0JBS0EsSUFBQSxDQUFBeUIsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxFQUFBO0FBQUEsNEJBQ0E1QyxJQUFBLENBQUF0QixNQUFBLENBQUFrRSxJQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEseUJBTEE7QUFBQSx3QkFTQUMsYUFBQSxDQUFBcEYsSUFBQSxFQUFBLFVBQUFxRixNQUFBLEVBQUFWLFNBQUEsRUFBQTtBQUFBLDRCQUVBcEMsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxDQUFBTixLQUFBLEdBQUE3RSxJQUFBLENBQUE2RSxLQUFBLEVBQUEsQ0FGQTtBQUFBLDRCQUdBdEMsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxDQUFBbEYsTUFBQSxHQUFBMEQsZ0JBQUEsQ0FIQTtBQUFBLDRCQUlBcEIsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxDQUFBM0UsS0FBQSxHQUFBOEUsa0JBQUEsQ0FBQUQsTUFBQSxDQUFBLENBSkE7QUFBQSw0QkFNQTlDLElBQUEsQ0FBQVYsY0FBQSxDQUFBN0IsSUFBQSxFQUFBdUYsa0JBQUEsRUFOQTtBQUFBLDRCQVFBLFNBQUFBLGtCQUFBLENBQUF0RSxNQUFBLEVBQUE7QUFBQSxnQ0FDQXNCLElBQUEsQ0FBQXRCLE1BQUEsQ0FBQWtFLElBQUEsQ0FBQUEsSUFBQSxHQUFBbEUsTUFBQSxDQURBO0FBQUEsZ0NBSUE7QUFBQSxnQ0FBQXNCLElBQUEsQ0FBQXRCLE1BQUEsQ0FBQWtFLElBQUEsQ0FBQUEsSUFBQSxHQUFBNUUsQ0FBQSxDQUFBaUYsS0FBQSxDQUFBakQsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxDQUFBQSxJQUFBLEVBQUFNLHFCQUFBLENBQUF6RixJQUFBLENBQUFnRCxRQUFBLENBQUEsTUFBQSxFQUFBNkIsS0FBQSxFQUFBLENBQUEsQ0FBQSxDQUpBO0FBQUEsZ0NBTUEsSUFBQXZDLFFBQUEsS0FBQUksU0FBQSxFQUFBO0FBQUEsb0NBQ0FKLFFBQUEsQ0FBQUMsSUFBQSxDQUFBdEIsTUFBQSxDQUFBa0UsSUFBQSxFQURBO0FBQUEsaUNBTkE7QUFBQSw2QkFSQTtBQUFBLHlCQUFBLEVBVEE7QUFBQSxxQkFaQTtBQUFBLGlCQTVOQTtBQUFBLGdCQTBRQSxTQUFBdEQsY0FBQSxDQUFBN0IsSUFBQSxFQUFBc0MsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUMsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUdBLElBQUFtQixNQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsb0JBS0FuQixJQUFBLENBQUFULGVBQUEsQ0FBQTlCLElBQUEsQ0FBQWdELFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxVQUFBMEMsU0FBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQTFCLFVBQUEsR0FBQUosY0FBQSxDQUNBNUQsSUFBQSxDQUFBZ0QsUUFBQSxDQUFBLE1BQUEsRUFBQUMsT0FBQSxHQUFBLENBQUEsRUFBQWpELElBQUEsQ0FBQWlDLEtBQUEsRUFEQSxFQUVBakMsSUFBQSxDQUFBaUQsT0FBQSxHQUFBLENBQUEsRUFBQWpELElBQUEsQ0FBQWtELFFBQUEsQ0FBQUMsR0FBQSxDQUFBbEIsS0FBQSxFQUZBLEVBR0E2QixVQUhBLENBR0FFLFVBSEEsQ0FHQUYsVUFIQSxDQUZBO0FBQUEsd0JBT0F2RCxDQUFBLENBQUE0RCxPQUFBLENBQUFILFVBQUEsRUFBQSxVQUFBL0IsS0FBQSxFQUFBbUMsR0FBQSxFQUFBO0FBQUEsNEJBQ0EsSUFBQXNCLFNBQUEsQ0FBQXRCLEdBQUEsQ0FBQSxFQUFBO0FBQUEsZ0NBQ0FWLE1BQUEsQ0FBQXBFLElBQUEsQ0FBQTtBQUFBLG9DQUNBOEUsR0FBQSxFQUFBQSxHQURBO0FBQUEsb0NBRUF1QixRQUFBLEVBQUFELFNBQUEsQ0FBQXRCLEdBQUEsQ0FGQTtBQUFBLGlDQUFBLEVBREE7QUFBQSw2QkFBQSxNQUtBO0FBQUEsZ0NBQ0FWLE1BQUEsQ0FBQXBFLElBQUEsQ0FBQSxFQUNBOEUsR0FBQSxFQUFBQSxHQURBLEVBQUEsRUFEQTtBQUFBLDZCQU5BO0FBQUEseUJBQUEsRUFQQTtBQUFBLHdCQW9CQTlCLFFBQUEsQ0FBQW9CLE1BQUEsRUFwQkE7QUFBQSxxQkFBQSxFQUxBO0FBQUEsaUJBMVFBO0FBQUEsZ0JBd1NBLFNBQUEwQixhQUFBLENBQUFwRixJQUFBLEVBQUFzQyxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBK0MsTUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQU8sUUFBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUlBUCxNQUFBLEdBQUFyRixJQUFBLENBQUFnRCxRQUFBLENBQUEsTUFBQSxDQUFBLENBSkE7QUFBQSxvQkFLQTRDLFFBQUEsQ0FBQXRHLElBQUEsQ0FBQXVHLG1CQUFBLENBQUE3RixJQUFBLENBQUFnRCxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFMQTtBQUFBLG9CQU9BOEMsYUFBQSxDQUFBRixRQUFBLEVBQUFHLFdBQUEsRUFQQTtBQUFBLG9CQVNBLFNBQUFBLFdBQUEsQ0FBQUMsaUJBQUEsRUFBQTtBQUFBLHdCQUVBLElBQUF0QyxNQUFBLEdBQUE7QUFBQSw0QkFDQXVDLEdBQUEsRUFBQVosTUFEQTtBQUFBLDRCQUVBYSxhQUFBLEVBQUEzRixDQUFBLENBQUE0RixTQUFBLENBQUFILGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsVUFBQUksQ0FBQSxFQUFBO0FBQUEsZ0NBQ0E3RixDQUFBLENBQUE0RCxPQUFBLENBQUFpQyxDQUFBLEVBQUEsVUFBQUMsSUFBQSxFQUFBQyxLQUFBLEVBQUE7QUFBQSxvQ0FDQUYsQ0FBQSxDQUFBRSxLQUFBLElBQUFELElBQUEsQ0FBQXJHLElBQUEsQ0FEQTtBQUFBLGlDQUFBLEVBREE7QUFBQSxnQ0FJQSxPQUFBb0csQ0FBQSxDQUpBO0FBQUEsNkJBQUEsQ0FGQTtBQUFBLHlCQUFBLENBRkE7QUFBQSx3QkFZQTlELFFBQUEsQ0FBQW9CLE1BQUEsRUFaQTtBQUFBLHFCQVRBO0FBQUEsaUJBeFNBO0FBQUEsZ0JBaVVBLFNBQUE1QixlQUFBLENBQUE5QixJQUFBLEVBQUFzQyxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQyxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBR0EsSUFBQW1ELFNBQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxvQkFJQSxJQUFBYSxNQUFBLEdBQUEsQ0FBQSxDQUpBO0FBQUEsb0JBS0EsSUFBQUMsS0FBQSxHQUFBLENBQUEsQ0FMQTtBQUFBLG9CQU9BLElBQUFDLGFBQUEsR0FBQXpHLElBQUEsQ0FBQWdELFFBQUEsQ0FBQSxlQUFBLENBQUEsQ0FQQTtBQUFBLG9CQVFBLElBQUEwRCxjQUFBLEdBQUExRyxJQUFBLENBQUFnRCxRQUFBLENBQUEsWUFBQSxDQUFBLENBUkE7QUFBQSxvQkFTQSxJQUFBMkIsU0FBQSxHQUFBOEIsYUFBQSxDQUFBeEUsS0FBQSxFQUFBLENBVEE7QUFBQSxvQkFVQSxJQUFBK0IsVUFBQSxHQUFBMEMsY0FBQSxDQUFBekUsS0FBQSxFQUFBLENBVkE7QUFBQSxvQkFZQSxJQUFBMEUsY0FBQSxHQUFBRixhQUFBLENBQUF4RCxPQUFBLEdBQUEsQ0FBQSxFQUFBakQsSUFBQSxDQUFBa0QsUUFBQSxDQUFBQyxHQUFBLENBQUFsQixLQUFBLEVBQUEsQ0FaQTtBQUFBLG9CQWNBMUIsQ0FBQSxDQUFBNEQsT0FBQSxDQUFBUSxTQUFBLEVBQUEsVUFBQTBCLElBQUEsRUFBQWpDLEdBQUEsRUFBQTtBQUFBLHdCQUVBLElBQUF3QyxZQUFBLEdBQUFQLElBQUEsQ0FBQXhCLEtBQUEsQ0FBQXRDLElBQUEsQ0FGQTtBQUFBLHdCQUlBO0FBQUEsNEJBQUEwQyxhQUFBLEdBQUF3QixhQUFBLENBQUF6RCxRQUFBLENBQUFvQixHQUFBLEVBQUFuQixPQUFBLEdBQUEsQ0FBQSxFQUFBakQsSUFBQSxDQUFBNkcsYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUpBO0FBQUEsd0JBS0EsSUFBQUMseUJBQUEsR0FBQXZFLElBQUEsQ0FBQVIsZ0JBQUEsQ0FBQTJFLGNBQUEsQ0FBQXpELE9BQUEsR0FBQSxDQUFBLEVBQUFqRCxJQUFBLENBQUFpQyxLQUFBLEVBQUEsRUFBQTBFLGNBQUEsRUFBQSxZQUFBLEVBQUF2QyxHQUFBLENBQUEsQ0FMQTtBQUFBLHdCQU9BLElBQUEyQyxVQUFBLEdBQUEsRUFBQSxDQVBBO0FBQUEsd0JBUUEsSUFBQUQseUJBQUEsQ0FBQUUsS0FBQSxJQUFBRix5QkFBQSxDQUFBRSxLQUFBLENBQUFDLElBQUEsRUFBQTtBQUFBLDRCQUNBRixVQUFBLEdBQUFELHlCQUFBLENBQUFFLEtBQUEsQ0FBQUMsSUFBQSxDQURBO0FBQUEseUJBQUEsTUFFQSxJQUFBSCx5QkFBQSxDQUFBRyxJQUFBLEVBQUE7QUFBQSw0QkFDQUYsVUFBQSxHQUFBRCx5QkFBQSxDQUFBRyxJQUFBLENBREE7QUFBQSx5QkFWQTtBQUFBLHdCQWNBLElBQUFGLFVBQUEsRUFBQTtBQUFBLDRCQUVBckIsU0FBQSxDQUFBdEIsR0FBQSxJQUFBLEVBQUEsQ0FGQTtBQUFBLDRCQUlBN0QsQ0FBQSxDQUFBNEQsT0FBQSxDQUFBNEMsVUFBQSxFQUFBLFVBQUFHLFFBQUEsRUFBQTtBQUFBLGdDQUNBLElBQUE3RSxHQUFBLEdBQUF1RSxZQUFBLEdBQUEsUUFBQSxHQUFBTSxRQUFBLENBREE7QUFBQSxnQ0FFQTNFLElBQUEsQ0FBQWQsUUFBQSxDQUFBWSxHQUFBLEVBQUEsVUFBQXJDLElBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsb0NBQ0F5RixTQUFBLENBQUF0QixHQUFBLEVBQUE5RSxJQUFBLENBQUE7QUFBQSx3Q0FDQTJDLEtBQUEsRUFBQWlGLFFBREE7QUFBQSx3Q0FFQUMsSUFBQSxFQUFBbkgsSUFBQSxDQUFBZ0QsUUFBQSxDQUFBLE1BQUEsRUFBQUEsUUFBQSxDQUFBLFlBQUEsRUFBQTZELGFBQUEsQ0FBQTVCLGFBQUEsS0FBQWlDLFFBRkE7QUFBQSxxQ0FBQSxFQURBO0FBQUEsb0NBS0FYLE1BQUEsR0FMQTtBQUFBLGlDQUFBLEVBRkE7QUFBQSxnQ0FTQUMsS0FBQSxHQVRBO0FBQUEsNkJBQUEsRUFKQTtBQUFBLHlCQWRBO0FBQUEscUJBQUEsRUFkQTtBQUFBLG9CQStDQSxJQUFBWSxRQUFBLEdBQUE5RyxTQUFBLENBQUEsWUFBQTtBQUFBLHdCQUNBLElBQUFrRyxLQUFBLEtBQUFELE1BQUEsRUFBQTtBQUFBLDRCQUNBakcsU0FBQSxDQUFBK0csTUFBQSxDQUFBRCxRQUFBLEVBREE7QUFBQSw0QkFFQSxJQUFBOUUsUUFBQSxLQUFBSSxTQUFBLEVBQUE7QUFBQSxnQ0FDQUosUUFBQSxDQUFBb0QsU0FBQSxFQURBO0FBQUEsNkJBRkE7QUFBQSx5QkFEQTtBQUFBLHFCQUFBLEVBT0EsR0FQQSxDQUFBLENBL0NBO0FBQUEsaUJBalVBO0FBQUEsZ0JBaVlBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBMUQsZUFBQSxDQUFBc0YsUUFBQSxFQUFBQyxVQUFBLEVBQUE7QUFBQSxvQkFDQSxTQUFBbkQsR0FBQSxJQUFBa0QsUUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQUEsUUFBQSxDQUFBRSxjQUFBLENBQUFwRCxHQUFBLENBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUEsT0FBQWtELFFBQUEsQ0FBQWxELEdBQUEsQ0FBQSxLQUFBLFFBQUEsSUFBQSxDQUFBcUQsS0FBQSxDQUFBQyxPQUFBLENBQUFKLFFBQUEsQ0FBQWxELEdBQUEsQ0FBQSxDQUFBLElBQUFrRCxRQUFBLENBQUFsRCxHQUFBLEVBQUF1RCxJQUFBLEVBQUE7QUFBQSxnQ0FDQUwsUUFBQSxDQUFBbEQsR0FBQSxJQUFBd0QsTUFBQSxDQUFBQyxRQUFBLENBQUFOLFVBQUEsRUFBQUQsUUFBQSxDQUFBbEQsR0FBQSxFQUFBdUQsSUFBQSxDQUFBRyxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLGdDQUVBOUYsZUFBQSxDQUFBc0YsUUFBQSxDQUFBbEQsR0FBQSxDQUFBLEVBQUFtRCxVQUFBLEVBRkE7QUFBQSw2QkFEQTtBQUFBLDRCQUtBLElBQUEsT0FBQUQsUUFBQSxDQUFBbEQsR0FBQSxDQUFBLEtBQUEsUUFBQSxJQUFBLENBQUFxRCxLQUFBLENBQUFDLE9BQUEsQ0FBQUosUUFBQSxDQUFBbEQsR0FBQSxDQUFBLENBQUEsSUFBQWtELFFBQUEsQ0FBQWxELEdBQUEsTUFBQSxPQUFBLEVBQUE7QUFBQSxnQ0FDQXBDLGVBQUEsQ0FBQXNGLFFBQUEsQ0FBQWxELEdBQUEsQ0FBQSxFQUFBbUQsVUFBQSxFQURBO0FBQUEsNkJBTEE7QUFBQSx5QkFEQTtBQUFBLHFCQURBO0FBQUEsb0JBWUEsT0FBQUQsUUFBQSxDQVpBO0FBQUEsaUJBallBO0FBQUEsZ0JBc1pBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBMUQsY0FBQSxDQUFBM0QsTUFBQSxFQUFBc0gsVUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQTVELGdCQUFBLEdBQUExRCxNQUFBLENBREE7QUFBQSxvQkFHQTBELGdCQUFBLEdBQUEzQixlQUFBLENBQUEyQixnQkFBQSxFQUFBNEQsVUFBQSxDQUFBLENBSEE7QUFBQSxvQkFLQSxPQUFBNUQsZ0JBQUEsQ0FMQTtBQUFBLGlCQXRaQTtBQUFBLGdCQW9hQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQW9CLGtCQUFBLENBQUFwQixnQkFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUQsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFvQixPQUFBLEdBQUFuQixnQkFBQSxDQUFBRyxVQUFBLENBQUE5RCxJQUFBLENBQUFnSCxLQUFBLENBQUFsRCxVQUFBLENBQUFFLFVBQUEsQ0FBQUYsVUFBQSxDQUZBO0FBQUEsb0JBS0F2RCxDQUFBLENBQUE0RCxPQUFBLENBQUFXLE9BQUEsRUFBQSxVQUFBN0MsS0FBQSxFQUFBbUMsR0FBQSxFQUFBO0FBQUEsd0JBQ0FuQyxLQUFBLENBQUFnRCxhQUFBLEdBQUFiLEdBQUEsQ0FEQTtBQUFBLHdCQUVBVixNQUFBLENBQUFwRSxJQUFBLENBQUEyQyxLQUFBLEVBRkE7QUFBQSxxQkFBQSxFQUxBO0FBQUEsb0JBbUJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwyQkFBQXlCLE1BQUEsQ0FuQkE7QUFBQSxpQkFwYUE7QUFBQSxnQkEyYkEsU0FBQTRCLGtCQUFBLENBQUFoQixRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBdEUsSUFBQSxHQUFBc0UsUUFBQSxDQUFBMkIsR0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQVosTUFBQSxHQUFBckYsSUFBQSxDQUFBZ0QsUUFBQSxDQUFBLFlBQUEsRUFBQWYsS0FBQSxFQUFBLENBRkE7QUFBQSxvQkFJQTFCLENBQUEsQ0FBQTRELE9BQUEsQ0FBQUcsUUFBQSxDQUFBNEIsYUFBQSxFQUFBLFVBQUE2QixRQUFBLEVBQUEzRCxHQUFBLEVBQUE7QUFBQSx3QkFDQWlCLE1BQUEsQ0FBQWpCLEdBQUEsSUFBQTdELENBQUEsQ0FBQXlILEdBQUEsQ0FBQUQsUUFBQSxFQUFBLFVBQUFFLFlBQUEsRUFBQTtBQUFBLDRCQUNBLE9BQUFBLFlBQUEsQ0FBQWpGLFFBQUEsQ0FBQSxNQUFBLEVBQUE2RCxhQUFBLENBQUEsSUFBQSxDQUFBLENBREE7QUFBQSx5QkFBQSxDQUFBLENBREE7QUFBQSx3QkFLQTtBQUFBLDRCQUFBLENBQUFZLEtBQUEsQ0FBQUMsT0FBQSxDQUFBMUgsSUFBQSxDQUFBZ0QsUUFBQSxDQUFBLGVBQUEsRUFBQUEsUUFBQSxDQUFBb0IsR0FBQSxFQUFBeUMsYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUE7QUFBQSw0QkFDQXhCLE1BQUEsQ0FBQWpCLEdBQUEsSUFBQWlCLE1BQUEsQ0FBQWpCLEdBQUEsRUFBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLHlCQUxBO0FBQUEscUJBQUEsRUFKQTtBQUFBLG9CQWNBLE9BQUFpQixNQUFBLENBZEE7QUFBQSxpQkEzYkE7QUFBQSxnQkFrZEE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUFULGlCQUFBLENBQUFGLElBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFoQixNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUFuRCxDQUFBLENBQUE0RCxPQUFBLENBQUFPLElBQUEsRUFBQSxVQUFBSixRQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBdEUsSUFBQSxHQUFBc0UsUUFBQSxDQUFBMkIsR0FBQSxDQURBO0FBQUEsd0JBRUEsSUFBQWlDLEdBQUEsR0FBQWxJLElBQUEsQ0FBQWdELFFBQUEsQ0FBQSxZQUFBLEVBQUFmLEtBQUEsRUFBQSxDQUZBO0FBQUEsd0JBSUExQixDQUFBLENBQUE0RCxPQUFBLENBQUFHLFFBQUEsQ0FBQTRCLGFBQUEsRUFBQSxVQUFBNkIsUUFBQSxFQUFBM0QsR0FBQSxFQUFBO0FBQUEsNEJBQ0E4RCxHQUFBLENBQUE5RCxHQUFBLElBQUE3RCxDQUFBLENBQUF5SCxHQUFBLENBQUFELFFBQUEsRUFBQSxVQUFBRSxZQUFBLEVBQUE7QUFBQSxnQ0FDQSxJQUFBRSxLQUFBLEdBQUE3RCxRQUFBLENBQUEyQixHQUFBLENBQUFqRCxRQUFBLENBQUEsZUFBQSxFQUFBQSxRQUFBLENBQUFvQixHQUFBLEVBQUFuQixPQUFBLEdBQUEsQ0FBQSxFQUFBakQsSUFBQSxDQUFBNkcsYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQURBO0FBQUEsZ0NBTUE7QUFBQTtBQUFBO0FBQUEsb0NBQUFzQixLQUFBLEVBQUE7QUFBQSxvQ0FDQSxPQUFBRixZQUFBLENBQUFqRixRQUFBLENBQUEsTUFBQSxFQUFBQSxRQUFBLENBQUEsWUFBQSxFQUFBNkQsYUFBQSxDQUFBc0IsS0FBQSxDQUFBLENBREE7QUFBQSxpQ0FOQTtBQUFBLGdDQVNBLE9BQUFGLFlBQUEsQ0FBQWpGLFFBQUEsQ0FBQSxNQUFBLEVBQUE2RCxhQUFBLENBQUEsSUFBQSxDQUFBLENBVEE7QUFBQSw2QkFBQSxFQVdBdUIsSUFYQSxDQVdBLElBWEEsQ0FBQSxDQURBO0FBQUEseUJBQUEsRUFKQTtBQUFBLHdCQW1CQUYsR0FBQSxDQUFBckQsS0FBQSxHQUFBLEVBQUEsQ0FuQkE7QUFBQSx3QkFvQkF0RSxDQUFBLENBQUE4SCxNQUFBLENBQUFySSxJQUFBLENBQUE2RSxLQUFBLEVBQUEsRUFBQSxVQUFBeUQsSUFBQSxFQUFBO0FBQUEsNEJBQ0FKLEdBQUEsQ0FBQXJELEtBQUEsQ0FBQXZGLElBQUEsQ0FBQWdKLElBQUEsRUFEQTtBQUFBLHlCQUFBLEVBcEJBO0FBQUEsd0JBdUJBNUUsTUFBQSxDQUFBcEUsSUFBQSxDQUFBNEksR0FBQSxFQXZCQTtBQUFBLHFCQUFBLEVBRkE7QUFBQSxvQkEyQkEsT0FBQXhFLE1BQUEsQ0EzQkE7QUFBQSxpQkFsZEE7QUFBQSxnQkFzZkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUFlLGFBQUEsQ0FBQXpFLElBQUEsRUFBQXNDLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFvQyxJQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQWtCLFFBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxvQkFHQTVGLElBQUEsQ0FBQWdELFFBQUEsQ0FBQSxNQUFBLEVBQUFnRSxLQUFBLENBQUEsVUFBQVYsS0FBQSxFQUFBckUsS0FBQSxFQUFBO0FBQUEsd0JBRUEyRCxRQUFBLENBQUF0RyxJQUFBLENBQUF1RyxtQkFBQSxDQUFBNUQsS0FBQSxDQUFBLEVBRkE7QUFBQSx3QkFJQXlDLElBQUEsQ0FBQXBGLElBQUEsQ0FBQTJDLEtBQUEsRUFKQTtBQUFBLHFCQUFBLEVBSEE7QUFBQSxvQkFVQTZELGFBQUEsQ0FBQUYsUUFBQSxFQUFBRyxXQUFBLEVBVkE7QUFBQSxvQkFZQSxTQUFBQSxXQUFBLENBQUFDLGlCQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBdUMsR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHdCQUdBaEksQ0FBQSxDQUFBNEQsT0FBQSxDQUFBTyxJQUFBLEVBQUEsVUFBQThELEdBQUEsRUFBQWxDLEtBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUFtQyxNQUFBLEdBQUE7QUFBQSxnQ0FDQXhDLEdBQUEsRUFBQXVDLEdBREE7QUFBQSxnQ0FFQXRDLGFBQUEsRUFBQTNGLENBQUEsQ0FBQTRGLFNBQUEsQ0FBQUgsaUJBQUEsQ0FBQU0sS0FBQSxDQUFBLEVBQUEsVUFBQUYsQ0FBQSxFQUFBO0FBQUEsb0NBQ0E3RixDQUFBLENBQUE0RCxPQUFBLENBQUFpQyxDQUFBLEVBQUEsVUFBQUMsSUFBQSxFQUFBQyxLQUFBLEVBQUE7QUFBQSx3Q0FDQUYsQ0FBQSxDQUFBRSxLQUFBLElBQUFELElBQUEsQ0FBQXJHLElBQUEsQ0FEQTtBQUFBLHFDQUFBLEVBREE7QUFBQSxvQ0FJQSxPQUFBb0csQ0FBQSxDQUpBO0FBQUEsaUNBQUEsQ0FGQTtBQUFBLDZCQUFBLENBREE7QUFBQSw0QkFXQW1DLEdBQUEsQ0FBQWpKLElBQUEsQ0FBQW1KLE1BQUEsRUFYQTtBQUFBLHlCQUFBLEVBSEE7QUFBQSx3QkFpQkFuRyxRQUFBLENBQUFpRyxHQUFBLEVBakJBO0FBQUEscUJBWkE7QUFBQSxpQkF0ZkE7QUFBQSxnQkE4aEJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBMUMsbUJBQUEsQ0FBQTdGLElBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUEyRSxTQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBakIsTUFBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUlBLElBQUFpQixTQUFBLEdBQUEzRSxJQUFBLENBQUFnRCxRQUFBLENBQUEsZUFBQSxFQUFBZixLQUFBLEVBQUEsRUFBQTtBQUFBLHdCQUNBMUIsQ0FBQSxDQUFBNEQsT0FBQSxDQUFBUSxTQUFBLEVBQUEsVUFBQStELE9BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsNEJBQ0FqRixNQUFBLENBQUFpRixNQUFBLElBQUFDLGVBQUEsQ0FBQUYsT0FBQSxDQUFBLENBREE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBSkE7QUFBQSxvQkFTQSxPQUFBaEYsTUFBQSxDQVRBO0FBQUEsaUJBOWhCQTtBQUFBLGdCQWdrQkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQWtGLGVBQUEsQ0FBQUYsT0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQXBFLFFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSxvQkFHQSxJQUFBbUQsS0FBQSxDQUFBQyxPQUFBLENBQUFnQixPQUFBLENBQUExSSxJQUFBLENBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUE2SSxTQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsd0JBRUF0SSxDQUFBLENBQUE0RCxPQUFBLENBQUF1RSxPQUFBLENBQUExSSxJQUFBLEVBQUEsVUFBQThJLE9BQUEsRUFBQTtBQUFBLDRCQUVBRCxTQUFBLENBQUF2SixJQUFBLENBQUE7QUFBQSxnQ0FDQStDLEdBQUEsRUFBQWdDLGNBQUEsQ0FBQXFFLE9BQUEsQ0FBQTdELEtBQUEsQ0FBQXRDLElBQUEsRUFBQTtBQUFBLG9DQUFBdkIsSUFBQSxFQUFBLE1BQUE7QUFBQSxvQ0FBQXVELEVBQUEsRUFBQXVFLE9BQUEsQ0FBQXZFLEVBQUE7QUFBQSxpQ0FBQSxDQURBO0FBQUEsNkJBQUEsRUFGQTtBQUFBLHlCQUFBLEVBRkE7QUFBQSx3QkFRQUQsUUFBQSxHQUFBdUUsU0FBQSxDQVJBO0FBQUEscUJBQUEsTUFVQTtBQUFBLHdCQUNBdkUsUUFBQSxHQUFBLENBQUE7QUFBQSxnQ0FDQWpDLEdBQUEsRUFBQWdDLGNBQUEsQ0FBQXFFLE9BQUEsQ0FBQTdELEtBQUEsQ0FBQXRDLElBQUEsRUFBQTtBQUFBLG9DQUFBdkIsSUFBQSxFQUFBLE1BQUE7QUFBQSxvQ0FBQXVELEVBQUEsRUFBQW1FLE9BQUEsQ0FBQTFJLElBQUEsQ0FBQXVFLEVBQUE7QUFBQSxpQ0FBQSxDQURBO0FBQUEsNkJBQUEsQ0FBQSxDQURBO0FBQUEscUJBYkE7QUFBQSxvQkFrQkEsT0FBQUQsUUFBQSxDQWxCQTtBQUFBLGlCQWhrQkE7QUFBQSxnQkEybEJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBd0IsYUFBQSxDQUFBRixRQUFBLEVBQUF0RCxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBb0IsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFxRixTQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQUMsTUFBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLG9CQUlBLElBQUF4QyxLQUFBLEdBQUEsQ0FBQSxDQUpBO0FBQUEsb0JBS0EsSUFBQUQsTUFBQSxHQUFBLENBQUEsQ0FMQTtBQUFBLG9CQU9BaEcsQ0FBQSxDQUFBNEQsT0FBQSxDQUFBeUIsUUFBQSxFQUFBLFVBQUFTLElBQUEsRUFBQTtBQUFBLHdCQUNBOUYsQ0FBQSxDQUFBNEQsT0FBQSxDQUFBa0MsSUFBQSxFQUFBLFVBQUE0QyxHQUFBLEVBQUE7QUFBQSw0QkFDQTFJLENBQUEsQ0FBQTRELE9BQUEsQ0FBQThFLEdBQUEsRUFBQSxVQUFBUCxPQUFBLEVBQUE7QUFBQSxnQ0FDQSxJQUFBTSxNQUFBLENBQUFOLE9BQUEsQ0FBQXJHLEdBQUEsQ0FBQSxFQUFBO0FBQUEsb0NBQ0E2RyxPQUFBLENBQUFDLEdBQUEsQ0FBQSxPQUFBLEVBREE7QUFBQSxvQ0FFQTNDLEtBQUEsR0FGQTtBQUFBLGlDQUFBLE1BR0E7QUFBQSxvQ0FDQS9FLFFBQUEsQ0FBQWlILE9BQUEsQ0FBQXJHLEdBQUEsRUFBQStHLE9BQUEsRUFEQTtBQUFBLG9DQUVBSixNQUFBLENBQUFOLE9BQUEsQ0FBQXJHLEdBQUEsSUFBQSxFQUFBLENBRkE7QUFBQSxvQ0FHQW1FLEtBQUEsR0FIQTtBQUFBLG9DQUlBRCxNQUFBLEdBSkE7QUFBQSxpQ0FKQTtBQUFBLDZCQUFBLEVBREE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBQUEsRUFQQTtBQUFBLG9CQXVCQSxJQUFBYSxRQUFBLEdBQUE5RyxTQUFBLENBQUEsWUFBQTtBQUFBLHdCQUNBLElBQUFDLENBQUEsQ0FBQThJLElBQUEsQ0FBQU4sU0FBQSxNQUFBeEMsTUFBQSxFQUFBO0FBQUEsNEJBQ0FqRyxTQUFBLENBQUErRyxNQUFBLENBQUFELFFBQUEsRUFEQTtBQUFBLDRCQUdBN0csQ0FBQSxDQUFBNEQsT0FBQSxDQUFBeUIsUUFBQSxFQUFBLFVBQUFTLElBQUEsRUFBQWlELEVBQUEsRUFBQTtBQUFBLGdDQUNBL0ksQ0FBQSxDQUFBNEQsT0FBQSxDQUFBa0MsSUFBQSxFQUFBLFVBQUE0QyxHQUFBLEVBQUFNLEVBQUEsRUFBQTtBQUFBLG9DQUNBaEosQ0FBQSxDQUFBNEQsT0FBQSxDQUFBOEUsR0FBQSxFQUFBLFVBQUFQLE9BQUEsRUFBQWMsR0FBQSxFQUFBO0FBQUEsd0NBQ0E5RixNQUFBLENBQUE0RixFQUFBLElBQUE1RixNQUFBLENBQUE0RixFQUFBLEtBQUEsRUFBQSxDQURBO0FBQUEsd0NBRUE1RixNQUFBLENBQUE0RixFQUFBLEVBQUFDLEVBQUEsSUFBQTdGLE1BQUEsQ0FBQTRGLEVBQUEsRUFBQUMsRUFBQSxLQUFBLEVBQUEsQ0FGQTtBQUFBLHdDQUdBN0YsTUFBQSxDQUFBNEYsRUFBQSxFQUFBQyxFQUFBLEVBQUFDLEdBQUEsSUFBQVQsU0FBQSxDQUFBTCxPQUFBLENBQUFyRyxHQUFBLENBQUEsQ0FIQTtBQUFBLHFDQUFBLEVBREE7QUFBQSxpQ0FBQSxFQURBO0FBQUEsNkJBQUEsRUFIQTtBQUFBLDRCQWFBQyxRQUFBLENBQUFvQixNQUFBLEVBYkE7QUFBQSx5QkFEQTtBQUFBLHFCQUFBLEVBZ0JBLEdBaEJBLENBQUEsQ0F2QkE7QUFBQSxvQkEwQ0EsU0FBQTBGLE9BQUEsQ0FBQXBKLElBQUEsRUFBQUMsTUFBQSxFQUFBOEMsT0FBQSxFQUFBO0FBQUEsd0JBQ0FnRyxTQUFBLENBQUEvSSxJQUFBLENBQUFrRCxRQUFBLENBQUFiLEdBQUEsSUFBQTtBQUFBLDRCQUNBckMsSUFBQSxFQUFBQSxJQURBO0FBQUEsNEJBRUFDLE1BQUEsRUFBQUEsTUFGQTtBQUFBLHlCQUFBLENBREE7QUFBQSx3QkFLQWlKLE9BQUEsQ0FBQUMsR0FBQSxDQUFBLE1BQUEsRUFMQTtBQUFBLHFCQTFDQTtBQUFBLGlCQTNsQkE7QUFBQSxnQkFtcEJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQTFELHFCQUFBLENBQUFaLEtBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFuQixNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUFuRCxDQUFBLENBQUE0RCxPQUFBLENBQUFVLEtBQUEsRUFBQSxVQUFBNUMsS0FBQSxFQUFBO0FBQUEsd0JBQ0F5QixNQUFBLENBQUFwRSxJQUFBLENBQUE7QUFBQSw0QkFDQTBCLElBQUEsRUFBQSxRQURBO0FBQUEsNEJBRUFnRSxLQUFBLEVBQUEvQyxLQUFBLENBQUErQyxLQUZBO0FBQUEsNEJBR0FzRCxJQUFBLEVBQUFyRyxLQUhBO0FBQUEsNEJBSUF3SCxPQUFBLEVBQUEsb0JBSkE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBQUEsRUFGQTtBQUFBLG9CQVVBLE9BQUEvRixNQUFBLENBVkE7QUFBQSxpQkFucEJBO0FBQUEsYUFaQTtBQUFBLFM7UUErcUJBa0UsTUFBQSxDQUFBQyxRQUFBLEdBQUEsVUFBQTVELEdBQUEsRUFBQXlGLElBQUEsRUFBQTtBQUFBLFlBQ0FBLElBQUEsR0FBQUEsSUFBQSxDQUFBQyxPQUFBLENBQUEsV0FBQSxFQUFBLEtBQUEsQ0FBQSxDQURBO0FBQUEsWUFFQTtBQUFBLFlBQUFELElBQUEsR0FBQUEsSUFBQSxDQUFBQyxPQUFBLENBQUEsVUFBQSxFQUFBLEtBQUEsQ0FBQSxDQUZBO0FBQUEsWUFHQTtBQUFBLFlBQUFELElBQUEsR0FBQUEsSUFBQSxDQUFBQyxPQUFBLENBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUhBO0FBQUEsWUFJQTtBQUFBLGdCQUFBQyxDQUFBLEdBQUFGLElBQUEsQ0FBQUcsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUpBO0FBQUEsWUFLQSxLQUFBLElBQUFDLENBQUEsR0FBQSxDQUFBLEVBQUExRCxDQUFBLEdBQUF3RCxDQUFBLENBQUFHLE1BQUEsQ0FBQSxDQUFBRCxDQUFBLEdBQUExRCxDQUFBLEVBQUEsRUFBQTBELENBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFFLENBQUEsR0FBQUosQ0FBQSxDQUFBRSxDQUFBLENBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUFFLENBQUEsSUFBQS9GLEdBQUEsRUFBQTtBQUFBLG9CQUNBQSxHQUFBLEdBQUFBLEdBQUEsQ0FBQStGLENBQUEsQ0FBQSxDQURBO0FBQUEsaUJBQUEsTUFFQTtBQUFBLG9CQUNBLE9BREE7QUFBQSxpQkFKQTtBQUFBLGFBTEE7QUFBQSxZQWFBLE9BQUEvRixHQUFBLENBYkE7QUFBQSxTQUFBLEM7UUNsdUJBN0UsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBTyxPQUFBLENBQUEsb0JBQUEsRUFBQXFLLGdCQUFBLEU7UUFDQUEsZ0JBQUEsQ0FBQTdKLE9BQUEsR0FBQTtBQUFBLFlBQUEsT0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUE2SixnQkFBQSxDQUFBQyxLQUFBLEVBQUFuSyxVQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsVUFBQXVJLElBQUEsRUFBQTZCLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUEzSCxNQUFBLEdBQUE7QUFBQSxvQkFDQTRILE1BQUEsRUFBQTlCLElBQUEsQ0FBQThCLE1BREE7QUFBQSxvQkFFQS9ILEdBQUEsRUFBQWlHLElBQUEsQ0FBQStCLElBRkE7QUFBQSxvQkFHQXJLLElBQUEsRUFBQW1LLEtBQUEsQ0FBQTNKLEtBSEE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBT0EySixLQUFBLENBQUFHLFVBQUEsQ0FBQSxvQkFBQSxFQVBBO0FBQUEsZ0JBUUEsSUFBQSxDQUFBSCxLQUFBLENBQUFJLFNBQUEsQ0FBQUMsUUFBQSxDQUFBQyxNQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBLEtBQUEsQ0FEQTtBQUFBLGlCQVJBO0FBQUEsZ0JBWUFQLEtBQUEsQ0FBQTFILE1BQUEsRUFBQWtJLElBQUEsQ0FBQUMsbUJBQUEsRUFBQUMsaUJBQUEsRUFaQTtBQUFBLGdCQWNBLFNBQUFELG1CQUFBLEdBQUE7QUFBQSxvQkFDQTVLLFVBQUEsQ0FBQTZCLFdBQUEsQ0FBQSxVQUFBdUQsSUFBQSxFQUFBO0FBQUEsd0JBQ0FnRixLQUFBLENBQUFsSyxNQUFBLEdBQUFrRixJQUFBLENBQUFsRixNQUFBLENBREE7QUFBQSx3QkFFQWtLLEtBQUEsQ0FBQWhGLElBQUEsR0FBQUEsSUFBQSxDQUFBQSxJQUFBLENBRkE7QUFBQSx3QkFHQWdGLEtBQUEsQ0FBQTNKLEtBQUEsR0FBQTJFLElBQUEsQ0FBQTNFLEtBQUEsQ0FIQTtBQUFBLHdCQUtBMkosS0FBQSxDQUFBVSxNQUFBLENBQUF2TCxJQUFBLENBQUE7QUFBQSw0QkFDQTBCLElBQUEsRUFBQSxTQURBO0FBQUEsNEJBRUE4SixHQUFBLEVBQUEvSyxVQUFBLENBQUF1QixVQUFBLENBQUEsZ0JBQUEsQ0FGQTtBQUFBLHlCQUFBLEVBTEE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBZEE7QUFBQSxnQkEyQkEsU0FBQXNKLGlCQUFBLENBQUFyQyxHQUFBLEVBQUE7QUFBQSxvQkFDQTRCLEtBQUEsQ0FBQVUsTUFBQSxDQUFBdkwsSUFBQSxDQUFBO0FBQUEsd0JBQ0EwQixJQUFBLEVBQUEsUUFEQTtBQUFBLHdCQUVBOEosR0FBQSxFQUFBdkMsR0FBQSxDQUFBd0MsVUFBQSxJQUFBaEwsVUFBQSxDQUFBdUIsVUFBQSxDQUFBLGFBQUEsQ0FGQTtBQUFBLHFCQUFBLEVBREE7QUFBQSxpQkEzQkE7QUFBQSxhQUFBLENBREE7QUFBQSxTO1FDRkFsQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFPLE9BQUEsQ0FBQSxvQkFBQSxFQUFBb0wsZ0JBQUEsRTtRQUNBQSxnQkFBQSxDQUFBNUssT0FBQSxHQUFBO0FBQUEsWUFBQSxPQUFBO0FBQUEsWUFBQSxhQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQTRLLGdCQUFBLENBQUFkLEtBQUEsRUFBQW5LLFVBQUEsRUFBQTtBQUFBLFlBQ0EsT0FBQSxVQUFBdUksSUFBQSxFQUFBNkIsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQTNILE1BQUEsR0FBQTtBQUFBLG9CQUNBNEgsTUFBQSxFQUFBOUIsSUFBQSxDQUFBOEIsTUFEQTtBQUFBLG9CQUVBL0gsR0FBQSxFQUFBaUcsSUFBQSxDQUFBK0IsSUFGQTtBQUFBLGlCQUFBLENBREE7QUFBQSxnQkFNQUgsS0FBQSxDQUFBMUgsTUFBQSxFQUFBa0ksSUFBQSxDQUFBTyxtQkFBQSxFQUFBQyxpQkFBQSxFQU5BO0FBQUEsZ0JBUUEsU0FBQUQsbUJBQUEsR0FBQTtBQUFBLG9CQUNBLElBQUFsTCxVQUFBLENBQUFpQixJQUFBLEtBQUFqQixVQUFBLENBQUFnQixVQUFBLEVBQUE7QUFBQSx3QkFDQWhCLFVBQUEsQ0FBQTRCLFlBQUEsQ0FBQSxVQUFBNkMsS0FBQSxFQUFBO0FBQUEsNEJBQ0EyRixLQUFBLENBQUF6RixJQUFBLEdBQUFGLEtBQUEsQ0FBQUUsSUFBQSxDQURBO0FBQUEsNEJBRUF5RixLQUFBLENBQUFyRixPQUFBLEdBQUFOLEtBQUEsQ0FBQU0sT0FBQSxDQUZBO0FBQUEsNEJBR0FxRixLQUFBLENBQUF0RixLQUFBLEdBQUFMLEtBQUEsQ0FBQUssS0FBQSxDQUhBO0FBQUEseUJBQUEsRUFEQTtBQUFBLHFCQUFBLE1BTUEsSUFBQTlFLFVBQUEsQ0FBQWlCLElBQUEsS0FBQWpCLFVBQUEsQ0FBQWUsU0FBQSxFQUFBO0FBQUEsd0JBQ0FxSixLQUFBLENBQUFnQixRQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEscUJBUEE7QUFBQSxvQkFXQWhCLEtBQUEsQ0FBQVUsTUFBQSxDQUFBdkwsSUFBQSxDQUFBO0FBQUEsd0JBQ0EwQixJQUFBLEVBQUEsU0FEQTtBQUFBLHdCQUVBOEosR0FBQSxFQUFBL0ssVUFBQSxDQUFBdUIsVUFBQSxDQUFBLGdCQUFBLENBRkE7QUFBQSxxQkFBQSxFQVhBO0FBQUEsaUJBUkE7QUFBQSxnQkEwQkEsU0FBQTRKLGlCQUFBLENBQUEzQyxHQUFBLEVBQUE7QUFBQSxvQkFDQTRCLEtBQUEsQ0FBQVUsTUFBQSxDQUFBdkwsSUFBQSxDQUFBO0FBQUEsd0JBQ0EwQixJQUFBLEVBQUEsUUFEQTtBQUFBLHdCQUVBOEosR0FBQSxFQUFBdkMsR0FBQSxDQUFBd0MsVUFBQSxJQUFBaEwsVUFBQSxDQUFBdUIsVUFBQSxDQUFBLGFBQUEsQ0FGQTtBQUFBLHFCQUFBLEVBREE7QUFBQSxpQkExQkE7QUFBQSxhQUFBLENBREE7QUFBQSxTO1FDRkFsQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFPLE9BQUEsQ0FBQSxrQkFBQSxFQUFBd0wsY0FBQSxFO1FBQ0FBLGNBQUEsQ0FBQWhMLE9BQUEsR0FBQSxDQUFBLFdBQUEsQ0FBQSxDO1FBQ0EsU0FBQWdMLGNBQUEsQ0FBQUMsU0FBQSxFQUFBO0FBQUEsWUFDQSxPQUFBLFVBQUEvQyxJQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBZ0QsWUFBQSxHQUFBaEQsSUFBQSxDQUFBaUQsVUFBQSxDQUFBdkwsSUFBQSxDQUFBNkcsYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQTJFLFVBQUEsR0FBQUYsWUFBQSxDQUFBM0IsT0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBOEIsS0FBQSxFQUFBQyxFQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBcEQsSUFBQSxDQUFBcUQsV0FBQSxDQUFBOUUsYUFBQSxDQUFBNkUsRUFBQSxDQUFBLENBREE7QUFBQSxpQkFBQSxDQUFBLENBRkE7QUFBQSxnQkFNQUwsU0FBQSxDQUFBaEosR0FBQSxDQUFBbUosVUFBQSxFQU5BO0FBQUEsYUFBQSxDQURBO0FBQUEsUztRQ0RBO0FBQUEsUUFBQXBNLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQVMsUUFBQSxDQUFBLGNBQUEsRUFBQThMLFdBQUEsRTtRQUNBQSxXQUFBLENBQUF4TCxPQUFBLEdBQUEsRUFBQSxDO1FBQ0EsU0FBQXdMLFdBQUEsR0FBQTtBQUFBLFlBRUEsSUFBQTlMLFFBQUEsR0FBQTtBQUFBLGdCQUNBK0wsT0FBQSxFQUFBLEVBREE7QUFBQSxnQkFFQTNMLElBQUEsRUFBQTRMLGNBRkE7QUFBQSxhQUFBLENBRkE7QUFBQSxZQU9BQSxjQUFBLENBQUExTCxPQUFBLEdBQUE7QUFBQSxnQkFBQSxrQkFBQTtBQUFBLGdCQUFBLG9CQUFBO0FBQUEsZ0JBQUEsb0JBQUE7QUFBQSxnQkFBQSxvQkFBQTtBQUFBLGFBQUEsQ0FQQTtBQUFBLFlBUUEsT0FBQU4sUUFBQSxDQVJBO0FBQUEsWUFVQSxTQUFBZ00sY0FBQSxDQUFBQyxVQUFBLEVBQUFDLFlBQUEsRUFBQUMsWUFBQSxFQUFBQyxZQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLHFCQUFBTCxPQUFBLEdBQUE7QUFBQSxvQkFDQU0sVUFBQSxFQUFBSixVQURBO0FBQUEsb0JBRUFLLFVBQUEsRUFBQUwsVUFGQTtBQUFBLG9CQUdBTSxRQUFBLEVBQUFOLFVBSEE7QUFBQSxvQkFJQU8sSUFBQSxFQUFBUCxVQUpBO0FBQUEsb0JBS0FRLE1BQUEsRUFBQVAsWUFMQTtBQUFBLG9CQU1BUSxNQUFBLEVBQUFQLFlBTkE7QUFBQSxvQkFPQTNJLE1BQUEsRUFBQTRJLFlBUEE7QUFBQSxpQkFBQSxDQUZBO0FBQUEsZ0JBV0EsT0FBQTtBQUFBLG9CQUNBTyxNQUFBLEVBQUEsVUFBQW5FLElBQUEsRUFBQTZCLEtBQUEsRUFBQTtBQUFBLHdCQUNBLEtBQUEwQixPQUFBLENBQUF2RCxJQUFBLENBQUFpRCxVQUFBLENBQUF2TCxJQUFBLENBQUE2RyxhQUFBLENBQUEsS0FBQSxDQUFBLEVBQUF5QixJQUFBLEVBQUE2QixLQUFBLEVBREE7QUFBQSxxQkFBQSxDQUVBdUMsSUFGQSxDQUVBLElBRkEsQ0FEQTtBQUFBLGlCQUFBLENBWEE7QUFBQSxhQVZBO0FBQUEsUztRQ0hBdE4sT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBTyxPQUFBLENBQUEsb0JBQUEsRUFBQStNLGdCQUFBLEU7UUFDQUEsZ0JBQUEsQ0FBQXZNLE9BQUEsR0FBQTtBQUFBLFlBQUEsT0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUF1TSxnQkFBQSxDQUFBekMsS0FBQSxFQUFBbkssVUFBQSxFQUFBO0FBQUEsWUFDQSxPQUFBLFVBQUF1SSxJQUFBLEVBQUE2QixLQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBM0gsTUFBQSxHQUFBO0FBQUEsb0JBQ0E0SCxNQUFBLEVBQUE5QixJQUFBLENBQUE4QixNQURBO0FBQUEsb0JBRUEvSCxHQUFBLEVBQUFpRyxJQUFBLENBQUErQixJQUZBO0FBQUEsb0JBR0FySyxJQUFBLEVBQUFtSyxLQUFBLENBQUEzSixLQUhBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQU9BMkosS0FBQSxDQUFBRyxVQUFBLENBQUEsb0JBQUEsRUFQQTtBQUFBLGdCQVFBLElBQUEsQ0FBQUgsS0FBQSxDQUFBSSxTQUFBLENBQUFDLFFBQUEsQ0FBQUMsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxLQUFBLENBREE7QUFBQSxpQkFSQTtBQUFBLGdCQVlBUCxLQUFBLENBQUExSCxNQUFBLEVBQUFrSSxJQUFBLENBQUFrQyxtQkFBQSxFQUFBQyxpQkFBQSxFQVpBO0FBQUEsZ0JBY0EsU0FBQUQsbUJBQUEsR0FBQTtBQUFBLG9CQUNBN00sVUFBQSxDQUFBNkIsV0FBQSxDQUFBLFVBQUF1RCxJQUFBLEVBQUE7QUFBQSx3QkFDQWdGLEtBQUEsQ0FBQWxLLE1BQUEsR0FBQWtGLElBQUEsQ0FBQWxGLE1BQUEsQ0FEQTtBQUFBLHdCQUVBa0ssS0FBQSxDQUFBaEYsSUFBQSxHQUFBQSxJQUFBLENBQUFBLElBQUEsQ0FGQTtBQUFBLHdCQUdBZ0YsS0FBQSxDQUFBM0osS0FBQSxHQUFBMkUsSUFBQSxDQUFBM0UsS0FBQSxDQUhBO0FBQUEsd0JBSUEySixLQUFBLENBQUFVLE1BQUEsQ0FBQXZMLElBQUEsQ0FBQTtBQUFBLDRCQUNBMEIsSUFBQSxFQUFBLFNBREE7QUFBQSw0QkFFQThKLEdBQUEsRUFBQS9LLFVBQUEsQ0FBQXVCLFVBQUEsQ0FBQSxnQkFBQSxDQUZBO0FBQUEseUJBQUEsRUFKQTtBQUFBLHFCQUFBLEVBREE7QUFBQSxpQkFkQTtBQUFBLGdCQTBCQSxTQUFBdUwsaUJBQUEsQ0FBQXRFLEdBQUEsRUFBQTtBQUFBLG9CQUNBNEIsS0FBQSxDQUFBVSxNQUFBLENBQUF2TCxJQUFBLENBQUE7QUFBQSx3QkFDQTBCLElBQUEsRUFBQSxRQURBO0FBQUEsd0JBRUE4SixHQUFBLEVBQUF2QyxHQUFBLENBQUF3QyxVQUFBLElBQUFoTCxVQUFBLENBQUF1QixVQUFBLENBQUEsYUFBQSxDQUZBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQTFCQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFM7UUNGQWxDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQXlOLFNBQUEsQ0FBQSxVQUFBLEVBQUFDLGlCQUFBLEU7UUFHQTtBQUFBLGlCQUFBQSxpQkFBQSxHQUFBO0FBQUEsWUFDQSxJQUFBRCxTQUFBLEdBQUE7QUFBQSxnQkFDQUUsUUFBQSxFQUFBLEdBREE7QUFBQSxnQkFFQXJELE9BQUEsRUFBQSxJQUZBO0FBQUEsZ0JBR0FzRCxVQUFBLEVBQUFDLHFCQUhBO0FBQUEsYUFBQSxDQURBO0FBQUEsWUFPQUEscUJBQUEsQ0FBQTlNLE9BQUEsR0FBQTtBQUFBLGdCQUFBLFFBQUE7QUFBQSxnQkFBQSxhQUFBO0FBQUEsZ0JBQUEsY0FBQTtBQUFBLGFBQUEsQ0FQQTtBQUFBLFlBU0EsT0FBQTBNLFNBQUEsQ0FUQTtBQUFBLFlBV0EsU0FBQUkscUJBQUEsQ0FBQUMsTUFBQSxFQUFBcE4sVUFBQSxFQUFBNkwsV0FBQSxFQUFBO0FBQUEsZ0JBQ0F1QixNQUFBLENBQUF0QyxNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBR0FzQyxNQUFBLENBQUE1QyxTQUFBLEdBQUEsRUFDQUMsUUFBQSxFQUFBLEVBREEsRUFBQSxDQUhBO0FBQUEsZ0JBT0EyQyxNQUFBLENBQUFDLFlBQUEsR0FBQSxVQUFBakQsS0FBQSxFQUFBO0FBQUEsb0JBQ0FnRCxNQUFBLENBQUE1QyxTQUFBLEdBQUFKLEtBQUEsQ0FEQTtBQUFBLGlCQUFBLENBUEE7QUFBQSxnQkFXQXBLLFVBQUEsQ0FBQTZCLFdBQUEsQ0FBQSxVQUFBdUQsSUFBQSxFQUFBO0FBQUEsb0JBQ0FnSSxNQUFBLENBQUFsTixNQUFBLEdBQUFrRixJQUFBLENBQUFsRixNQUFBLENBREE7QUFBQSxvQkFFQWtOLE1BQUEsQ0FBQWhJLElBQUEsR0FBQUEsSUFBQSxDQUFBQSxJQUFBLENBRkE7QUFBQSxvQkFHQWdJLE1BQUEsQ0FBQTNNLEtBQUEsR0FBQTJFLElBQUEsQ0FBQTNFLEtBQUEsQ0FIQTtBQUFBLG9CQUlBMk0sTUFBQSxDQUFBdEksS0FBQSxHQUFBTSxJQUFBLENBQUFOLEtBQUEsQ0FKQTtBQUFBLG9CQUtBc0ksTUFBQSxDQUFBRSxPQUFBLEdBTEE7QUFBQSxpQkFBQSxFQVhBO0FBQUEsZ0JBbUJBRixNQUFBLENBQUFHLElBQUEsR0FBQSxVQUFBQyxNQUFBLEVBQUFwSSxJQUFBLEVBQUE7QUFBQSxvQkFDQXlHLFdBQUEsQ0FBQWEsTUFBQSxDQUFBdEgsSUFBQSxDQUFBbUQsSUFBQSxFQUFBNkUsTUFBQSxFQURBO0FBQUEsaUJBQUEsQ0FuQkE7QUFBQSxnQkF1QkFBLE1BQUEsQ0FBQUssRUFBQSxHQUFBLFVBQUFsRixJQUFBLEVBQUE7QUFBQSxvQkFDQXNELFdBQUEsQ0FBQWEsTUFBQSxDQUFBbkUsSUFBQSxFQUFBNkUsTUFBQSxFQURBO0FBQUEsaUJBQUEsQ0F2QkE7QUFBQSxnQkEyQkFBLE1BQUEsQ0FBQU0sVUFBQSxHQUFBLFVBQUFuSCxLQUFBLEVBQUE7QUFBQSxvQkFDQTZHLE1BQUEsQ0FBQXRDLE1BQUEsQ0FBQTZDLE1BQUEsQ0FBQXBILEtBQUEsRUFBQSxDQUFBLEVBREE7QUFBQSxpQkFBQSxDQTNCQTtBQUFBLGFBWEE7QUFBQSxTO1FDSEFsSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUF5TixTQUFBLENBQUEsV0FBQSxFQUFBYSxrQkFBQSxFO1FBRUFBLGtCQUFBLENBQUF2TixPQUFBLEdBQUE7QUFBQSxZQUFBLGFBQUE7QUFBQSxZQUFBLGNBQUE7QUFBQSxTQUFBLEM7UUFHQTtBQUFBLGlCQUFBdU4sa0JBQUEsQ0FBQTVOLFVBQUEsRUFBQTZMLFdBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQWtCLFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBQyxVQUFBLEVBQUFXLHNCQUZBO0FBQUEsYUFBQSxDQURBO0FBQUEsWUFNQUEsc0JBQUEsQ0FBQXhOLE9BQUEsR0FBQSxDQUFBLFFBQUEsQ0FBQSxDQU5BO0FBQUEsWUFRQSxPQUFBME0sU0FBQSxDQVJBO0FBQUEsWUFVQSxTQUFBYyxzQkFBQSxDQUFBVCxNQUFBLEVBQUE7QUFBQSxnQkFDQUEsTUFBQSxDQUFBdEMsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUdBOUssVUFBQSxDQUFBNEIsWUFBQSxDQUFBLFVBQUE2QyxLQUFBLEVBQUE7QUFBQSxvQkFDQTJJLE1BQUEsQ0FBQXpJLElBQUEsR0FBQUYsS0FBQSxDQUFBRSxJQUFBLENBREE7QUFBQSxvQkFFQXlJLE1BQUEsQ0FBQXJJLE9BQUEsR0FBQU4sS0FBQSxDQUFBTSxPQUFBLENBRkE7QUFBQSxvQkFHQXFJLE1BQUEsQ0FBQXRJLEtBQUEsR0FBQUwsS0FBQSxDQUFBSyxLQUFBLENBSEE7QUFBQSxvQkFJQXNJLE1BQUEsQ0FBQUUsT0FBQSxHQUpBO0FBQUEsaUJBQUEsRUFIQTtBQUFBLGdCQVVBRixNQUFBLENBQUFHLElBQUEsR0FBQSxVQUFBaEYsSUFBQSxFQUFBO0FBQUEsb0JBQ0FzRCxXQUFBLENBQUFhLE1BQUEsQ0FBQW5FLElBQUEsRUFBQTZFLE1BQUEsRUFEQTtBQUFBLGlCQUFBLENBVkE7QUFBQSxnQkFjQUEsTUFBQSxDQUFBTSxVQUFBLEdBQUEsVUFBQW5ILEtBQUEsRUFBQTtBQUFBLG9CQUNBNkcsTUFBQSxDQUFBdEMsTUFBQSxDQUFBNkMsTUFBQSxDQUFBcEgsS0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLGlCQUFBLENBZEE7QUFBQSxhQVZBO0FBQUEsUztRQ0xBbEgsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBeU4sU0FBQSxDQUFBLFNBQUEsRUFBQWUsZ0JBQUEsRTtRQUVBLFNBQUFBLGdCQUFBLEdBQUE7QUFBQSxZQUNBLElBQUFmLFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBYyxRQUFBLEVBQUEsdUNBRkE7QUFBQSxnQkFHQTNELEtBQUEsRUFBQSxFQUNBNEQsU0FBQSxFQUFBLFlBREEsRUFIQTtBQUFBLGdCQU1BZCxVQUFBLEVBQUFlLG9CQU5BO0FBQUEsZ0JBT0ExRixJQUFBLEVBQUEsVUFBQTZCLEtBQUEsRUFBQThELEVBQUEsRUFBQUMsSUFBQSxFQUFBQyxJQUFBLEVBQUE7QUFBQSxpQkFQQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFlBYUFILG9CQUFBLENBQUE1TixPQUFBLEdBQUE7QUFBQSxnQkFBQSxRQUFBO0FBQUEsZ0JBQUEsYUFBQTtBQUFBLGFBQUEsQ0FiQTtBQUFBLFlBZUEsT0FBQTBNLFNBQUEsQ0FmQTtBQUFBLFlBaUJBLFNBQUFrQixvQkFBQSxDQUFBYixNQUFBLEVBQUFwTixVQUFBLEVBQUE7QUFBQSxnQkFDQW9OLE1BQUEsQ0FBQWlCLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQWpCLE1BQUEsQ0FBQVksU0FBQSxDQUFBdkwsTUFBQSxDQUFBeEIsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFqQixVQUFBLENBQUFvQixRQUFBLENBQUFnTSxNQUFBLENBQUFZLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUyIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpOyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJyxcbiAgICAnPGdyaWQtdGFibGU+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8dGFibGUgY2xhc3M9XCJ0YWJsZSBncmlkXCI+JytcbiAgICAgICAgJzx0aGVhZD4nK1xuICAgICAgICAgICc8dHI+JytcbiAgICAgICAgICAgICc8dGggbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj57e2NvbHVtbi50aXRsZX19PC90aD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3RoZWFkPicrXG4gICAgICAgICc8dGJvZHk+JytcbiAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAgICAgICAgICc8dGQgbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1wiPicrXG4gICAgICAgICAgICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gcm93LmxpbmtzXCI+JyArXG4gICAgICAgICAgICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAnPC90ZD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3Rib2R5PicrXG4gICAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPidcbiAgKTtcblxuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCcsXG4gICAgJzxncmlkLWZvcm0+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImdvKGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxkaXY+JyArXG4gICAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzwvZGl2PicgK1xuICAgICAgJzxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cImdyaWRGb3JtXCIgbmctaW5pdD1cInNldEZvcm1TY29wZSh0aGlzKVwiJyArXG4gICAgICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICAgICAnY2xhc3M9XCJmb3JtLWhvcml6b250YWxcIiByb2xlPVwiZm9ybVwiIG5nLWlmPVwiaGlkZUZvcm0gIT09IHRydWVcIj4nK1xuICAgICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuICB2YXIgZGF0YSxcbiAgICAgIHNjaGVtYTtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldCgkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXREYXRhOiBzZXREYXRhLFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0U2NoZW1hOiBzZXRTY2hlbWEsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiByZXBsYWNlRnJvbUZ1bGxcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0RGF0YSh2YWx1ZSkge1xuICAgICAgZGF0YSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFNjaGVtYSh2YWx1ZSkge1xuICAgICAgc2NoZW1hID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgc2VsZi5sb2FkU2NoZW1hKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5zZXREYXRhKGRhdGEpO1xuICAgICAgICBzZWxmLnNldFNjaGVtYShzY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBpZiAobW9kZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGVydCgnUGxlYXNlIHNldCBtb2RlbCBiZWZvcmUgY2FsbCBmZXRjaCBkYXRhJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24gKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbiAoalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXMpKTtcblxuICAgICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdG1wT2JqO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSZXNvdXJjZVVybCh1cmwsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgICAgaWYgKHBhcmFtcy5yZXNvdXJjZSkge1xuICAgICAgICByZXN1bHQgPSB1cmwgKyAnLycgKyBwYXJhbXMucmVzb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSkge1xuICAgICAgICBpZiAocGFyYW1zLnR5cGUgPT09ICd1cGRhdGUnIHx8IHBhcmFtcy50eXBlID09PSAncmVhZCcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvc2NoZW1hIy9kZWZpbml0aW9ucy9jcmVhdGUnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX1RBQkxFO1xuICAgICAgICAgIGlmICghc2VsZi5jb25maWcudGFibGUpIHtcbiAgICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlID0ge307XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzLCByZWxhdGlvbnMpIHtcblxuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLnJvd3MgPSByb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5jb2x1bW5zID0gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5jb25maWcudGFibGUpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfRk9STTtcbiAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy5mb3JtKSB7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5tb2RlbCA9IGZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gXy51bmlvbihzZWxmLmNvbmZpZy5mb3JtLmZvcm0sIGdldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy5mb3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gbWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICB0aXRsZU1hcDogdGl0bGVNYXBzW2tleV1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgICAga2V5OiBrZXlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgZmllbGRzO1xuICAgICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICAgIGluY2x1ZGVkLnB1c2goZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhLnByb3BlcnR5KCdkYXRhJykpKTtcblxuICAgICAgYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIG93bjogZmllbGRzLFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9O1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcblxuICAgICAgdmFyIGRhdGFSZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgICB2YXIgZGF0YUF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgcmVsYXRpb25zID0gZGF0YVJlbGF0aW9ucy52YWx1ZSgpO1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgICB2YXIgZG9jdW1lbnRTY2hlbWEgPSBkYXRhUmVsYXRpb25zLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihpdGVtLCBrZXkpIHtcblxuICAgICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgICAvKiogZ2V0IG5hbWUgZnJvbSBzY2hlbWEgKi9cbiAgICAgICAgdmFyIGF0dHJpYnV0ZU5hbWUgPSBkYXRhUmVsYXRpb25zLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgICB2YXIgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiA9IHNlbGYuX3JlcGxhY2VGcm9tRnVsbChkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBkb2N1bWVudFNjaGVtYSlbJ3Byb3BlcnRpZXMnXVtrZXldO1xuXG4gICAgICAgIHZhciBzb3VyY2VFbnVtID0ge307XG4gICAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc291cmNlRW51bSkge1xuXG4gICAgICAgICAgdGl0bGVNYXBzW2tleV0gPSBbXTtcblxuICAgICAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbiAoZW51bUl0ZW0pIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSByZXNvdXJjZUxpbmsgKyAnL3JlYWQvJyArIGVudW1JdGVtO1xuICAgICAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZ1bmN0aW9uIChkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgICAgICAgdGl0bGVNYXBzW2tleV0ucHVzaCh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGVudW1JdGVtLFxuICAgICAgICAgICAgICAgIG5hbWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoYXR0cmlidXRlTmFtZSkgfHwgZW51bUl0ZW1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0b3RhbCsrO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICByZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICByZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSByZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuXG4gICAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgICB9XG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTsqL1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZmllbGRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICAgIHZhciB0bXAgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICAgIHRtcFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gcmVzb3VyY2Uub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJlc291cmNlKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRtcC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB0bXAubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRtcCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciByb3dzID0gW107XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgICBpbmNsdWRlZC5wdXNoKGdldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcblxuICAgICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcblxuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogJ3JlYWQnLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlZFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgY2FjaGVkID0ge307XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG5cbiAgICAgIF8uZm9yRWFjaChpbmNsdWRlZCwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBfLmZvckVhY2goaXRlbSwgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuICAgICAgICAgICAgaWYgKGNhY2hlZFtyZWxJdGVtLnVybF0pIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhY2hlJyk7XG4gICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsb2FkRGF0YShyZWxJdGVtLnVybCwgc3VjY2Vzcyk7XG4gICAgICAgICAgICAgIGNhY2hlZFtyZWxJdGVtLnVybF0gPSB7fTtcbiAgICAgICAgICAgICAgdG90YWwrKztcbiAgICAgICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKF8uc2l6ZShyZXNvdXJjZXMpID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcblxuICAgICAgICAgIF8uZm9yRWFjaChpbmNsdWRlZCwgZnVuY3Rpb24oaXRlbSwga2kpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChpdGVtLCBmdW5jdGlvbihyZWwsIGtyKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtyaSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtraV0gPSByZXN1bHRba2ldIHx8IHt9O1xuICAgICAgICAgICAgICAgIHJlc3VsdFtraV1ba3JdID0gcmVzdWx0W2tpXVtrcl0gfHwgW107XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl1ba3JpXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjYWxsYmFjayhyZXN1bHQpXG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG5cblxuICAgICAgZnVuY3Rpb24gc3VjY2VzcyhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgcmVzb3VyY2VzW2RhdGEuZG9jdW1lbnQudXJsXSA9IHtcbiAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgIHNjaGVtYTogc2NoZW1hXG4gICAgICAgIH07XG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2FkJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfVEFCTEUpIHtcbiAgICAgICAgZ3JpZEVudGl0eS5nZXRUYWJsZUluZm8oZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGdyaWRFbnRpdHkudHlwZSA9PT0gZ3JpZEVudGl0eS5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5J107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHkpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuc2V0TW9kZWwoJHNjb3BlLmdyaWRNb2RlbCk7XG4gIH1cbn0iXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==