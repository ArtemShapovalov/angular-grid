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
                    default: { actionGetResource: 'read' },
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
                    _getRelationResource: _getRelationResource,
                    _replaceFromFull: _replaceFromFull,
                    _getRelationLink: _getRelationLink,
                    _createTitleMap: _createTitleMap,
                    _getFormConfig: _getFormConfig,
                    _getFieldsForm: _getFieldsForm,
                    _getRowsByData: _getRowsByData,
                    _getEmptyData: _getEmptyData,
                    _batchLoadData: _batchLoadData
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
                        var data = Jsonary.create(self._getEmptyData(jSchema.data.value(), schema));
                        data.document.url = self.getModel().url;
                        data.addSchema(jSchema);
                        if (callback !== undefined) {
                            callback(data, schema);
                        }
                    });
                }
                function _getEmptyData(schema, fullSchema) {
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
                        self._getRowsByData(data, function (rows, relations) {
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
                        self._getFieldsForm(data, function (fields, relations) {
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
                /**
     * Generate form config for Angular schema form
     * @param data
     * @param callback
     * @private
     */
                function _getFormConfig(data, callback) {
                    var self = this;
                    var result = [];
                    self._createTitleMap(data.property('data'), function (titleMaps) {
                        var attributes = mergeRelSchema(data.property('data').schemas()[0].data.value(), data.schemas()[0].data.document.raw.value()).properties.attributes.properties;
                        _.forEach(attributes, function (value, key) {
                            var obj = { key: key };
                            if (titleMaps[key]) {
                                obj.titleMap = titleMaps[key];
                            }
                            result.push(obj);
                        });
                        $timeout(function () {
                            callback(result);
                        });
                    });
                }
                function _getFieldsForm(data, callback) {
                    var self = this;
                    var fields;
                    var included = [];
                    fields = data.property('data');
                    included.push(self._getRelationResource(data.property('data')));
                    self._batchLoadData(included, batchLoaded);
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
     * Create titleMap for form and load dependency resource
     * @param data
     * @param callback
     * @private
     */
                function _createTitleMap(data, callback) {
                    var self = this;
                    var titleMaps = {};
                    var loaded = 0;
                    var total = 0;
                    var dataRelations = data.property('relationships');
                    var dataAttributes = data.property('attributes');
                    var relations = dataRelations.value();
                    var attributes = dataAttributes.value();
                    var documentSchema = data.schemas()[0].data.document.raw.value();
                    var loadResourcesUrl = [];
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
                                var url = resourceLink + '/' + self.default.actionGetResource + '/' + enumItem;
                                loadResourcesUrl.push(url);
                                self.loadData(url, function (data, schema) {
                                    titleMaps[key].push({
                                        value: enumItem,
                                        //value: data.property('data').propertyValue('id'),
                                        name: data.property('data').property('attributes').propertyValue(attributeName) || enumItem
                                    });
                                    loaded++;
                                });
                                total++;
                            });
                        }
                    });
                    //TODO: require added functional load collection resource by link
                    loadCollectionResource(loadResourcesUrl, function () {
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
                function loadCollectionResource(baseUrl, ids, callback) {
                }
                /**
     * Recursive function replacing $ref from schema
     * @param haystack
     * @param schemaFull
     * @returns {*}
     */
                function _replaceFromFull(haystack, schemaFull) {
                    for (var key in haystack) {
                        if (haystack.hasOwnProperty(key)) {
                            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && haystack[key].$ref) {
                                haystack[key] = Object.byString(schemaFull, haystack[key].$ref.substring(2));
                                _replaceFromFull(haystack[key], schemaFull);
                            }
                            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && haystack[key] !== 'links') {
                                _replaceFromFull(haystack[key], schemaFull);
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
                    schemaWithoutRef = _replaceFromFull(schemaWithoutRef, schemaFull);
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
                function _getRowsByData(data, callback) {
                    var self = this;
                    var rows = [];
                    var included = [];
                    data.property('data').items(function (index, value) {
                        included.push(self._getRelationResource(value));
                        rows.push(value);
                    });
                    self._batchLoadData(included, batchLoaded);
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
                function _getRelationResource(data) {
                    var self = this;
                    var relations;
                    var result = {};
                    if (relations = data.property('relationships').value()) {
                        _.forEach(relations, function (relItem, relKey) {
                            result[relKey] = self._getRelationLink(relItem);
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
                function _getRelationLink(relItem) {
                    var self = this;
                    var resource = [];
                    if (Array.isArray(relItem.data)) {
                        var linkArray = [];
                        _.forEach(relItem.data, function (dataObj) {
                            linkArray.push({
                                url: getResourceUrl(relItem.links.self, {
                                    type: self.default.actionGetResource,
                                    id: dataObj.id
                                })
                            });
                        });
                        resource = linkArray;
                    } else {
                        resource = [{
                                url: getResourceUrl(relItem.links.self, {
                                    type: self.default.actionGetResource,
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
                function _batchLoadData(included, callback) {
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
                    function success(data, schema) {
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
                    $scope.links = table.links;    //$scope.$digest();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJfZ2V0UmVsYXRpb25MaW5rIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9nZXRSb3dzQnlEYXRhIiwiX2dldEVtcHR5RGF0YSIsIl9iYXRjaExvYWREYXRhIiwidmFsdWUiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInVybCIsImNhbGxiYWNrIiwic2VsZiIsInBhcmFtcyIsImZldGNoRGF0YVN1Y2Nlc3MiLCJ1bmRlZmluZWQiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwicHJvcGVydHkiLCJzY2hlbWFzIiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiYWRkU2NoZW1hIiwiZnVsbFNjaGVtYSIsInJlc3VsdCIsInNjaGVtYVdpdGhvdXRSZWYiLCJtZXJnZVJlbFNjaGVtYSIsImNsb25lIiwicHJvcGVydGllcyIsImdldFR5cGVQcm9wZXJ0eSIsImF0dHJpYnV0ZXMiLCJvYmoiLCJ0bXBPYmoiLCJmb3JFYWNoIiwia2V5IiwiZ2V0UmVzb3VyY2VVcmwiLCJyZXNvdXJjZSIsImlkIiwidGFibGUiLCJyb3dzIiwicmVsYXRpb25zIiwicm93c1RvVGFibGVGb3JtYXQiLCJsaW5rcyIsImNvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJ0aXRsZSIsImF0dHJpYnV0ZU5hbWUiLCJuZXdEYXRhIiwiZm9ybSIsImZpZWxkcyIsImZpZWxkc1RvRm9ybUZvcm1hdCIsImNhbGxiYWNrRm9ybUNvbmZpZyIsInVuaW9uIiwiZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwidGl0bGVNYXBzIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJvd24iLCJyZWxhdGlvbnNoaXBzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsImxvYWRlZCIsInRvdGFsIiwiZGF0YVJlbGF0aW9ucyIsImRhdGFBdHRyaWJ1dGVzIiwiZG9jdW1lbnRTY2hlbWEiLCJsb2FkUmVzb3VyY2VzVXJsIiwicmVzb3VyY2VMaW5rIiwicHJvcGVydHlWYWx1ZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJzb3VyY2VFbnVtIiwiaXRlbXMiLCJlbnVtIiwiZW51bUl0ZW0iLCJuYW1lIiwibG9hZENvbGxlY3Rpb25SZXNvdXJjZSIsImludGVydmFsIiwiY2FuY2VsIiwiYmFzZVVybCIsImlkcyIsImhheXN0YWNrIiwic2NoZW1hRnVsbCIsImhhc093blByb3BlcnR5IiwiQXJyYXkiLCJpc0FycmF5IiwiJHJlZiIsIk9iamVjdCIsImJ5U3RyaW5nIiwic3Vic3RyaW5nIiwicmVsYXRpb24iLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJ0bXAiLCJmaWVsZCIsImpvaW4iLCJmb3JPd24iLCJsaW5rIiwicmVzIiwicm93IiwidG1wUm93IiwicmVsSXRlbSIsInJlbEtleSIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJyZXNvdXJjZXMiLCJjYWNoZWQiLCJyZWwiLCJjb25zb2xlIiwibG9nIiwic3VjY2VzcyIsInNpemUiLCJraSIsImtyIiwia3JpIiwib25DbGljayIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiZ3JpZEZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwiZGlyZWN0aXZlIiwiZ3JpZEZvcm1EaXJlY3RpdmUiLCJyZXN0cmljdCIsImNvbnRyb2xsZXIiLCJncmlkRm9ybURpcmVjdGl2ZUN0cmwiLCIkc2NvcGUiLCJzZXRGb3JtU2NvcGUiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiYXR0ciIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztRQU1BLElBQUFBLElBQUEsR0FBQSxFQUFBLEM7UUFDQSxJQUFBO0FBQUEsWUFDQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsWUFBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBO0FBQUEsWUFDQUgsT0FBQSxDQUFBQyxNQUFBLENBQUEsY0FBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsY0FBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBQyxPQUFBLEdBQUFKLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUYsSUFBQSxDQUFBLEM7UUNqQkFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQ0FBLGNBQUEs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QXNCLFFBQUEsQ0FBQW1NLE1BQUEsQ0FBQVksU0FBQSxFQVJBO0FBQUEsYUFqQkE7QUFBQSxTIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnLFxuICAgICc8Z3JpZC10YWJsZT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlIGdyaWRcIj4nK1xuICAgICAgICAnPHRoZWFkPicrXG4gICAgICAgICAgJzx0cj4nK1xuICAgICAgICAgICAgJzx0aCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPnt7Y29sdW1uLnRpdGxlfX08L3RoPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGhlYWQ+JytcbiAgICAgICAgJzx0Ym9keT4nK1xuICAgICAgICAgICc8dHIgbmctcmVwZWF0PVwicm93IGluIHJvd3NcIj4nK1xuICAgICAgICAgICAgJzx0ZCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1wiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXCI+JytcbiAgICAgICAgICAgICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiByb3cubGlua3NcIj4nICtcbiAgICAgICAgICAgICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAgICc8L3RkPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGJvZHk+JytcbiAgICAgICc8L3RhYmxlPicgK1xuICAgICc8L2dyaWQtdGFibGU+J1xuICApO1xuXG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJyxcbiAgICAnPGdyaWQtZm9ybT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZ28obGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGRpdj4nICtcbiAgICAgICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVwiZ3JpZEZvcm1cIiBuZy1pbml0PVwic2V0Rm9ybVNjb3BlKHRoaXMpXCInICtcbiAgICAgICAgJ3NmLXNjaGVtYT1cInNjaGVtYVwiIHNmLWZvcm09XCJmb3JtXCIgc2YtbW9kZWw9XCJtb2RlbFwiJyArXG4gICAgICAgICdjbGFzcz1cImZvcm0taG9yaXpvbnRhbFwiIHJvbGU9XCJmb3JtXCIgbmctaWY9XCJoaWRlRm9ybSAhPT0gdHJ1ZVwiPicrXG4gICAgICAnPC9mb3JtPicrXG4gICAgJzwvZ3JpZC1mb3JtPidcbiAgKTtcbn1dKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbG9kYXNoO1xufSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG4gIHZhciBkYXRhLFxuICAgICAgc2NoZW1hO1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzID0ge1xuICAgICAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIFRZUEVfRk9STTogJ2Zvcm0nLFxuICAgICAgVFlQRV9UQUJMRTogJ3RhYmxlJyxcbiAgICAgIHR5cGU6ICcnLFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldERhdGE6IHNldERhdGEsXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRTY2hlbWE6IHNldFNjaGVtYSxcbiAgICAgIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhLFxuICAgICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXREYXRhKHZhbHVlKSB7XG4gICAgICBkYXRhID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U2NoZW1hKHZhbHVlKSB7XG4gICAgICBzY2hlbWEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLnNldERhdGEoZGF0YSk7XG4gICAgICAgIHNlbGYuc2V0U2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2V0IG1vZGVsIGJlZm9yZSBjYWxsIGZldGNoIGRhdGEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbiAoakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uIChqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYS5kYXRhLnZhbHVlKCksIHNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXMpKTtcblxuICAgICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdG1wT2JqO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSZXNvdXJjZVVybCh1cmwsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgICAgaWYgKHBhcmFtcy5yZXNvdXJjZSkge1xuICAgICAgICByZXN1bHQgPSB1cmwgKyAnLycgKyBwYXJhbXMucmVzb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSkge1xuICAgICAgICBpZiAocGFyYW1zLnR5cGUgPT09ICd1cGRhdGUnIHx8IHBhcmFtcy50eXBlID09PSAncmVhZCcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvc2NoZW1hIy9kZWZpbml0aW9ucy9jcmVhdGUnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX1RBQkxFO1xuICAgICAgICAgIGlmICghc2VsZi5jb25maWcudGFibGUpIHtcbiAgICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlID0ge307XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgc2VsZi5fZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzLCByZWxhdGlvbnMpIHtcblxuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLnJvd3MgPSByb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5jb2x1bW5zID0gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5jb25maWcudGFibGUpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfRk9STTtcbiAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy5mb3JtKSB7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5tb2RlbCA9IGZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gXy51bmlvbihzZWxmLmNvbmZpZy5mb3JtLmZvcm0sIGdldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy5mb3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gbWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgICBpZiAodGl0bGVNYXBzW2tleV0pIHtcbiAgICAgICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgICB9KTtcblxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgICB9KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBmaWVsZHM7XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuXG4gICAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cblxuICAgICAgdmFyIGxvYWRSZXNvdXJjZXNVcmwgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuICAgICAgICBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcyAmJiBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtXG4gICAgICAgIH0gZWxzZSBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtKSB7XG4gICAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNvdXJjZUVudW0pIHtcblxuICAgICAgICAgIHRpdGxlTWFwc1trZXldID0gW107XG5cbiAgICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gcmVzb3VyY2VMaW5rICsgJy8nICsgc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlICsnLycgKyBlbnVtSXRlbTtcblxuICAgICAgICAgICAgbG9hZFJlc291cmNlc1VybC5wdXNoKHVybCk7XG5cbiAgICAgICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgICAgICAgIHRpdGxlTWFwc1trZXldLnB1c2goe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnVtSXRlbSxcbiAgICAgICAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICAgICAgICBuYW1lOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGF0dHJpYnV0ZU5hbWUpIHx8IGVudW1JdGVtXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG90YWwrKztcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgICAgLy9UT0RPOiByZXF1aXJlIGFkZGVkIGZ1bmN0aW9uYWwgbG9hZCBjb2xsZWN0aW9uIHJlc291cmNlIGJ5IGxpbmtcbiAgICAgIGxvYWRDb2xsZWN0aW9uUmVzb3VyY2UobG9hZFJlc291cmNlc1VybCwgZnVuY3Rpb24oKSB7XG5cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb2FkQ29sbGVjdGlvblJlc291cmNlKGJhc2VVcmwsIGlkcywgY2FsbGJhY2spIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuXG4gICAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgICB9XG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTsqL1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZmllbGRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICAgIHZhciB0bXAgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICAgIHRtcFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gcmVzb3VyY2Uub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJlc291cmNlKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRtcC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB0bXAubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRtcCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSb3dzQnlEYXRhKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcm93cyA9IFtdO1xuICAgICAgdmFyIGluY2x1ZGVkID0gW107XG4gICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXMpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcblxuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlZFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgdmFyIGNhY2hlZCA9IHt9O1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuXG4gICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjYWNoZWRbcmVsSXRlbS51cmxdKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWNoZScpO1xuICAgICAgICAgICAgICB0b3RhbCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZERhdGEocmVsSXRlbS51cmwsIHN1Y2Nlc3MpO1xuICAgICAgICAgICAgICBjYWNoZWRbcmVsSXRlbS51cmxdID0ge307XG4gICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfLnNpemUocmVzb3VyY2VzKSA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG5cbiAgICAgICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0sIGtpKSB7XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbSwgZnVuY3Rpb24ocmVsLCBrcikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrcmkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldID0gcmVzdWx0W2tpXSB8fCB7fTtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldW2tyXSA9IHJlc3VsdFtraV1ba3JdIHx8IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdFtraV1ba3JdW2tyaV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY2FsbGJhY2socmVzdWx0KVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICByZXNvdXJjZXNbZGF0YS5kb2N1bWVudC51cmxdID0ge1xuICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgc2NoZW1hOiBzY2hlbWFcbiAgICAgICAgfTtcbiAgICAgICAgY29uc29sZS5sb2coJ2xvYWQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgfVxufVxuXG5PYmplY3QuYnlTdHJpbmcgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldO1xuICAgIGlmIChrIGluIG9iaikge1xuICAgICAgb2JqID0gb2JqW2tdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59OyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChncmlkRW50aXR5LnR5cGUgPT09IGdyaWRFbnRpdHkuVFlQRV9UQUJMRSkge1xuICAgICAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0obGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZT0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSkge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgIGdyaWRFbnRpdHkuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgIC8vJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5KSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LnNldE1vZGVsKCRzY29wZS5ncmlkTW9kZWwpO1xuICB9XG59Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=