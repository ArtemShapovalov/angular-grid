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
                    fetchCollection: fetchCollection,
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
                    var dataRelations = data.property('relationships');
                    var dataAttributes = data.property('attributes');
                    var relations = dataRelations.value();
                    var attributes = dataAttributes.value();
                    var documentSchema = data.schemas()[0].data.document.raw.value();
                    var sourceTitleMaps = [];
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
                        _.forEach(sourceEnum, function (enumItem) {
                            var url = resourceLink + '/' + self.default.actionGetResource + '/' + enumItem;
                            sourceTitleMaps.push({
                                url: url,
                                enumItem: enumItem,
                                relationName: key,
                                attributeName: attributeName
                            });
                        });
                    });
                    self.fetchCollection(_.map(sourceTitleMaps, 'url'), function (resources) {
                        var titleMaps = {};
                        _.forEach(sourceTitleMaps, function (item) {
                            if (!titleMaps[item.relationName]) {
                                titleMaps[item.relationName] = [];
                            }
                            titleMaps[item.relationName].push({
                                value: item.enumItem,
                                //value: data.property('data').propertyValue('id'),
                                name: resources[item.url].data.property('data').property('attributes').propertyValue(item.attributeName) || item.enumItem
                            });
                        });
                        callback(titleMaps);
                    });
                }
                /**
     * Multiple load resource by array links
     * @param linkResources
     * @param callback
     */
                function fetchCollection(linkResources, callback) {
                    var self = this;
                    var loaded = 0;
                    var total = 0;
                    var resources = {};
                    linkResources = _.uniq(linkResources);
                    _.forEach(linkResources, function (url) {
                        self.loadData(url, function (data, schema, request) {
                            resources[url] = {
                                data: data,
                                schema: schema,
                                request: request
                            };
                            loaded++;
                        });
                        total++;
                    });
                    var interval = $interval(function () {
                        if (total === loaded) {
                            $interval.cancel(interval);
                            if (callback !== undefined) {
                                callback(resources);
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
                    var self = this;
                    var result = [];
                    var cached = {};
                    var loadResourcesUrl = [];
                    _.forEach(included, function (item) {
                        _.forEach(item, function (rel) {
                            _.forEach(rel, function (relItem) {
                                loadResourcesUrl.push(relItem.url);
                            });
                        });
                    });
                    self.fetchCollection(loadResourcesUrl, function (resources) {
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
                    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJmZXRjaENvbGxlY3Rpb24iLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJfZ2V0UmVsYXRpb25MaW5rIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9nZXRSb3dzQnlEYXRhIiwiX2dldEVtcHR5RGF0YSIsIl9iYXRjaExvYWREYXRhIiwidmFsdWUiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInVybCIsImNhbGxiYWNrIiwic2VsZiIsInBhcmFtcyIsImZldGNoRGF0YVN1Y2Nlc3MiLCJ1bmRlZmluZWQiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwicHJvcGVydHkiLCJzY2hlbWFzIiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiYWRkU2NoZW1hIiwiZnVsbFNjaGVtYSIsInJlc3VsdCIsInNjaGVtYVdpdGhvdXRSZWYiLCJtZXJnZVJlbFNjaGVtYSIsImNsb25lIiwicHJvcGVydGllcyIsImdldFR5cGVQcm9wZXJ0eSIsImF0dHJpYnV0ZXMiLCJvYmoiLCJ0bXBPYmoiLCJmb3JFYWNoIiwia2V5IiwiZ2V0UmVzb3VyY2VVcmwiLCJyZXNvdXJjZSIsImlkIiwidGFibGUiLCJyb3dzIiwicmVsYXRpb25zIiwicm93c1RvVGFibGVGb3JtYXQiLCJsaW5rcyIsImNvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJ0aXRsZSIsImF0dHJpYnV0ZU5hbWUiLCJuZXdEYXRhIiwiZm9ybSIsImZpZWxkcyIsImZpZWxkc1RvRm9ybUZvcm1hdCIsImNhbGxiYWNrRm9ybUNvbmZpZyIsInVuaW9uIiwiZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwidGl0bGVNYXBzIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJvd24iLCJyZWxhdGlvbnNoaXBzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsImRvY3VtZW50U2NoZW1hIiwic291cmNlVGl0bGVNYXBzIiwicmVzb3VyY2VMaW5rIiwicHJvcGVydHlWYWx1ZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJzb3VyY2VFbnVtIiwiaXRlbXMiLCJlbnVtIiwiZW51bUl0ZW0iLCJyZWxhdGlvbk5hbWUiLCJtYXAiLCJyZXNvdXJjZXMiLCJuYW1lIiwibGlua1Jlc291cmNlcyIsImxvYWRlZCIsInRvdGFsIiwidW5pcSIsImludGVydmFsIiwiY2FuY2VsIiwiaGF5c3RhY2siLCJzY2hlbWFGdWxsIiwiaGFzT3duUHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCIkcmVmIiwiT2JqZWN0IiwiYnlTdHJpbmciLCJzdWJzdHJpbmciLCJyZWxhdGlvbiIsInJlbGF0aW9uSXRlbSIsInRtcCIsImZpZWxkIiwiam9pbiIsImZvck93biIsImxpbmsiLCJyZXMiLCJyb3ciLCJ0bXBSb3ciLCJyZWxJdGVtIiwicmVsS2V5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImNhY2hlZCIsImxvYWRSZXNvdXJjZXNVcmwiLCJyZWwiLCJraSIsImtyIiwia3JpIiwib25DbGljayIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiZ3JpZEZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwiZGlyZWN0aXZlIiwiZ3JpZEZvcm1EaXJlY3RpdmUiLCJyZXN0cmljdCIsImNvbnRyb2xsZXIiLCJncmlkRm9ybURpcmVjdGl2ZUN0cmwiLCIkc2NvcGUiLCJzZXRGb3JtU2NvcGUiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiYXR0ciIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztRQU1BLElBQUFBLElBQUEsR0FBQSxFQUFBLEM7UUFDQSxJQUFBO0FBQUEsWUFDQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsWUFBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBO0FBQUEsWUFDQUgsT0FBQSxDQUFBQyxNQUFBLENBQUEsY0FBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsY0FBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBQyxPQUFBLEdBQUFKLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUYsSUFBQSxDQUFBLEM7UUNqQkFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQ0FBLGNBQUEs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Y0FBQSxHQUFBLFlBQUE7QUFBQSxvQkFDQSxJQUFBakIsTUFBQSxDQUFBWSxTQUFBLENBQUFsTCxNQUFBLENBQUE5QixJQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBLDBCQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLG9CQUlBLE9BQUEsMkJBQUEsQ0FKQTtBQUFBLGlCQUFBLENBREE7QUFBQSxnQkFRQW5CLFVBQUEsQ0FBQXNCLFFBQUEsQ0FBQWlNLE1BQUEsQ0FBQVksU0FBQSxFQVJBO0FBQUEsYUFqQkE7QUFBQSxTIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnLFxuICAgICc8Z3JpZC10YWJsZT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlIGdyaWRcIj4nK1xuICAgICAgICAnPHRoZWFkPicrXG4gICAgICAgICAgJzx0cj4nK1xuICAgICAgICAgICAgJzx0aCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPnt7Y29sdW1uLnRpdGxlfX08L3RoPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGhlYWQ+JytcbiAgICAgICAgJzx0Ym9keT4nK1xuICAgICAgICAgICc8dHIgbmctcmVwZWF0PVwicm93IGluIHJvd3NcIj4nK1xuICAgICAgICAgICAgJzx0ZCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1wiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXCI+JytcbiAgICAgICAgICAgICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiByb3cubGlua3NcIj4nICtcbiAgICAgICAgICAgICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAgICc8L3RkPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGJvZHk+JytcbiAgICAgICc8L3RhYmxlPicgK1xuICAgICc8L2dyaWQtdGFibGU+J1xuICApO1xuXG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJyxcbiAgICAnPGdyaWQtZm9ybT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZ28obGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGRpdj4nICtcbiAgICAgICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVwiZ3JpZEZvcm1cIiBuZy1pbml0PVwic2V0Rm9ybVNjb3BlKHRoaXMpXCInICtcbiAgICAgICAgJ3NmLXNjaGVtYT1cInNjaGVtYVwiIHNmLWZvcm09XCJmb3JtXCIgc2YtbW9kZWw9XCJtb2RlbFwiJyArXG4gICAgICAgICdjbGFzcz1cImZvcm0taG9yaXpvbnRhbFwiIHJvbGU9XCJmb3JtXCIgbmctaWY9XCJoaWRlRm9ybSAhPT0gdHJ1ZVwiPicrXG4gICAgICAnPC9mb3JtPicrXG4gICAgJzwvZ3JpZC1mb3JtPidcbiAgKTtcbn1dKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbG9kYXNoO1xufSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG4gIHZhciBkYXRhLFxuICAgICAgc2NoZW1hO1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzID0ge1xuICAgICAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIFRZUEVfRk9STTogJ2Zvcm0nLFxuICAgICAgVFlQRV9UQUJMRTogJ3RhYmxlJyxcbiAgICAgIHR5cGU6ICcnLFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldERhdGE6IHNldERhdGEsXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRTY2hlbWE6IHNldFNjaGVtYSxcbiAgICAgIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldERhdGEodmFsdWUpIHtcbiAgICAgIGRhdGEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTY2hlbWEodmFsdWUpIHtcbiAgICAgIHNjaGVtYSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHNlbGYuc2V0RGF0YShkYXRhKTtcbiAgICAgICAgc2VsZi5zZXRTY2hlbWEoc2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZXQgbW9kZWwgYmVmb3JlIGNhbGwgZmV0Y2ggZGF0YScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfVEFCTEU7XG4gICAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy50YWJsZSkge1xuICAgICAgICAgICAgc2VsZi5jb25maWcudGFibGUgPSB7fTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUucm93cyA9IHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMgPSBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy50YWJsZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuICAgICAgICBpZiAoIXNlbGYuY29uZmlnLmZvcm0pIHtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLm1vZGVsID0gZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBfLnVuaW9uKHNlbGYuY29uZmlnLmZvcm0uZm9ybSwgZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY29uZmlnLmZvcm0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBtZXJnZVJlbFNjaGVtYShcbiAgICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICAgIH0pO1xuXG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGZpZWxkcztcbiAgICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlc291cmNlTGluayArICcvJyArIHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSArJy8nICsgZW51bUl0ZW07XG5cbiAgICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAgIC8vdmFsdWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpLFxuICAgICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKiBAcGFyYW0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuXG4gICAgICBsaW5rUmVzb3VyY2VzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua1Jlc291cmNlcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gT2JqZWN0LmJ5U3RyaW5nKHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cblxuICAgICAgXy5mb3JFYWNoKGNvbHVtbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICAgfVxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7Ki9cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICB2YXIgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSkpIHtcbiAgICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGZpZWxkcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJlc291cmNlKSB7XG4gICAgICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgICAgICB2YXIgdG1wID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgICB0bXBba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBmaWVsZCA9IHJlc291cmNlLm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIG5hbWUgYWRkaXRpb25hbCBmaWVsZChyZWxhdGlvbiByZXNvdXJjZSlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG5cbiAgICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0bXAubGlua3MgPSBbXTtcbiAgICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgdG1wLmxpbmtzLnB1c2gobGluayk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQucHVzaCh0bXApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhcnJheSByb3dzIGJ5IEpzb25hcnkgRGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJvd3MgPSBbXTtcbiAgICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXG4gICAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc291cmNlID0gW107XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbEl0ZW0uZGF0YSkpIHtcbiAgICAgICAgdmFyIGxpbmtBcnJheSA9IFtdO1xuICAgICAgICBfLmZvckVhY2gocmVsSXRlbS5kYXRhLCBmdW5jdGlvbihkYXRhT2JqKSB7XG5cbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGRhdGFPYmouaWR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2UgPSBsaW5rQXJyYXk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlID0gW3tcbiAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5jbHVkZWRcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBjYWNoZWQgPSB7fTtcblxuICAgICAgdmFyIGxvYWRSZXNvdXJjZXNVcmwgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKGluY2x1ZGVkLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIF8uZm9yRWFjaChpdGVtLCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgICAgbG9hZFJlc291cmNlc1VybC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihsb2FkUmVzb3VyY2VzVXJsLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcblxuICAgICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0sIGtpKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCwga3IpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtyaSkge1xuICAgICAgICAgICAgICByZXN1bHRba2ldID0gcmVzdWx0W2tpXSB8fCB7fTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl0gPSByZXN1bHRba2ldW2tyXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl1ba3JpXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgfVxufVxuXG5PYmplY3QuYnlTdHJpbmcgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldO1xuICAgIGlmIChrIGluIG9iaikge1xuICAgICAgb2JqID0gb2JqW2tdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59OyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChncmlkRW50aXR5LnR5cGUgPT09IGdyaWRFbnRpdHkuVFlQRV9UQUJMRSkge1xuICAgICAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0obGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZT0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSkge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgIGdyaWRFbnRpdHkuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgIC8vJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5KSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LnNldE1vZGVsKCRzY29wZS5ncmlkTW9kZWwpO1xuICB9XG59Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=