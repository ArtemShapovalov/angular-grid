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
                    loadCollectionResource: loadCollectionResource,
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
                    self.loadCollectionResource(_.map(sourceTitleMaps, 'url'), function (resources) {
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
                function loadCollectionResource(linkResources, callback) {
                    var self = this;
                    var loaded = 0;
                    var total = 0;
                    var resources = {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJsb2FkQ29sbGVjdGlvblJlc291cmNlIiwiX2dldFJlbGF0aW9uUmVzb3VyY2UiLCJfcmVwbGFjZUZyb21GdWxsIiwiX2dldFJlbGF0aW9uTGluayIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZ2V0Um93c0J5RGF0YSIsIl9nZXRFbXB0eURhdGEiLCJfYmF0Y2hMb2FkRGF0YSIsInZhbHVlIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJ1cmwiLCJjYWxsYmFjayIsInNlbGYiLCJwYXJhbXMiLCJmZXRjaERhdGFTdWNjZXNzIiwidW5kZWZpbmVkIiwiYWxlcnQiLCJKc29uYXJ5IiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsInByb3BlcnR5Iiwic2NoZW1hcyIsImRvY3VtZW50IiwicmF3IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImZ1bGxTY2hlbWEiLCJyZXN1bHQiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJjbG9uZSIsInByb3BlcnRpZXMiLCJnZXRUeXBlUHJvcGVydHkiLCJhdHRyaWJ1dGVzIiwib2JqIiwidG1wT2JqIiwiZm9yRWFjaCIsImtleSIsImdldFJlc291cmNlVXJsIiwicmVzb3VyY2UiLCJpZCIsInRhYmxlIiwicm93cyIsInJlbGF0aW9ucyIsInJvd3NUb1RhYmxlRm9ybWF0IiwibGlua3MiLCJjb2x1bW5zIiwiZ2V0Q29sdW1uc0J5U2NoZW1hIiwidGl0bGUiLCJhdHRyaWJ1dGVOYW1lIiwibmV3RGF0YSIsImZvcm0iLCJmaWVsZHMiLCJmaWVsZHNUb0Zvcm1Gb3JtYXQiLCJjYWxsYmFja0Zvcm1Db25maWciLCJ1bmlvbiIsImdldEZvcm1CdXR0b25CeVNjaGVtYSIsInRpdGxlTWFwcyIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwib3duIiwicmVsYXRpb25zaGlwcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJkYXRhUmVsYXRpb25zIiwiZGF0YUF0dHJpYnV0ZXMiLCJkb2N1bWVudFNjaGVtYSIsInNvdXJjZVRpdGxlTWFwcyIsInJlc291cmNlTGluayIsInByb3BlcnR5VmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwicmVsYXRpb25OYW1lIiwibWFwIiwicmVzb3VyY2VzIiwibmFtZSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsImludGVydmFsIiwiY2FuY2VsIiwiaGF5c3RhY2siLCJzY2hlbWFGdWxsIiwiaGFzT3duUHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCIkcmVmIiwiT2JqZWN0IiwiYnlTdHJpbmciLCJzdWJzdHJpbmciLCJyZWxhdGlvbiIsInJlbGF0aW9uSXRlbSIsInRtcCIsImZpZWxkIiwiam9pbiIsImZvck93biIsImxpbmsiLCJyZXMiLCJyb3ciLCJ0bXBSb3ciLCJyZWxJdGVtIiwicmVsS2V5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImNhY2hlZCIsInJlbCIsImNvbnNvbGUiLCJsb2ciLCJzdWNjZXNzIiwic2l6ZSIsImtpIiwia3IiLCJrcmkiLCJvbkNsaWNrIiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibGVuZ3RoIiwiayIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCJncmlkRm9ybSIsIiR2YWxpZCIsInRoZW4iLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsIiRkaWdlc3QiLCJlZGl0IiwiJGV2ZW50IiwiZ28iLCJjbG9zZUFsZXJ0Iiwic3BsaWNlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCIsInZtc0dyaWREaXJlY3RpdmUiLCJ0ZW1wbGF0ZSIsImdyaWRNb2RlbCIsInZtc0dyaWREaXJlY3RpdmVDdHJsIiwiZWwiLCJhdHRyIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUE7QUFBQSxZQUNBSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxjQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxjQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUFDLE9BQUEsR0FBQUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBRixJQUFBLENBQUEsQztRQ2pCQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxHQUFBLENBQUE7QUFBQSxZQUFBLGdCQUFBO0FBQUEsWUFBQSxVQUFBQyxjQUFBLEVBQUE7QUFBQSxnQkFDQUEsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFDQSxpQkFDQSxrQ0FEQSxHQUVBLHlFQUZBLEdBR0EsU0FIQSxHQUlBLDJHQUpBLEdBS0EsNEJBTEEsR0FNQSxTQU5BLEdBT0EsTUFQQSxHQVFBLHlEQVJBLEdBU0EsT0FUQSxHQVVBLFVBVkEsR0FXQSxTQVhBLEdBWUEsOEJBWkEsR0FhQSxvQ0FiQSxHQWNBLHVGQWRBLEdBZUEsa0RBZkEsR0FnQkEsc0NBaEJBLEdBaUJBLHlFQWpCQSxHQWtCQSxTQWxCQSxHQW1CQSxTQW5CQSxHQW9CQSxPQXBCQSxHQXFCQSxPQXJCQSxHQXNCQSxVQXRCQSxHQXVCQSxVQXZCQSxHQXdCQSxlQXpCQSxFQURBO0FBQUEsZ0JBNkJBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUNBLGdCQUNBLGtDQURBLEdBRUEsdUVBRkEsR0FHQSxTQUhBLEdBSUEsT0FKQSxHQUtBLDJHQUxBLEdBTUEsUUFOQSxHQU9BLCtEQVBBLEdBUUEsb0RBUkEsR0FTQSxnRUFUQSxHQVVBLFNBVkEsR0FXQSxjQVpBLEVBN0JBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRTtRQTZDQVAsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBTyxPQUFBLENBQUEsR0FBQSxFQUFBLFlBQUE7QUFBQSxZQUNBLE9BQUFDLE1BQUEsQ0FEQTtBQUFBLFNBQUEsRTtRQUlBVCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFTLFFBQUEsQ0FBQSxhQUFBLEVBQUFDLFVBQUEsRTtRQUVBLFNBQUFBLFVBQUEsR0FBQTtBQUFBLFlBQ0EsSUFBQUMsSUFBQSxFQUNBQyxNQURBLENBREE7QUFBQSxZQUlBLElBQUFILFFBQUEsR0FBQSxFQUNBSSxJQUFBLEVBQUFDLGFBREEsRUFBQSxDQUpBO0FBQUEsWUFRQUEsYUFBQSxDQUFBQyxPQUFBLEdBQUE7QUFBQSxnQkFBQSxVQUFBO0FBQUEsZ0JBQUEsV0FBQTtBQUFBLGdCQUFBLEdBQUE7QUFBQSxhQUFBLENBUkE7QUFBQSxZQVVBLE9BQUFOLFFBQUEsQ0FWQTtBQUFBLFlBWUEsU0FBQUssYUFBQSxDQUFBRSxRQUFBLEVBQUFDLFNBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUMsS0FBQSxFQUNBQyxRQUFBLEdBQUE7QUFBQSx3QkFDQUMsY0FBQSxFQUFBLHFCQURBO0FBQUEsd0JBRUFDLGNBQUEsRUFBQSxxQkFGQTtBQUFBLHdCQUdBQyxjQUFBLEVBQUEscUJBSEE7QUFBQSx3QkFJQUMsV0FBQSxFQUFBLG9CQUpBO0FBQUEscUJBREEsQ0FEQTtBQUFBLGdCQVNBLE9BQUE7QUFBQSxvQkFDQUMsT0FBQSxFQUFBLEVBQ0FDLGlCQUFBLEVBQUEsTUFEQSxFQURBO0FBQUEsb0JBSUFDLFNBQUEsRUFBQSxNQUpBO0FBQUEsb0JBS0FDLFVBQUEsRUFBQSxPQUxBO0FBQUEsb0JBTUFDLElBQUEsRUFBQSxFQU5BO0FBQUEsb0JBT0FDLE1BQUEsRUFBQSxFQVBBO0FBQUEsb0JBUUFDLE9BQUEsRUFBQUEsT0FSQTtBQUFBLG9CQVNBQyxRQUFBLEVBQUFBLFFBVEE7QUFBQSxvQkFVQUMsUUFBQSxFQUFBQSxRQVZBO0FBQUEsb0JBV0FDLFNBQUEsRUFBQUEsU0FYQTtBQUFBLG9CQVlBQyxVQUFBLEVBQUFBLFVBWkE7QUFBQSxvQkFhQUMsVUFBQSxFQUFBQSxVQWJBO0FBQUEsb0JBY0FDLFNBQUEsRUFBQUEsU0FkQTtBQUFBLG9CQWVBQyxRQUFBLEVBQUFBLFFBZkE7QUFBQSxvQkFnQkFDLFVBQUEsRUFBQUEsVUFoQkE7QUFBQSxvQkFpQkFDLFlBQUEsRUFBQUEsWUFqQkE7QUFBQSxvQkFrQkFDLFdBQUEsRUFBQUEsV0FsQkE7QUFBQSxvQkFtQkFDLHNCQUFBLEVBQUFBLHNCQW5CQTtBQUFBLG9CQW9CQUMsb0JBQUEsRUFBQUEsb0JBcEJBO0FBQUEsb0JBcUJBQyxnQkFBQSxFQUFBQSxnQkFyQkE7QUFBQSxvQkFzQkFDLGdCQUFBLEVBQUFBLGdCQXRCQTtBQUFBLG9CQXVCQUMsZUFBQSxFQUFBQSxlQXZCQTtBQUFBLG9CQXdCQUMsY0FBQSxFQUFBQSxjQXhCQTtBQUFBLG9CQXlCQUMsY0FBQSxFQUFBQSxjQXpCQTtBQUFBLG9CQTBCQUMsY0FBQSxFQUFBQSxjQTFCQTtBQUFBLG9CQTJCQUMsYUFBQSxFQUFBQSxhQTNCQTtBQUFBLG9CQTRCQUMsY0FBQSxFQUFBQSxjQTVCQTtBQUFBLGlCQUFBLENBVEE7QUFBQSxnQkF3Q0EsU0FBQXBCLE9BQUEsQ0FBQXFCLEtBQUEsRUFBQTtBQUFBLG9CQUNBekMsSUFBQSxHQUFBeUMsS0FBQSxDQURBO0FBQUEsaUJBeENBO0FBQUEsZ0JBNENBLFNBQUFsQixTQUFBLENBQUFrQixLQUFBLEVBQUE7QUFBQSxvQkFDQXhDLE1BQUEsR0FBQXdDLEtBQUEsQ0FEQTtBQUFBLGlCQTVDQTtBQUFBLGdCQWdEQSxTQUFBcEIsUUFBQSxDQUFBcUIsS0FBQSxFQUFBO0FBQUEsb0JBQ0FsQyxLQUFBLEdBQUFrQyxLQUFBLENBREE7QUFBQSxpQkFoREE7QUFBQSxnQkFvREEsU0FBQXBCLFFBQUEsR0FBQTtBQUFBLG9CQUNBLE9BQUFkLEtBQUEsQ0FEQTtBQUFBLGlCQXBEQTtBQUFBLGdCQXdEQSxTQUFBZ0IsVUFBQSxDQUFBbUIsS0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQWxDLFFBQUEsQ0FBQWtDLEtBQUEsQ0FBQSxDQURBO0FBQUEsaUJBeERBO0FBQUEsZ0JBNERBLFNBQUFsQixVQUFBLENBQUFrQixLQUFBLEVBQUFDLE9BQUEsRUFBQTtBQUFBLG9CQUNBbkMsUUFBQSxDQUFBa0MsS0FBQSxJQUFBQyxPQUFBLENBREE7QUFBQSxpQkE1REE7QUFBQSxnQkFpRUEsU0FBQWxCLFNBQUEsQ0FBQW1CLEdBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsb0JBRUE7QUFBQSx3QkFBQUMsSUFBQSxHQUFBLElBQUEsQ0FGQTtBQUFBLG9CQUlBLElBQUF2QyxLQUFBLENBQUF3QyxNQUFBLENBQUE5QixJQUFBLEtBQUEsUUFBQSxFQUFBO0FBQUEsd0JBQ0E2QixJQUFBLENBQUFuQixVQUFBLENBQUFpQixHQUFBLEVBQUFJLGdCQUFBLEVBREE7QUFBQSxxQkFBQSxNQUVBO0FBQUEsd0JBQ0FGLElBQUEsQ0FBQXBCLFFBQUEsQ0FBQWtCLEdBQUEsRUFBQUksZ0JBQUEsRUFEQTtBQUFBLHFCQU5BO0FBQUEsb0JBVUEsU0FBQUEsZ0JBQUEsQ0FBQWpELElBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsd0JBQ0E4QyxJQUFBLENBQUEzQixPQUFBLENBQUFwQixJQUFBLEVBREE7QUFBQSx3QkFFQStDLElBQUEsQ0FBQXhCLFNBQUEsQ0FBQXRCLE1BQUEsRUFGQTtBQUFBLHdCQUlBLElBQUE2QyxRQUFBLEtBQUFJLFNBQUEsRUFBQTtBQUFBLDRCQUNBSixRQUFBLENBQUE5QyxJQUFBLEVBQUFDLE1BQUEsRUFEQTtBQUFBLHlCQUpBO0FBQUEscUJBVkE7QUFBQSxpQkFqRUE7QUFBQSxnQkEyRkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUEwQixRQUFBLENBQUFrQixHQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLG9CQUdBO0FBQUEsd0JBQUF0QyxLQUFBLEtBQUEwQyxTQUFBLEVBQUE7QUFBQSx3QkFDQUMsS0FBQSxDQUFBLHlDQUFBLEVBREE7QUFBQSx3QkFFQSxPQUFBLEtBQUEsQ0FGQTtBQUFBLHFCQUhBO0FBQUEsb0JBUUFDLE9BQUEsQ0FBQUMsT0FBQSxDQUFBUixHQUFBLEVBQUEsVUFBQVMsS0FBQSxFQUFBQyxPQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBdkQsSUFBQSxHQUFBc0QsS0FBQSxDQURBO0FBQUEsd0JBRUEsSUFBQXJELE1BQUEsR0FBQXFELEtBQUEsQ0FBQUUsUUFBQSxDQUFBLE1BQUEsRUFBQUMsT0FBQSxHQUFBLENBQUEsRUFBQXpELElBQUEsQ0FBQTBELFFBQUEsQ0FBQUMsR0FBQSxDQUFBbEIsS0FBQSxFQUFBLENBRkE7QUFBQSx3QkFJQSxJQUFBSyxRQUFBLEtBQUFJLFNBQUEsRUFBQTtBQUFBLDRCQUNBSixRQUFBLENBQUE5QyxJQUFBLEVBQUFDLE1BQUEsRUFBQXNELE9BQUEsRUFEQTtBQUFBLHlCQUpBO0FBQUEscUJBQUEsRUFSQTtBQUFBLGlCQTNGQTtBQUFBLGdCQW9IQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUEzQixVQUFBLENBQUFpQixHQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFDLElBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSxvQkFJQUssT0FBQSxDQUFBUSxTQUFBLENBQUFmLEdBQUEsRUFBQSxVQUFBZ0IsT0FBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQTVELE1BQUEsR0FBQTRELE9BQUEsQ0FBQTdELElBQUEsQ0FBQTBELFFBQUEsQ0FBQUMsR0FBQSxDQUFBbEIsS0FBQSxFQUFBLENBRkE7QUFBQSx3QkFHQSxJQUFBekMsSUFBQSxHQUFBb0QsT0FBQSxDQUFBVSxNQUFBLENBQUFmLElBQUEsQ0FBQVIsYUFBQSxDQUFBc0IsT0FBQSxDQUFBN0QsSUFBQSxDQUFBeUMsS0FBQSxFQUFBLEVBQUF4QyxNQUFBLENBQUEsQ0FBQSxDQUhBO0FBQUEsd0JBSUFELElBQUEsQ0FBQTBELFFBQUEsQ0FBQWIsR0FBQSxHQUFBRSxJQUFBLENBQUF6QixRQUFBLEdBQUF1QixHQUFBLENBSkE7QUFBQSx3QkFLQTdDLElBQUEsQ0FBQStELFNBQUEsQ0FBQUYsT0FBQSxFQUxBO0FBQUEsd0JBT0EsSUFBQWYsUUFBQSxLQUFBSSxTQUFBLEVBQUE7QUFBQSw0QkFDQUosUUFBQSxDQUFBOUMsSUFBQSxFQUFBQyxNQUFBLEVBREE7QUFBQSx5QkFQQTtBQUFBLHFCQUFBLEVBSkE7QUFBQSxpQkFwSEE7QUFBQSxnQkFzSUEsU0FBQXNDLGFBQUEsQ0FBQXRDLE1BQUEsRUFBQStELFVBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFDLE1BQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFDLGdCQUFBLEdBQUFDLGNBQUEsQ0FBQWxFLE1BQUEsRUFBQStELFVBQUEsQ0FBQSxDQUZBO0FBQUEsb0JBSUFDLE1BQUEsR0FBQTFELENBQUEsQ0FBQTZELEtBQUEsQ0FBQUYsZ0JBQUEsQ0FBQUcsVUFBQSxDQUFBLENBSkE7QUFBQSxvQkFLQUosTUFBQSxDQUFBakUsSUFBQSxHQUFBc0UsZUFBQSxDQUFBL0QsQ0FBQSxDQUFBNkQsS0FBQSxDQUFBRixnQkFBQSxDQUFBRyxVQUFBLENBQUFyRSxJQUFBLENBQUFxRSxVQUFBLENBQUEsQ0FBQSxDQUxBO0FBQUEsb0JBTUFKLE1BQUEsQ0FBQWpFLElBQUEsQ0FBQXVFLFVBQUEsR0FBQUQsZUFBQSxDQUFBL0QsQ0FBQSxDQUFBNkQsS0FBQSxDQUFBRixnQkFBQSxDQUFBRyxVQUFBLENBQUFyRSxJQUFBLENBQUFxRSxVQUFBLENBQUFFLFVBQUEsQ0FBQUYsVUFBQSxDQUFBLENBQUEsQ0FOQTtBQUFBLG9CQVFBLFNBQUFDLGVBQUEsQ0FBQUUsR0FBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQUMsTUFBQSxHQUFBRCxHQUFBLENBREE7QUFBQSx3QkFFQWpFLENBQUEsQ0FBQW1FLE9BQUEsQ0FBQUQsTUFBQSxFQUFBLFVBQUFoQyxLQUFBLEVBQUFrQyxHQUFBLEVBQUE7QUFBQSw0QkFDQSxJQUFBbEMsS0FBQSxDQUFBdkIsSUFBQSxFQUFBO0FBQUEsZ0NBQ0EsUUFBQXVCLEtBQUEsQ0FBQXZCLElBQUE7QUFBQSxnQ0FDQSxLQUFBLFFBQUE7QUFBQSxvQ0FDQXVELE1BQUEsQ0FBQUUsR0FBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLG9DQUVBLE1BSEE7QUFBQSxnQ0FJQSxLQUFBLFFBQUE7QUFBQSxvQ0FDQUYsTUFBQSxDQUFBRSxHQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsb0NBRUEsTUFOQTtBQUFBLGdDQU9BLEtBQUEsT0FBQTtBQUFBLG9DQUNBRixNQUFBLENBQUFFLEdBQUEsSUFBQSxFQUFBLENBREE7QUFBQSxvQ0FFQSxNQVRBO0FBQUEsZ0NBVUEsS0FBQSxTQUFBO0FBQUEsb0NBQ0FGLE1BQUEsQ0FBQUUsR0FBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLG9DQUVBLE1BWkE7QUFBQSxpQ0FEQTtBQUFBLDZCQURBO0FBQUEseUJBQUEsRUFGQTtBQUFBLHdCQW9CQSxPQUFBRixNQUFBLENBcEJBO0FBQUEscUJBUkE7QUFBQSxvQkE4QkEsT0FBQVIsTUFBQSxDQTlCQTtBQUFBLGlCQXRJQTtBQUFBLGdCQXVLQSxTQUFBVyxjQUFBLENBQUEvQixHQUFBLEVBQUFHLE1BQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFpQixNQUFBLEdBQUFwQixHQUFBLENBREE7QUFBQSxvQkFHQSxJQUFBRyxNQUFBLENBQUE2QixRQUFBLEVBQUE7QUFBQSx3QkFDQVosTUFBQSxHQUFBcEIsR0FBQSxHQUFBLEdBQUEsR0FBQUcsTUFBQSxDQUFBNkIsUUFBQSxDQURBO0FBQUEscUJBSEE7QUFBQSxvQkFPQSxJQUFBN0IsTUFBQSxDQUFBOUIsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQThCLE1BQUEsQ0FBQTlCLElBQUEsS0FBQSxRQUFBLElBQUE4QixNQUFBLENBQUE5QixJQUFBLEtBQUEsTUFBQSxFQUFBO0FBQUEsNEJBQ0ErQyxNQUFBLElBQUEsTUFBQWpCLE1BQUEsQ0FBQTlCLElBQUEsR0FBQSxHQUFBLEdBQUE4QixNQUFBLENBQUE4QixFQUFBLENBREE7QUFBQSx5QkFBQSxNQUVBLElBQUE5QixNQUFBLENBQUE5QixJQUFBLEtBQUEsUUFBQSxFQUFBO0FBQUEsNEJBQ0ErQyxNQUFBLElBQUEsNkJBQUEsQ0FEQTtBQUFBLHlCQUhBO0FBQUEscUJBUEE7QUFBQSxvQkFjQSxPQUFBQSxNQUFBLENBZEE7QUFBQSxpQkF2S0E7QUFBQSxnQkF3TEEsU0FBQXBDLFlBQUEsQ0FBQWlCLFFBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFDLElBQUEsR0FBQSxJQUFBLEVBQ0F2QyxLQUFBLEdBQUF1QyxJQUFBLENBQUF6QixRQUFBLEVBREEsRUFFQXVCLEdBRkEsQ0FGQTtBQUFBLG9CQU1BQSxHQUFBLEdBQUErQixjQUFBLENBQUFwRSxLQUFBLENBQUFxQyxHQUFBLEVBQUFyQyxLQUFBLENBQUF3QyxNQUFBLENBQUEsQ0FOQTtBQUFBLG9CQVFBM0MsUUFBQSxDQUFBLFlBQUE7QUFBQSx3QkFDQTBDLElBQUEsQ0FBQXJCLFNBQUEsQ0FBQW1CLEdBQUEsRUFBQUksZ0JBQUEsRUFEQTtBQUFBLHFCQUFBLEVBUkE7QUFBQSxvQkFZQSxTQUFBQSxnQkFBQSxDQUFBakQsSUFBQSxFQUFBQyxNQUFBLEVBQUE7QUFBQSx3QkFFQSxJQUFBaUUsZ0JBQUEsR0FBQUMsY0FBQSxDQUFBbkUsSUFBQSxDQUFBeUQsT0FBQSxHQUFBLENBQUEsRUFBQXpELElBQUEsQ0FBQXlDLEtBQUEsRUFBQSxFQUFBeEMsTUFBQSxDQUFBLENBRkE7QUFBQSx3QkFJQThDLElBQUEsQ0FBQTdCLElBQUEsR0FBQTZCLElBQUEsQ0FBQTlCLFVBQUEsQ0FKQTtBQUFBLHdCQUtBLElBQUEsQ0FBQThCLElBQUEsQ0FBQTVCLE1BQUEsQ0FBQTRELEtBQUEsRUFBQTtBQUFBLDRCQUNBaEMsSUFBQSxDQUFBNUIsTUFBQSxDQUFBNEQsS0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHlCQUxBO0FBQUEsd0JBVUFoQyxJQUFBLENBQUFULGNBQUEsQ0FBQXRDLElBQUEsRUFBQSxVQUFBZ0YsSUFBQSxFQUFBQyxTQUFBLEVBQUE7QUFBQSw0QkFFQWxDLElBQUEsQ0FBQTVCLE1BQUEsQ0FBQTRELEtBQUEsQ0FBQUMsSUFBQSxHQUFBRSxpQkFBQSxDQUFBRixJQUFBLENBQUEsQ0FGQTtBQUFBLDRCQUdBakMsSUFBQSxDQUFBNUIsTUFBQSxDQUFBNEQsS0FBQSxDQUFBSSxLQUFBLEdBQUFuRixJQUFBLENBQUFtRixLQUFBLEVBQUEsQ0FIQTtBQUFBLDRCQUlBcEMsSUFBQSxDQUFBNUIsTUFBQSxDQUFBNEQsS0FBQSxDQUFBSyxPQUFBLEdBQUFDLGtCQUFBLENBQUFuQixnQkFBQSxDQUFBLENBSkE7QUFBQSw0QkFLQW5CLElBQUEsQ0FBQTVCLE1BQUEsQ0FBQTRELEtBQUEsQ0FBQUssT0FBQSxDQUFBOUYsSUFBQSxDQUFBO0FBQUEsZ0NBQ0FnRyxLQUFBLEVBQUEsU0FEQTtBQUFBLGdDQUVBcEUsSUFBQSxFQUFBLFFBRkE7QUFBQSxnQ0FHQXFFLGFBQUEsRUFBQSxPQUhBO0FBQUEsNkJBQUEsRUFMQTtBQUFBLDRCQVdBLElBQUF6QyxRQUFBLEtBQUFJLFNBQUEsRUFBQTtBQUFBLGdDQUNBSixRQUFBLENBQUFDLElBQUEsQ0FBQTVCLE1BQUEsQ0FBQTRELEtBQUEsRUFEQTtBQUFBLDZCQVhBO0FBQUEseUJBQUEsRUFWQTtBQUFBLHFCQVpBO0FBQUEsaUJBeExBO0FBQUEsZ0JBc09BO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUFqRCxXQUFBLENBQUFnQixRQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLHdCQUFBQyxJQUFBLEdBQUEsSUFBQSxFQUNBdkMsS0FBQSxHQUFBdUMsSUFBQSxDQUFBekIsUUFBQSxFQURBLEVBRUF1QixHQUZBLENBRkE7QUFBQSxvQkFNQUEsR0FBQSxHQUFBK0IsY0FBQSxDQUFBcEUsS0FBQSxDQUFBcUMsR0FBQSxFQUFBckMsS0FBQSxDQUFBd0MsTUFBQSxDQUFBLENBTkE7QUFBQSxvQkFRQTNDLFFBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0EwQyxJQUFBLENBQUFyQixTQUFBLENBQUFtQixHQUFBLEVBQUFJLGdCQUFBLEVBREE7QUFBQSxxQkFBQSxFQVJBO0FBQUEsb0JBWUEsU0FBQUEsZ0JBQUEsQ0FBQWpELElBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQXVGLE9BQUEsR0FBQXhGLElBQUEsQ0FBQXdELFFBQUEsQ0FBQSxNQUFBLEVBQUFBLFFBQUEsQ0FBQSxZQUFBLENBQUEsQ0FEQTtBQUFBLHdCQUVBLElBQUFVLGdCQUFBLEdBQUFDLGNBQUEsQ0FBQXFCLE9BQUEsQ0FBQS9CLE9BQUEsR0FBQSxDQUFBLEVBQUF6RCxJQUFBLENBQUF5QyxLQUFBLEVBQUEsRUFBQXhDLE1BQUEsQ0FBQSxDQUZBO0FBQUEsd0JBSUE4QyxJQUFBLENBQUE3QixJQUFBLEdBQUE2QixJQUFBLENBQUEvQixTQUFBLENBSkE7QUFBQSx3QkFLQSxJQUFBLENBQUErQixJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLEVBQUE7QUFBQSw0QkFDQTFDLElBQUEsQ0FBQTVCLE1BQUEsQ0FBQXNFLElBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx5QkFMQTtBQUFBLHdCQVNBMUMsSUFBQSxDQUFBVixjQUFBLENBQUFyQyxJQUFBLEVBQUEsVUFBQTBGLE1BQUEsRUFBQVQsU0FBQSxFQUFBO0FBQUEsNEJBRUFsQyxJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLENBQUFOLEtBQUEsR0FBQW5GLElBQUEsQ0FBQW1GLEtBQUEsRUFBQSxDQUZBO0FBQUEsNEJBR0FwQyxJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLENBQUF4RixNQUFBLEdBQUFpRSxnQkFBQSxDQUhBO0FBQUEsNEJBSUFuQixJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLENBQUFqRixLQUFBLEdBQUFtRixrQkFBQSxDQUFBRCxNQUFBLENBQUEsQ0FKQTtBQUFBLDRCQU1BM0MsSUFBQSxDQUFBWCxjQUFBLENBQUFwQyxJQUFBLEVBQUE0RixrQkFBQSxFQU5BO0FBQUEsNEJBUUEsU0FBQUEsa0JBQUEsQ0FBQXpFLE1BQUEsRUFBQTtBQUFBLGdDQUNBNEIsSUFBQSxDQUFBNUIsTUFBQSxDQUFBc0UsSUFBQSxDQUFBQSxJQUFBLEdBQUF0RSxNQUFBLENBREE7QUFBQSxnQ0FJQTtBQUFBLGdDQUFBNEIsSUFBQSxDQUFBNUIsTUFBQSxDQUFBc0UsSUFBQSxDQUFBQSxJQUFBLEdBQUFsRixDQUFBLENBQUFzRixLQUFBLENBQUE5QyxJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLENBQUFBLElBQUEsRUFBQUsscUJBQUEsQ0FBQTlGLElBQUEsQ0FBQXdELFFBQUEsQ0FBQSxNQUFBLEVBQUEyQixLQUFBLEVBQUEsQ0FBQSxDQUFBLENBSkE7QUFBQSxnQ0FNQSxJQUFBckMsUUFBQSxLQUFBSSxTQUFBLEVBQUE7QUFBQSxvQ0FDQUosUUFBQSxDQUFBQyxJQUFBLENBQUE1QixNQUFBLENBQUFzRSxJQUFBLEVBREE7QUFBQSxpQ0FOQTtBQUFBLDZCQVJBO0FBQUEseUJBQUEsRUFUQTtBQUFBLHFCQVpBO0FBQUEsaUJBdE9BO0FBQUEsZ0JBMFJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBckQsY0FBQSxDQUFBcEMsSUFBQSxFQUFBOEMsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUMsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUdBLElBQUFrQixNQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsb0JBS0FsQixJQUFBLENBQUFaLGVBQUEsQ0FBQW5DLElBQUEsQ0FBQXdELFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxVQUFBdUMsU0FBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQXhCLFVBQUEsR0FBQUosY0FBQSxDQUNBbkUsSUFBQSxDQUFBd0QsUUFBQSxDQUFBLE1BQUEsRUFBQUMsT0FBQSxHQUFBLENBQUEsRUFBQXpELElBQUEsQ0FBQXlDLEtBQUEsRUFEQSxFQUVBekMsSUFBQSxDQUFBeUQsT0FBQSxHQUFBLENBQUEsRUFBQXpELElBQUEsQ0FBQTBELFFBQUEsQ0FBQUMsR0FBQSxDQUFBbEIsS0FBQSxFQUZBLEVBR0E0QixVQUhBLENBR0FFLFVBSEEsQ0FHQUYsVUFIQSxDQUZBO0FBQUEsd0JBT0E5RCxDQUFBLENBQUFtRSxPQUFBLENBQUFILFVBQUEsRUFBQSxVQUFBOUIsS0FBQSxFQUFBa0MsR0FBQSxFQUFBO0FBQUEsNEJBQ0EsSUFBQUgsR0FBQSxHQUFBLEVBQUFHLEdBQUEsRUFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSw0QkFHQSxJQUFBb0IsU0FBQSxDQUFBcEIsR0FBQSxDQUFBLEVBQUE7QUFBQSxnQ0FDQUgsR0FBQSxDQUFBd0IsUUFBQSxHQUFBRCxTQUFBLENBQUFwQixHQUFBLENBQUEsQ0FEQTtBQUFBLDZCQUhBO0FBQUEsNEJBTUFWLE1BQUEsQ0FBQTNFLElBQUEsQ0FBQWtGLEdBQUEsRUFOQTtBQUFBLHlCQUFBLEVBUEE7QUFBQSx3QkFnQkFuRSxRQUFBLENBQUEsWUFBQTtBQUFBLDRCQUNBeUMsUUFBQSxDQUFBbUIsTUFBQSxFQURBO0FBQUEseUJBQUEsRUFoQkE7QUFBQSxxQkFBQSxFQUxBO0FBQUEsaUJBMVJBO0FBQUEsZ0JBc1RBLFNBQUE1QixjQUFBLENBQUFyQyxJQUFBLEVBQUE4QyxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQyxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQTJDLE1BQUEsQ0FGQTtBQUFBLG9CQUdBLElBQUFPLFFBQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxvQkFLQVAsTUFBQSxHQUFBMUYsSUFBQSxDQUFBd0QsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUxBO0FBQUEsb0JBTUF5QyxRQUFBLENBQUEzRyxJQUFBLENBQUF5RCxJQUFBLENBQUFmLG9CQUFBLENBQUFoQyxJQUFBLENBQUF3RCxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFOQTtBQUFBLG9CQVFBVCxJQUFBLENBQUFQLGNBQUEsQ0FBQXlELFFBQUEsRUFBQUMsV0FBQSxFQVJBO0FBQUEsb0JBVUEsU0FBQUEsV0FBQSxDQUFBQyxpQkFBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQWxDLE1BQUEsR0FBQTtBQUFBLDRCQUNBbUMsR0FBQSxFQUFBVixNQURBO0FBQUEsNEJBRUFXLGFBQUEsRUFBQTlGLENBQUEsQ0FBQStGLFNBQUEsQ0FBQUgsaUJBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxVQUFBSSxDQUFBLEVBQUE7QUFBQSxnQ0FDQWhHLENBQUEsQ0FBQW1FLE9BQUEsQ0FBQTZCLENBQUEsRUFBQSxVQUFBQyxJQUFBLEVBQUFDLEtBQUEsRUFBQTtBQUFBLG9DQUNBRixDQUFBLENBQUFFLEtBQUEsSUFBQUQsSUFBQSxDQUFBeEcsSUFBQSxDQURBO0FBQUEsaUNBQUEsRUFEQTtBQUFBLGdDQUlBLE9BQUF1RyxDQUFBLENBSkE7QUFBQSw2QkFBQSxDQUZBO0FBQUEseUJBQUEsQ0FGQTtBQUFBLHdCQVlBekQsUUFBQSxDQUFBbUIsTUFBQSxFQVpBO0FBQUEscUJBVkE7QUFBQSxpQkF0VEE7QUFBQSxnQkFzVkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUE5QixlQUFBLENBQUFuQyxJQUFBLEVBQUE4QyxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQyxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBR0EsSUFBQTJELGFBQUEsR0FBQTFHLElBQUEsQ0FBQXdELFFBQUEsQ0FBQSxlQUFBLENBQUEsQ0FIQTtBQUFBLG9CQUlBLElBQUFtRCxjQUFBLEdBQUEzRyxJQUFBLENBQUF3RCxRQUFBLENBQUEsWUFBQSxDQUFBLENBSkE7QUFBQSxvQkFLQSxJQUFBeUIsU0FBQSxHQUFBeUIsYUFBQSxDQUFBakUsS0FBQSxFQUFBLENBTEE7QUFBQSxvQkFNQSxJQUFBOEIsVUFBQSxHQUFBb0MsY0FBQSxDQUFBbEUsS0FBQSxFQUFBLENBTkE7QUFBQSxvQkFRQSxJQUFBbUUsY0FBQSxHQUFBNUcsSUFBQSxDQUFBeUQsT0FBQSxHQUFBLENBQUEsRUFBQXpELElBQUEsQ0FBQTBELFFBQUEsQ0FBQUMsR0FBQSxDQUFBbEIsS0FBQSxFQUFBLENBUkE7QUFBQSxvQkFVQSxJQUFBb0UsZUFBQSxHQUFBLEVBQUEsQ0FWQTtBQUFBLG9CQVlBdEcsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBTyxTQUFBLEVBQUEsVUFBQXVCLElBQUEsRUFBQTdCLEdBQUEsRUFBQTtBQUFBLHdCQUVBLElBQUFtQyxZQUFBLEdBQUFOLElBQUEsQ0FBQXJCLEtBQUEsQ0FBQXBDLElBQUEsQ0FGQTtBQUFBLHdCQUlBO0FBQUEsNEJBQUF3QyxhQUFBLEdBQUFtQixhQUFBLENBQUFsRCxRQUFBLENBQUFtQixHQUFBLEVBQUFsQixPQUFBLEdBQUEsQ0FBQSxFQUFBekQsSUFBQSxDQUFBK0csYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUpBO0FBQUEsd0JBS0EsSUFBQUMseUJBQUEsR0FBQWpFLElBQUEsQ0FBQWQsZ0JBQUEsQ0FBQTBFLGNBQUEsQ0FBQWxELE9BQUEsR0FBQSxDQUFBLEVBQUF6RCxJQUFBLENBQUF5QyxLQUFBLEVBQUEsRUFBQW1FLGNBQUEsRUFBQSxZQUFBLEVBQUFqQyxHQUFBLENBQUEsQ0FMQTtBQUFBLHdCQU9BLElBQUFzQyxVQUFBLEdBQUEsRUFBQSxDQVBBO0FBQUEsd0JBU0EsSUFBQUQseUJBQUEsQ0FBQUUsS0FBQSxJQUFBRix5QkFBQSxDQUFBRSxLQUFBLENBQUFDLElBQUEsRUFBQTtBQUFBLDRCQUNBRixVQUFBLEdBQUFELHlCQUFBLENBQUFFLEtBQUEsQ0FBQUMsSUFBQSxDQURBO0FBQUEseUJBQUEsTUFFQSxJQUFBSCx5QkFBQSxDQUFBRyxJQUFBLEVBQUE7QUFBQSw0QkFDQUYsVUFBQSxHQUFBRCx5QkFBQSxDQUFBRyxJQUFBLENBREE7QUFBQSx5QkFYQTtBQUFBLHdCQWVBNUcsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBdUMsVUFBQSxFQUFBLFVBQUFHLFFBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUF2RSxHQUFBLEdBQUFpRSxZQUFBLEdBQUEsR0FBQSxHQUFBL0QsSUFBQSxDQUFBakMsT0FBQSxDQUFBQyxpQkFBQSxHQUFBLEdBQUEsR0FBQXFHLFFBQUEsQ0FEQTtBQUFBLDRCQUdBUCxlQUFBLENBQUF2SCxJQUFBLENBQUE7QUFBQSxnQ0FDQXVELEdBQUEsRUFBQUEsR0FEQTtBQUFBLGdDQUVBdUUsUUFBQSxFQUFBQSxRQUZBO0FBQUEsZ0NBR0FDLFlBQUEsRUFBQTFDLEdBSEE7QUFBQSxnQ0FJQVksYUFBQSxFQUFBQSxhQUpBO0FBQUEsNkJBQUEsRUFIQTtBQUFBLHlCQUFBLEVBZkE7QUFBQSxxQkFBQSxFQVpBO0FBQUEsb0JBd0NBeEMsSUFBQSxDQUFBaEIsc0JBQUEsQ0FBQXhCLENBQUEsQ0FBQStHLEdBQUEsQ0FBQVQsZUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLFVBQUFVLFNBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUF4QixTQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsd0JBR0F4RixDQUFBLENBQUFtRSxPQUFBLENBQUFtQyxlQUFBLEVBQUEsVUFBQUwsSUFBQSxFQUFBO0FBQUEsNEJBRUEsSUFBQSxDQUFBVCxTQUFBLENBQUFTLElBQUEsQ0FBQWEsWUFBQSxDQUFBLEVBQUE7QUFBQSxnQ0FDQXRCLFNBQUEsQ0FBQVMsSUFBQSxDQUFBYSxZQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsNkJBRkE7QUFBQSw0QkFNQXRCLFNBQUEsQ0FBQVMsSUFBQSxDQUFBYSxZQUFBLEVBQUEvSCxJQUFBLENBQUE7QUFBQSxnQ0FDQW1ELEtBQUEsRUFBQStELElBQUEsQ0FBQVksUUFEQTtBQUFBLGdDQUdBO0FBQUEsZ0NBQUFJLElBQUEsRUFBQUQsU0FBQSxDQUFBZixJQUFBLENBQUEzRCxHQUFBLEVBQUE3QyxJQUFBLENBQUF3RCxRQUFBLENBQUEsTUFBQSxFQUFBQSxRQUFBLENBQUEsWUFBQSxFQUFBdUQsYUFBQSxDQUFBUCxJQUFBLENBQUFqQixhQUFBLEtBQUFpQixJQUFBLENBQUFZLFFBSEE7QUFBQSw2QkFBQSxFQU5BO0FBQUEseUJBQUEsRUFIQTtBQUFBLHdCQWdCQXRFLFFBQUEsQ0FBQWlELFNBQUEsRUFoQkE7QUFBQSxxQkFBQSxFQXhDQTtBQUFBLGlCQXRWQTtBQUFBLGdCQXdaQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUFoRSxzQkFBQSxDQUFBMEYsYUFBQSxFQUFBM0UsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUMsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUEyRSxNQUFBLEdBQUEsQ0FBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQUMsS0FBQSxHQUFBLENBQUEsQ0FIQTtBQUFBLG9CQUlBLElBQUFKLFNBQUEsR0FBQSxFQUFBLENBSkE7QUFBQSxvQkFNQWhILENBQUEsQ0FBQW1FLE9BQUEsQ0FBQStDLGFBQUEsRUFBQSxVQUFBNUUsR0FBQSxFQUFBO0FBQUEsd0JBRUFFLElBQUEsQ0FBQXBCLFFBQUEsQ0FBQWtCLEdBQUEsRUFBQSxVQUFBN0MsSUFBQSxFQUFBQyxNQUFBLEVBQUFzRCxPQUFBLEVBQUE7QUFBQSw0QkFDQWdFLFNBQUEsQ0FBQTFFLEdBQUEsSUFBQTtBQUFBLGdDQUNBN0MsSUFBQSxFQUFBQSxJQURBO0FBQUEsZ0NBRUFDLE1BQUEsRUFBQUEsTUFGQTtBQUFBLGdDQUdBc0QsT0FBQSxFQUFBQSxPQUhBO0FBQUEsNkJBQUEsQ0FEQTtBQUFBLDRCQU1BbUUsTUFBQSxHQU5BO0FBQUEseUJBQUEsRUFGQTtBQUFBLHdCQVVBQyxLQUFBLEdBVkE7QUFBQSxxQkFBQSxFQU5BO0FBQUEsb0JBbUJBLElBQUFDLFFBQUEsR0FBQXRILFNBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0EsSUFBQXFILEtBQUEsS0FBQUQsTUFBQSxFQUFBO0FBQUEsNEJBQ0FwSCxTQUFBLENBQUF1SCxNQUFBLENBQUFELFFBQUEsRUFEQTtBQUFBLDRCQUVBLElBQUE5RSxRQUFBLEtBQUFJLFNBQUEsRUFBQTtBQUFBLGdDQUNBSixRQUFBLENBQUF5RSxTQUFBLEVBREE7QUFBQSw2QkFGQTtBQUFBLHlCQURBO0FBQUEscUJBQUEsRUFPQSxHQVBBLENBQUEsQ0FuQkE7QUFBQSxpQkF4WkE7QUFBQSxnQkEyYkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUF0RixnQkFBQSxDQUFBNkYsUUFBQSxFQUFBQyxVQUFBLEVBQUE7QUFBQSxvQkFDQSxTQUFBcEQsR0FBQSxJQUFBbUQsUUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQUEsUUFBQSxDQUFBRSxjQUFBLENBQUFyRCxHQUFBLENBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUEsT0FBQW1ELFFBQUEsQ0FBQW5ELEdBQUEsQ0FBQSxLQUFBLFFBQUEsSUFBQSxDQUFBc0QsS0FBQSxDQUFBQyxPQUFBLENBQUFKLFFBQUEsQ0FBQW5ELEdBQUEsQ0FBQSxDQUFBLElBQUFtRCxRQUFBLENBQUFuRCxHQUFBLEVBQUF3RCxJQUFBLEVBQUE7QUFBQSxnQ0FDQUwsUUFBQSxDQUFBbkQsR0FBQSxJQUFBeUQsTUFBQSxDQUFBQyxRQUFBLENBQUFOLFVBQUEsRUFBQUQsUUFBQSxDQUFBbkQsR0FBQSxFQUFBd0QsSUFBQSxDQUFBRyxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLGdDQUVBckcsZ0JBQUEsQ0FBQTZGLFFBQUEsQ0FBQW5ELEdBQUEsQ0FBQSxFQUFBb0QsVUFBQSxFQUZBO0FBQUEsNkJBREE7QUFBQSw0QkFLQSxJQUFBLE9BQUFELFFBQUEsQ0FBQW5ELEdBQUEsQ0FBQSxLQUFBLFFBQUEsSUFBQSxDQUFBc0QsS0FBQSxDQUFBQyxPQUFBLENBQUFKLFFBQUEsQ0FBQW5ELEdBQUEsQ0FBQSxDQUFBLElBQUFtRCxRQUFBLENBQUFuRCxHQUFBLE1BQUEsT0FBQSxFQUFBO0FBQUEsZ0NBQ0ExQyxnQkFBQSxDQUFBNkYsUUFBQSxDQUFBbkQsR0FBQSxDQUFBLEVBQUFvRCxVQUFBLEVBREE7QUFBQSw2QkFMQTtBQUFBLHlCQURBO0FBQUEscUJBREE7QUFBQSxvQkFZQSxPQUFBRCxRQUFBLENBWkE7QUFBQSxpQkEzYkE7QUFBQSxnQkFnZEE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUEzRCxjQUFBLENBQUFsRSxNQUFBLEVBQUE4SCxVQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBN0QsZ0JBQUEsR0FBQWpFLE1BQUEsQ0FEQTtBQUFBLG9CQUdBaUUsZ0JBQUEsR0FBQWpDLGdCQUFBLENBQUFpQyxnQkFBQSxFQUFBNkQsVUFBQSxDQUFBLENBSEE7QUFBQSxvQkFLQSxPQUFBN0QsZ0JBQUEsQ0FMQTtBQUFBLGlCQWhkQTtBQUFBLGdCQThkQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQW1CLGtCQUFBLENBQUFuQixnQkFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUQsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFtQixPQUFBLEdBQUFsQixnQkFBQSxDQUFBRyxVQUFBLENBQUFyRSxJQUFBLENBQUFrSCxLQUFBLENBQUE3QyxVQUFBLENBQUFFLFVBQUEsQ0FBQUYsVUFBQSxDQUZBO0FBQUEsb0JBS0E5RCxDQUFBLENBQUFtRSxPQUFBLENBQUFVLE9BQUEsRUFBQSxVQUFBM0MsS0FBQSxFQUFBa0MsR0FBQSxFQUFBO0FBQUEsd0JBQ0FsQyxLQUFBLENBQUE4QyxhQUFBLEdBQUFaLEdBQUEsQ0FEQTtBQUFBLHdCQUVBVixNQUFBLENBQUEzRSxJQUFBLENBQUFtRCxLQUFBLEVBRkE7QUFBQSxxQkFBQSxFQUxBO0FBQUEsb0JBbUJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwyQkFBQXdCLE1BQUEsQ0FuQkE7QUFBQSxpQkE5ZEE7QUFBQSxnQkFxZkEsU0FBQTBCLGtCQUFBLENBQUFkLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUE3RSxJQUFBLEdBQUE2RSxRQUFBLENBQUF1QixHQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBVixNQUFBLEdBQUExRixJQUFBLENBQUF3RCxRQUFBLENBQUEsWUFBQSxFQUFBZixLQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUlBbEMsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBRyxRQUFBLENBQUF3QixhQUFBLEVBQUEsVUFBQWtDLFFBQUEsRUFBQTVELEdBQUEsRUFBQTtBQUFBLHdCQUNBZSxNQUFBLENBQUFmLEdBQUEsSUFBQXBFLENBQUEsQ0FBQStHLEdBQUEsQ0FBQWlCLFFBQUEsRUFBQSxVQUFBQyxZQUFBLEVBQUE7QUFBQSw0QkFDQSxPQUFBQSxZQUFBLENBQUFoRixRQUFBLENBQUEsTUFBQSxFQUFBdUQsYUFBQSxDQUFBLElBQUEsQ0FBQSxDQURBO0FBQUEseUJBQUEsQ0FBQSxDQURBO0FBQUEsd0JBS0E7QUFBQSw0QkFBQSxDQUFBa0IsS0FBQSxDQUFBQyxPQUFBLENBQUFsSSxJQUFBLENBQUF3RCxRQUFBLENBQUEsZUFBQSxFQUFBQSxRQUFBLENBQUFtQixHQUFBLEVBQUFvQyxhQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFBQTtBQUFBLDRCQUNBckIsTUFBQSxDQUFBZixHQUFBLElBQUFlLE1BQUEsQ0FBQWYsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEseUJBTEE7QUFBQSxxQkFBQSxFQUpBO0FBQUEsb0JBY0EsT0FBQWUsTUFBQSxDQWRBO0FBQUEsaUJBcmZBO0FBQUEsZ0JBNGdCQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQVIsaUJBQUEsQ0FBQUYsSUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQWYsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBMUQsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBTSxJQUFBLEVBQUEsVUFBQUgsUUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQTdFLElBQUEsR0FBQTZFLFFBQUEsQ0FBQXVCLEdBQUEsQ0FEQTtBQUFBLHdCQUVBLElBQUFxQyxHQUFBLEdBQUF6SSxJQUFBLENBQUF3RCxRQUFBLENBQUEsWUFBQSxFQUFBZixLQUFBLEVBQUEsQ0FGQTtBQUFBLHdCQUlBbEMsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBRyxRQUFBLENBQUF3QixhQUFBLEVBQUEsVUFBQWtDLFFBQUEsRUFBQTVELEdBQUEsRUFBQTtBQUFBLDRCQUNBOEQsR0FBQSxDQUFBOUQsR0FBQSxJQUFBcEUsQ0FBQSxDQUFBK0csR0FBQSxDQUFBaUIsUUFBQSxFQUFBLFVBQUFDLFlBQUEsRUFBQTtBQUFBLGdDQUNBLElBQUFFLEtBQUEsR0FBQTdELFFBQUEsQ0FBQXVCLEdBQUEsQ0FBQTVDLFFBQUEsQ0FBQSxlQUFBLEVBQUFBLFFBQUEsQ0FBQW1CLEdBQUEsRUFBQWxCLE9BQUEsR0FBQSxDQUFBLEVBQUF6RCxJQUFBLENBQUErRyxhQUFBLENBQUEsTUFBQSxDQUFBLENBREE7QUFBQSxnQ0FNQTtBQUFBO0FBQUE7QUFBQSxvQ0FBQTJCLEtBQUEsRUFBQTtBQUFBLG9DQUNBLE9BQUFGLFlBQUEsQ0FBQWhGLFFBQUEsQ0FBQSxNQUFBLEVBQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQUF1RCxhQUFBLENBQUEyQixLQUFBLENBQUEsQ0FEQTtBQUFBLGlDQU5BO0FBQUEsZ0NBU0EsT0FBQUYsWUFBQSxDQUFBaEYsUUFBQSxDQUFBLE1BQUEsRUFBQXVELGFBQUEsQ0FBQSxJQUFBLENBQUEsQ0FUQTtBQUFBLDZCQUFBLEVBV0E0QixJQVhBLENBV0EsSUFYQSxDQUFBLENBREE7QUFBQSx5QkFBQSxFQUpBO0FBQUEsd0JBbUJBRixHQUFBLENBQUF0RCxLQUFBLEdBQUEsRUFBQSxDQW5CQTtBQUFBLHdCQW9CQTVFLENBQUEsQ0FBQXFJLE1BQUEsQ0FBQTVJLElBQUEsQ0FBQW1GLEtBQUEsRUFBQSxFQUFBLFVBQUEwRCxJQUFBLEVBQUE7QUFBQSw0QkFDQUosR0FBQSxDQUFBdEQsS0FBQSxDQUFBN0YsSUFBQSxDQUFBdUosSUFBQSxFQURBO0FBQUEseUJBQUEsRUFwQkE7QUFBQSx3QkF1QkE1RSxNQUFBLENBQUEzRSxJQUFBLENBQUFtSixHQUFBLEVBdkJBO0FBQUEscUJBQUEsRUFGQTtBQUFBLG9CQTJCQSxPQUFBeEUsTUFBQSxDQTNCQTtBQUFBLGlCQTVnQkE7QUFBQSxnQkFnakJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBM0IsY0FBQSxDQUFBdEMsSUFBQSxFQUFBOEMsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUMsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFpQyxJQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQWlCLFFBQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxvQkFJQWpHLElBQUEsQ0FBQXdELFFBQUEsQ0FBQSxNQUFBLEVBQUEwRCxLQUFBLENBQUEsVUFBQVQsS0FBQSxFQUFBaEUsS0FBQSxFQUFBO0FBQUEsd0JBRUF3RCxRQUFBLENBQUEzRyxJQUFBLENBQUF5RCxJQUFBLENBQUFmLG9CQUFBLENBQUFTLEtBQUEsQ0FBQSxFQUZBO0FBQUEsd0JBSUF1QyxJQUFBLENBQUExRixJQUFBLENBQUFtRCxLQUFBLEVBSkE7QUFBQSxxQkFBQSxFQUpBO0FBQUEsb0JBV0FNLElBQUEsQ0FBQVAsY0FBQSxDQUFBeUQsUUFBQSxFQUFBQyxXQUFBLEVBWEE7QUFBQSxvQkFhQSxTQUFBQSxXQUFBLENBQUFDLGlCQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBMkMsR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHdCQUdBdkksQ0FBQSxDQUFBbUUsT0FBQSxDQUFBTSxJQUFBLEVBQUEsVUFBQStELEdBQUEsRUFBQXRDLEtBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUF1QyxNQUFBLEdBQUE7QUFBQSxnQ0FDQTVDLEdBQUEsRUFBQTJDLEdBREE7QUFBQSxnQ0FFQTFDLGFBQUEsRUFBQTlGLENBQUEsQ0FBQStGLFNBQUEsQ0FBQUgsaUJBQUEsQ0FBQU0sS0FBQSxDQUFBLEVBQUEsVUFBQUYsQ0FBQSxFQUFBO0FBQUEsb0NBQ0FoRyxDQUFBLENBQUFtRSxPQUFBLENBQUE2QixDQUFBLEVBQUEsVUFBQUMsSUFBQSxFQUFBQyxLQUFBLEVBQUE7QUFBQSx3Q0FDQUYsQ0FBQSxDQUFBRSxLQUFBLElBQUFELElBQUEsQ0FBQXhHLElBQUEsQ0FEQTtBQUFBLHFDQUFBLEVBREE7QUFBQSxvQ0FJQSxPQUFBdUcsQ0FBQSxDQUpBO0FBQUEsaUNBQUEsQ0FGQTtBQUFBLDZCQUFBLENBREE7QUFBQSw0QkFXQXVDLEdBQUEsQ0FBQXhKLElBQUEsQ0FBQTBKLE1BQUEsRUFYQTtBQUFBLHlCQUFBLEVBSEE7QUFBQSx3QkFpQkFsRyxRQUFBLENBQUFnRyxHQUFBLEVBakJBO0FBQUEscUJBYkE7QUFBQSxpQkFoakJBO0FBQUEsZ0JBeWxCQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQTlHLG9CQUFBLENBQUFoQyxJQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBK0MsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFrQyxTQUFBLENBRkE7QUFBQSxvQkFHQSxJQUFBaEIsTUFBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLG9CQUtBLElBQUFnQixTQUFBLEdBQUFqRixJQUFBLENBQUF3RCxRQUFBLENBQUEsZUFBQSxFQUFBZixLQUFBLEVBQUEsRUFBQTtBQUFBLHdCQUNBbEMsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBTyxTQUFBLEVBQUEsVUFBQWdFLE9BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsNEJBQ0FqRixNQUFBLENBQUFpRixNQUFBLElBQUFuRyxJQUFBLENBQUFiLGdCQUFBLENBQUErRyxPQUFBLENBQUEsQ0FEQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFMQTtBQUFBLG9CQVVBLE9BQUFoRixNQUFBLENBVkE7QUFBQSxpQkF6bEJBO0FBQUEsZ0JBNG5CQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBL0IsZ0JBQUEsQ0FBQStHLE9BQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFsRyxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQThCLFFBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxvQkFJQSxJQUFBb0QsS0FBQSxDQUFBQyxPQUFBLENBQUFlLE9BQUEsQ0FBQWpKLElBQUEsQ0FBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQW1KLFNBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx3QkFFQTVJLENBQUEsQ0FBQW1FLE9BQUEsQ0FBQXVFLE9BQUEsQ0FBQWpKLElBQUEsRUFBQSxVQUFBb0osT0FBQSxFQUFBO0FBQUEsNEJBRUFELFNBQUEsQ0FBQTdKLElBQUEsQ0FBQTtBQUFBLGdDQUNBdUQsR0FBQSxFQUFBK0IsY0FBQSxDQUFBcUUsT0FBQSxDQUFBOUQsS0FBQSxDQUFBcEMsSUFBQSxFQUFBO0FBQUEsb0NBQUE3QixJQUFBLEVBQUE2QixJQUFBLENBQUFqQyxPQUFBLENBQUFDLGlCQUFBO0FBQUEsb0NBQUErRCxFQUFBLEVBQUFzRSxPQUFBLENBQUF0RSxFQUFBO0FBQUEsaUNBQUEsQ0FEQTtBQUFBLDZCQUFBLEVBRkE7QUFBQSx5QkFBQSxFQUZBO0FBQUEsd0JBUUFELFFBQUEsR0FBQXNFLFNBQUEsQ0FSQTtBQUFBLHFCQUFBLE1BVUE7QUFBQSx3QkFDQXRFLFFBQUEsR0FBQSxDQUFBO0FBQUEsZ0NBQ0FoQyxHQUFBLEVBQUErQixjQUFBLENBQUFxRSxPQUFBLENBQUE5RCxLQUFBLENBQUFwQyxJQUFBLEVBQUE7QUFBQSxvQ0FBQTdCLElBQUEsRUFBQTZCLElBQUEsQ0FBQWpDLE9BQUEsQ0FBQUMsaUJBQUE7QUFBQSxvQ0FBQStELEVBQUEsRUFBQW1FLE9BQUEsQ0FBQWpKLElBQUEsQ0FBQThFLEVBQUE7QUFBQSxpQ0FBQSxDQURBO0FBQUEsNkJBQUEsQ0FBQSxDQURBO0FBQUEscUJBZEE7QUFBQSxvQkFtQkEsT0FBQUQsUUFBQSxDQW5CQTtBQUFBLGlCQTVuQkE7QUFBQSxnQkF3cEJBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBckMsY0FBQSxDQUFBeUQsUUFBQSxFQUFBbkQsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQW1CLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBc0QsU0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUdBLElBQUE4QixNQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsb0JBSUEsSUFBQTFCLEtBQUEsR0FBQSxDQUFBLENBSkE7QUFBQSxvQkFLQSxJQUFBRCxNQUFBLEdBQUEsQ0FBQSxDQUxBO0FBQUEsb0JBT0FuSCxDQUFBLENBQUFtRSxPQUFBLENBQUF1QixRQUFBLEVBQUEsVUFBQU8sSUFBQSxFQUFBO0FBQUEsd0JBQ0FqRyxDQUFBLENBQUFtRSxPQUFBLENBQUE4QixJQUFBLEVBQUEsVUFBQThDLEdBQUEsRUFBQTtBQUFBLDRCQUNBL0ksQ0FBQSxDQUFBbUUsT0FBQSxDQUFBNEUsR0FBQSxFQUFBLFVBQUFMLE9BQUEsRUFBQTtBQUFBLGdDQUNBLElBQUFJLE1BQUEsQ0FBQUosT0FBQSxDQUFBcEcsR0FBQSxDQUFBLEVBQUE7QUFBQSxvQ0FDQTBHLE9BQUEsQ0FBQUMsR0FBQSxDQUFBLE9BQUEsRUFEQTtBQUFBLG9DQUVBN0IsS0FBQSxHQUZBO0FBQUEsaUNBQUEsTUFHQTtBQUFBLG9DQUNBaEcsUUFBQSxDQUFBc0gsT0FBQSxDQUFBcEcsR0FBQSxFQUFBNEcsT0FBQSxFQURBO0FBQUEsb0NBRUFKLE1BQUEsQ0FBQUosT0FBQSxDQUFBcEcsR0FBQSxJQUFBLEVBQUEsQ0FGQTtBQUFBLG9DQUdBOEUsS0FBQSxHQUhBO0FBQUEsb0NBSUFELE1BQUEsR0FKQTtBQUFBLGlDQUpBO0FBQUEsNkJBQUEsRUFEQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFBQSxFQVBBO0FBQUEsb0JBdUJBLElBQUFFLFFBQUEsR0FBQXRILFNBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0EsSUFBQUMsQ0FBQSxDQUFBbUosSUFBQSxDQUFBbkMsU0FBQSxNQUFBRyxNQUFBLEVBQUE7QUFBQSw0QkFDQXBILFNBQUEsQ0FBQXVILE1BQUEsQ0FBQUQsUUFBQSxFQURBO0FBQUEsNEJBR0FySCxDQUFBLENBQUFtRSxPQUFBLENBQUF1QixRQUFBLEVBQUEsVUFBQU8sSUFBQSxFQUFBbUQsRUFBQSxFQUFBO0FBQUEsZ0NBQ0FwSixDQUFBLENBQUFtRSxPQUFBLENBQUE4QixJQUFBLEVBQUEsVUFBQThDLEdBQUEsRUFBQU0sRUFBQSxFQUFBO0FBQUEsb0NBQ0FySixDQUFBLENBQUFtRSxPQUFBLENBQUE0RSxHQUFBLEVBQUEsVUFBQUwsT0FBQSxFQUFBWSxHQUFBLEVBQUE7QUFBQSx3Q0FDQTVGLE1BQUEsQ0FBQTBGLEVBQUEsSUFBQTFGLE1BQUEsQ0FBQTBGLEVBQUEsS0FBQSxFQUFBLENBREE7QUFBQSx3Q0FFQTFGLE1BQUEsQ0FBQTBGLEVBQUEsRUFBQUMsRUFBQSxJQUFBM0YsTUFBQSxDQUFBMEYsRUFBQSxFQUFBQyxFQUFBLEtBQUEsRUFBQSxDQUZBO0FBQUEsd0NBR0EzRixNQUFBLENBQUEwRixFQUFBLEVBQUFDLEVBQUEsRUFBQUMsR0FBQSxJQUFBdEMsU0FBQSxDQUFBMEIsT0FBQSxDQUFBcEcsR0FBQSxDQUFBLENBSEE7QUFBQSxxQ0FBQSxFQURBO0FBQUEsaUNBQUEsRUFEQTtBQUFBLDZCQUFBLEVBSEE7QUFBQSw0QkFhQUMsUUFBQSxDQUFBbUIsTUFBQSxFQWJBO0FBQUEseUJBREE7QUFBQSxxQkFBQSxFQWdCQSxHQWhCQSxDQUFBLENBdkJBO0FBQUEsb0JBeUNBLFNBQUF3RixPQUFBLENBQUF6SixJQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLHdCQUNBc0gsU0FBQSxDQUFBdkgsSUFBQSxDQUFBMEQsUUFBQSxDQUFBYixHQUFBLElBQUE7QUFBQSw0QkFDQTdDLElBQUEsRUFBQUEsSUFEQTtBQUFBLDRCQUVBQyxNQUFBLEVBQUFBLE1BRkE7QUFBQSx5QkFBQSxDQURBO0FBQUEsd0JBS0FzSixPQUFBLENBQUFDLEdBQUEsQ0FBQSxNQUFBLEVBTEE7QUFBQSxxQkF6Q0E7QUFBQSxpQkF4cEJBO0FBQUEsZ0JBK3NCQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUExRCxxQkFBQSxDQUFBWCxLQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBbEIsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBMUQsQ0FBQSxDQUFBbUUsT0FBQSxDQUFBUyxLQUFBLEVBQUEsVUFBQTFDLEtBQUEsRUFBQTtBQUFBLHdCQUNBd0IsTUFBQSxDQUFBM0UsSUFBQSxDQUFBO0FBQUEsNEJBQ0E0QixJQUFBLEVBQUEsUUFEQTtBQUFBLDRCQUVBb0UsS0FBQSxFQUFBN0MsS0FBQSxDQUFBNkMsS0FGQTtBQUFBLDRCQUdBdUQsSUFBQSxFQUFBcEcsS0FIQTtBQUFBLDRCQUlBcUgsT0FBQSxFQUFBLG9CQUpBO0FBQUEseUJBQUEsRUFEQTtBQUFBLHFCQUFBLEVBRkE7QUFBQSxvQkFVQSxPQUFBN0YsTUFBQSxDQVZBO0FBQUEsaUJBL3NCQTtBQUFBLGFBWkE7QUFBQSxTO1FBMnVCQW1FLE1BQUEsQ0FBQUMsUUFBQSxHQUFBLFVBQUE3RCxHQUFBLEVBQUF1RixJQUFBLEVBQUE7QUFBQSxZQUNBQSxJQUFBLEdBQUFBLElBQUEsQ0FBQUMsT0FBQSxDQUFBLFdBQUEsRUFBQSxLQUFBLENBQUEsQ0FEQTtBQUFBLFlBRUE7QUFBQSxZQUFBRCxJQUFBLEdBQUFBLElBQUEsQ0FBQUMsT0FBQSxDQUFBLFVBQUEsRUFBQSxLQUFBLENBQUEsQ0FGQTtBQUFBLFlBR0E7QUFBQSxZQUFBRCxJQUFBLEdBQUFBLElBQUEsQ0FBQUMsT0FBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLENBQUEsQ0FIQTtBQUFBLFlBSUE7QUFBQSxnQkFBQUMsQ0FBQSxHQUFBRixJQUFBLENBQUFHLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FKQTtBQUFBLFlBS0EsS0FBQSxJQUFBQyxDQUFBLEdBQUEsQ0FBQSxFQUFBNUQsQ0FBQSxHQUFBMEQsQ0FBQSxDQUFBRyxNQUFBLENBQUEsQ0FBQUQsQ0FBQSxHQUFBNUQsQ0FBQSxFQUFBLEVBQUE0RCxDQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBRSxDQUFBLEdBQUFKLENBQUEsQ0FBQUUsQ0FBQSxDQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBRSxDQUFBLElBQUE3RixHQUFBLEVBQUE7QUFBQSxvQkFDQUEsR0FBQSxHQUFBQSxHQUFBLENBQUE2RixDQUFBLENBQUEsQ0FEQTtBQUFBLGlCQUFBLE1BRUE7QUFBQSxvQkFDQSxPQURBO0FBQUEsaUJBSkE7QUFBQSxhQUxBO0FBQUEsWUFhQSxPQUFBN0YsR0FBQSxDQWJBO0FBQUEsU0FBQSxDO1FDOXhCQXBGLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQU8sT0FBQSxDQUFBLG9CQUFBLEVBQUEwSyxnQkFBQSxFO1FBQ0FBLGdCQUFBLENBQUFsSyxPQUFBLEdBQUE7QUFBQSxZQUFBLE9BQUE7QUFBQSxZQUFBLGFBQUE7QUFBQSxTQUFBLEM7UUFDQSxTQUFBa0ssZ0JBQUEsQ0FBQUMsS0FBQSxFQUFBeEssVUFBQSxFQUFBO0FBQUEsWUFDQSxPQUFBLFVBQUE4SSxJQUFBLEVBQUEyQixLQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBeEgsTUFBQSxHQUFBO0FBQUEsb0JBQ0F5SCxNQUFBLEVBQUE1QixJQUFBLENBQUE0QixNQURBO0FBQUEsb0JBRUE1SCxHQUFBLEVBQUFnRyxJQUFBLENBQUE2QixJQUZBO0FBQUEsb0JBR0ExSyxJQUFBLEVBQUF3SyxLQUFBLENBQUFoSyxLQUhBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQU9BZ0ssS0FBQSxDQUFBRyxVQUFBLENBQUEsb0JBQUEsRUFQQTtBQUFBLGdCQVFBLElBQUEsQ0FBQUgsS0FBQSxDQUFBSSxTQUFBLENBQUFDLFFBQUEsQ0FBQUMsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxLQUFBLENBREE7QUFBQSxpQkFSQTtBQUFBLGdCQVlBUCxLQUFBLENBQUF2SCxNQUFBLEVBQUErSCxJQUFBLENBQUFDLG1CQUFBLEVBQUFDLGlCQUFBLEVBWkE7QUFBQSxnQkFjQSxTQUFBRCxtQkFBQSxHQUFBO0FBQUEsb0JBQ0FqTCxVQUFBLENBQUErQixXQUFBLENBQUEsVUFBQTJELElBQUEsRUFBQTtBQUFBLHdCQUNBK0UsS0FBQSxDQUFBdkssTUFBQSxHQUFBd0YsSUFBQSxDQUFBeEYsTUFBQSxDQURBO0FBQUEsd0JBRUF1SyxLQUFBLENBQUEvRSxJQUFBLEdBQUFBLElBQUEsQ0FBQUEsSUFBQSxDQUZBO0FBQUEsd0JBR0ErRSxLQUFBLENBQUFoSyxLQUFBLEdBQUFpRixJQUFBLENBQUFqRixLQUFBLENBSEE7QUFBQSx3QkFLQWdLLEtBQUEsQ0FBQVUsTUFBQSxDQUFBNUwsSUFBQSxDQUFBO0FBQUEsNEJBQ0E0QixJQUFBLEVBQUEsU0FEQTtBQUFBLDRCQUVBaUssR0FBQSxFQUFBcEwsVUFBQSxDQUFBeUIsVUFBQSxDQUFBLGdCQUFBLENBRkE7QUFBQSx5QkFBQSxFQUxBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQWRBO0FBQUEsZ0JBMkJBLFNBQUF5SixpQkFBQSxDQUFBbkMsR0FBQSxFQUFBO0FBQUEsb0JBQ0EwQixLQUFBLENBQUFVLE1BQUEsQ0FBQTVMLElBQUEsQ0FBQTtBQUFBLHdCQUNBNEIsSUFBQSxFQUFBLFFBREE7QUFBQSx3QkFFQWlLLEdBQUEsRUFBQXJDLEdBQUEsQ0FBQXNDLFVBQUEsSUFBQXJMLFVBQUEsQ0FBQXlCLFVBQUEsQ0FBQSxhQUFBLENBRkE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBM0JBO0FBQUEsYUFBQSxDQURBO0FBQUEsUztRQ0ZBcEMsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBTyxPQUFBLENBQUEsb0JBQUEsRUFBQXlMLGdCQUFBLEU7UUFDQUEsZ0JBQUEsQ0FBQWpMLE9BQUEsR0FBQTtBQUFBLFlBQUEsT0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUFpTCxnQkFBQSxDQUFBZCxLQUFBLEVBQUF4SyxVQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsVUFBQThJLElBQUEsRUFBQTJCLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUF4SCxNQUFBLEdBQUE7QUFBQSxvQkFDQXlILE1BQUEsRUFBQTVCLElBQUEsQ0FBQTRCLE1BREE7QUFBQSxvQkFFQTVILEdBQUEsRUFBQWdHLElBQUEsQ0FBQTZCLElBRkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBTUFILEtBQUEsQ0FBQXZILE1BQUEsRUFBQStILElBQUEsQ0FBQU8sbUJBQUEsRUFBQUMsaUJBQUEsRUFOQTtBQUFBLGdCQVFBLFNBQUFELG1CQUFBLEdBQUE7QUFBQSxvQkFDQSxJQUFBdkwsVUFBQSxDQUFBbUIsSUFBQSxLQUFBbkIsVUFBQSxDQUFBa0IsVUFBQSxFQUFBO0FBQUEsd0JBQ0FsQixVQUFBLENBQUE4QixZQUFBLENBQUEsVUFBQWtELEtBQUEsRUFBQTtBQUFBLDRCQUNBeUYsS0FBQSxDQUFBeEYsSUFBQSxHQUFBRCxLQUFBLENBQUFDLElBQUEsQ0FEQTtBQUFBLDRCQUVBd0YsS0FBQSxDQUFBcEYsT0FBQSxHQUFBTCxLQUFBLENBQUFLLE9BQUEsQ0FGQTtBQUFBLDRCQUdBb0YsS0FBQSxDQUFBckYsS0FBQSxHQUFBSixLQUFBLENBQUFJLEtBQUEsQ0FIQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFBQSxNQU1BLElBQUFwRixVQUFBLENBQUFtQixJQUFBLEtBQUFuQixVQUFBLENBQUFpQixTQUFBLEVBQUE7QUFBQSx3QkFDQXdKLEtBQUEsQ0FBQWdCLFFBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxxQkFQQTtBQUFBLG9CQVdBaEIsS0FBQSxDQUFBVSxNQUFBLENBQUE1TCxJQUFBLENBQUE7QUFBQSx3QkFDQTRCLElBQUEsRUFBQSxTQURBO0FBQUEsd0JBRUFpSyxHQUFBLEVBQUFwTCxVQUFBLENBQUF5QixVQUFBLENBQUEsZ0JBQUEsQ0FGQTtBQUFBLHFCQUFBLEVBWEE7QUFBQSxpQkFSQTtBQUFBLGdCQTBCQSxTQUFBK0osaUJBQUEsQ0FBQXpDLEdBQUEsRUFBQTtBQUFBLG9CQUNBMEIsS0FBQSxDQUFBVSxNQUFBLENBQUE1TCxJQUFBLENBQUE7QUFBQSx3QkFDQTRCLElBQUEsRUFBQSxRQURBO0FBQUEsd0JBRUFpSyxHQUFBLEVBQUFyQyxHQUFBLENBQUFzQyxVQUFBLElBQUFyTCxVQUFBLENBQUF5QixVQUFBLENBQUEsYUFBQSxDQUZBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQTFCQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFM7UUNGQXBDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQU8sT0FBQSxDQUFBLGtCQUFBLEVBQUE2TCxjQUFBLEU7UUFDQUEsY0FBQSxDQUFBckwsT0FBQSxHQUFBLENBQUEsV0FBQSxDQUFBLEM7UUFDQSxTQUFBcUwsY0FBQSxDQUFBQyxTQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsVUFBQTdDLElBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUE4QyxZQUFBLEdBQUE5QyxJQUFBLENBQUErQyxVQUFBLENBQUE1TCxJQUFBLENBQUErRyxhQUFBLENBQUEsTUFBQSxDQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBOEUsVUFBQSxHQUFBRixZQUFBLENBQUEzQixPQUFBLENBQUEsZUFBQSxFQUFBLFVBQUE4QixLQUFBLEVBQUFDLEVBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUFsRCxJQUFBLENBQUFtRCxXQUFBLENBQUFqRixhQUFBLENBQUFnRixFQUFBLENBQUEsQ0FEQTtBQUFBLGlCQUFBLENBQUEsQ0FGQTtBQUFBLGdCQU1BTCxTQUFBLENBQUE3SSxHQUFBLENBQUFnSixVQUFBLEVBTkE7QUFBQSxhQUFBLENBREE7QUFBQSxTO1FDREE7QUFBQSxRQUFBek0sT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBUyxRQUFBLENBQUEsY0FBQSxFQUFBbU0sV0FBQSxFO1FBQ0FBLFdBQUEsQ0FBQTdMLE9BQUEsR0FBQSxFQUFBLEM7UUFDQSxTQUFBNkwsV0FBQSxHQUFBO0FBQUEsWUFFQSxJQUFBbk0sUUFBQSxHQUFBO0FBQUEsZ0JBQ0FvTSxPQUFBLEVBQUEsRUFEQTtBQUFBLGdCQUVBaE0sSUFBQSxFQUFBaU0sY0FGQTtBQUFBLGFBQUEsQ0FGQTtBQUFBLFlBT0FBLGNBQUEsQ0FBQS9MLE9BQUEsR0FBQTtBQUFBLGdCQUFBLGtCQUFBO0FBQUEsZ0JBQUEsb0JBQUE7QUFBQSxnQkFBQSxvQkFBQTtBQUFBLGdCQUFBLG9CQUFBO0FBQUEsYUFBQSxDQVBBO0FBQUEsWUFRQSxPQUFBTixRQUFBLENBUkE7QUFBQSxZQVVBLFNBQUFxTSxjQUFBLENBQUFDLFVBQUEsRUFBQUMsWUFBQSxFQUFBQyxZQUFBLEVBQUFDLFlBQUEsRUFBQTtBQUFBLGdCQUVBO0FBQUEscUJBQUFMLE9BQUEsR0FBQTtBQUFBLG9CQUNBTSxVQUFBLEVBQUFKLFVBREE7QUFBQSxvQkFFQUssVUFBQSxFQUFBTCxVQUZBO0FBQUEsb0JBR0FNLFFBQUEsRUFBQU4sVUFIQTtBQUFBLG9CQUlBTyxJQUFBLEVBQUFQLFVBSkE7QUFBQSxvQkFLQVEsTUFBQSxFQUFBUCxZQUxBO0FBQUEsb0JBTUFRLE1BQUEsRUFBQVAsWUFOQTtBQUFBLG9CQU9BeEksTUFBQSxFQUFBeUksWUFQQTtBQUFBLGlCQUFBLENBRkE7QUFBQSxnQkFXQSxPQUFBO0FBQUEsb0JBQ0FPLE1BQUEsRUFBQSxVQUFBakUsSUFBQSxFQUFBMkIsS0FBQSxFQUFBO0FBQUEsd0JBQ0EsS0FBQTBCLE9BQUEsQ0FBQXJELElBQUEsQ0FBQStDLFVBQUEsQ0FBQTVMLElBQUEsQ0FBQStHLGFBQUEsQ0FBQSxLQUFBLENBQUEsRUFBQThCLElBQUEsRUFBQTJCLEtBQUEsRUFEQTtBQUFBLHFCQUFBLENBRUF1QyxJQUZBLENBRUEsSUFGQSxDQURBO0FBQUEsaUJBQUEsQ0FYQTtBQUFBLGFBVkE7QUFBQSxTO1FDSEEzTixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFPLE9BQUEsQ0FBQSxvQkFBQSxFQUFBb04sZ0JBQUEsRTtRQUNBQSxnQkFBQSxDQUFBNU0sT0FBQSxHQUFBO0FBQUEsWUFBQSxPQUFBO0FBQUEsWUFBQSxhQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQTRNLGdCQUFBLENBQUF6QyxLQUFBLEVBQUF4SyxVQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsVUFBQThJLElBQUEsRUFBQTJCLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUF4SCxNQUFBLEdBQUE7QUFBQSxvQkFDQXlILE1BQUEsRUFBQTVCLElBQUEsQ0FBQTRCLE1BREE7QUFBQSxvQkFFQTVILEdBQUEsRUFBQWdHLElBQUEsQ0FBQTZCLElBRkE7QUFBQSxvQkFHQTFLLElBQUEsRUFBQXdLLEtBQUEsQ0FBQWhLLEtBSEE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBT0FnSyxLQUFBLENBQUFHLFVBQUEsQ0FBQSxvQkFBQSxFQVBBO0FBQUEsZ0JBUUEsSUFBQSxDQUFBSCxLQUFBLENBQUFJLFNBQUEsQ0FBQUMsUUFBQSxDQUFBQyxNQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBLEtBQUEsQ0FEQTtBQUFBLGlCQVJBO0FBQUEsZ0JBWUFQLEtBQUEsQ0FBQXZILE1BQUEsRUFBQStILElBQUEsQ0FBQWtDLG1CQUFBLEVBQUFDLGlCQUFBLEVBWkE7QUFBQSxnQkFjQSxTQUFBRCxtQkFBQSxHQUFBO0FBQUEsb0JBQ0FsTixVQUFBLENBQUErQixXQUFBLENBQUEsVUFBQTJELElBQUEsRUFBQTtBQUFBLHdCQUNBK0UsS0FBQSxDQUFBdkssTUFBQSxHQUFBd0YsSUFBQSxDQUFBeEYsTUFBQSxDQURBO0FBQUEsd0JBRUF1SyxLQUFBLENBQUEvRSxJQUFBLEdBQUFBLElBQUEsQ0FBQUEsSUFBQSxDQUZBO0FBQUEsd0JBR0ErRSxLQUFBLENBQUFoSyxLQUFBLEdBQUFpRixJQUFBLENBQUFqRixLQUFBLENBSEE7QUFBQSx3QkFJQWdLLEtBQUEsQ0FBQVUsTUFBQSxDQUFBNUwsSUFBQSxDQUFBO0FBQUEsNEJBQ0E0QixJQUFBLEVBQUEsU0FEQTtBQUFBLDRCQUVBaUssR0FBQSxFQUFBcEwsVUFBQSxDQUFBeUIsVUFBQSxDQUFBLGdCQUFBLENBRkE7QUFBQSx5QkFBQSxFQUpBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQWRBO0FBQUEsZ0JBMEJBLFNBQUEwTCxpQkFBQSxDQUFBcEUsR0FBQSxFQUFBO0FBQUEsb0JBQ0EwQixLQUFBLENBQUFVLE1BQUEsQ0FBQTVMLElBQUEsQ0FBQTtBQUFBLHdCQUNBNEIsSUFBQSxFQUFBLFFBREE7QUFBQSx3QkFFQWlLLEdBQUEsRUFBQXJDLEdBQUEsQ0FBQXNDLFVBQUEsSUFBQXJMLFVBQUEsQ0FBQXlCLFVBQUEsQ0FBQSxhQUFBLENBRkE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBMUJBO0FBQUEsYUFBQSxDQURBO0FBQUEsUztRQ0ZBcEMsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBOE4sU0FBQSxDQUFBLFVBQUEsRUFBQUMsaUJBQUEsRTtRQUdBO0FBQUEsaUJBQUFBLGlCQUFBLEdBQUE7QUFBQSxZQUNBLElBQUFELFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBckQsT0FBQSxFQUFBLElBRkE7QUFBQSxnQkFHQXNELFVBQUEsRUFBQUMscUJBSEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQU9BQSxxQkFBQSxDQUFBbk4sT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLGFBQUE7QUFBQSxnQkFBQSxjQUFBO0FBQUEsYUFBQSxDQVBBO0FBQUEsWUFTQSxPQUFBK00sU0FBQSxDQVRBO0FBQUEsWUFXQSxTQUFBSSxxQkFBQSxDQUFBQyxNQUFBLEVBQUF6TixVQUFBLEVBQUFrTSxXQUFBLEVBQUE7QUFBQSxnQkFDQXVCLE1BQUEsQ0FBQXRDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxnQkFHQXNDLE1BQUEsQ0FBQTVDLFNBQUEsR0FBQSxFQUNBQyxRQUFBLEVBQUEsRUFEQSxFQUFBLENBSEE7QUFBQSxnQkFPQTJDLE1BQUEsQ0FBQUMsWUFBQSxHQUFBLFVBQUFqRCxLQUFBLEVBQUE7QUFBQSxvQkFDQWdELE1BQUEsQ0FBQTVDLFNBQUEsR0FBQUosS0FBQSxDQURBO0FBQUEsaUJBQUEsQ0FQQTtBQUFBLGdCQVdBekssVUFBQSxDQUFBK0IsV0FBQSxDQUFBLFVBQUEyRCxJQUFBLEVBQUE7QUFBQSxvQkFDQStILE1BQUEsQ0FBQXZOLE1BQUEsR0FBQXdGLElBQUEsQ0FBQXhGLE1BQUEsQ0FEQTtBQUFBLG9CQUVBdU4sTUFBQSxDQUFBL0gsSUFBQSxHQUFBQSxJQUFBLENBQUFBLElBQUEsQ0FGQTtBQUFBLG9CQUdBK0gsTUFBQSxDQUFBaE4sS0FBQSxHQUFBaUYsSUFBQSxDQUFBakYsS0FBQSxDQUhBO0FBQUEsb0JBSUFnTixNQUFBLENBQUFySSxLQUFBLEdBQUFNLElBQUEsQ0FBQU4sS0FBQSxDQUpBO0FBQUEsb0JBS0FxSSxNQUFBLENBQUFFLE9BQUEsR0FMQTtBQUFBLGlCQUFBLEVBWEE7QUFBQSxnQkFtQkFGLE1BQUEsQ0FBQUcsSUFBQSxHQUFBLFVBQUFDLE1BQUEsRUFBQW5JLElBQUEsRUFBQTtBQUFBLG9CQUNBd0csV0FBQSxDQUFBYSxNQUFBLENBQUFySCxJQUFBLENBQUFvRCxJQUFBLEVBQUEyRSxNQUFBLEVBREE7QUFBQSxpQkFBQSxDQW5CQTtBQUFBLGdCQXVCQUEsTUFBQSxDQUFBSyxFQUFBLEdBQUEsVUFBQWhGLElBQUEsRUFBQTtBQUFBLG9CQUNBb0QsV0FBQSxDQUFBYSxNQUFBLENBQUFqRSxJQUFBLEVBQUEyRSxNQUFBLEVBREE7QUFBQSxpQkFBQSxDQXZCQTtBQUFBLGdCQTJCQUEsTUFBQSxDQUFBTSxVQUFBLEdBQUEsVUFBQXJILEtBQUEsRUFBQTtBQUFBLG9CQUNBK0csTUFBQSxDQUFBdEMsTUFBQSxDQUFBNkMsTUFBQSxDQUFBdEgsS0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLGlCQUFBLENBM0JBO0FBQUEsYUFYQTtBQUFBLFM7UUNIQXJILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQThOLFNBQUEsQ0FBQSxXQUFBLEVBQUFhLGtCQUFBLEU7UUFFQUEsa0JBQUEsQ0FBQTVOLE9BQUEsR0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFlBQUEsY0FBQTtBQUFBLFNBQUEsQztRQUdBO0FBQUEsaUJBQUE0TixrQkFBQSxDQUFBak8sVUFBQSxFQUFBa00sV0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBa0IsU0FBQSxHQUFBO0FBQUEsZ0JBQ0FFLFFBQUEsRUFBQSxHQURBO0FBQUEsZ0JBRUFDLFVBQUEsRUFBQVcsc0JBRkE7QUFBQSxhQUFBLENBREE7QUFBQSxZQU1BQSxzQkFBQSxDQUFBN04sT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBTkE7QUFBQSxZQVFBLE9BQUErTSxTQUFBLENBUkE7QUFBQSxZQVVBLFNBQUFjLHNCQUFBLENBQUFULE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUF0QyxNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBR0FuTCxVQUFBLENBQUE4QixZQUFBLENBQUEsVUFBQWtELEtBQUEsRUFBQTtBQUFBLG9CQUNBeUksTUFBQSxDQUFBeEksSUFBQSxHQUFBRCxLQUFBLENBQUFDLElBQUEsQ0FEQTtBQUFBLG9CQUVBd0ksTUFBQSxDQUFBcEksT0FBQSxHQUFBTCxLQUFBLENBQUFLLE9BQUEsQ0FGQTtBQUFBLG9CQUdBb0ksTUFBQSxDQUFBckksS0FBQSxHQUFBSixLQUFBLENBQUFJLEtBQUE7QUFIQSxpQkFBQSxFQUhBO0FBQUEsZ0JBVUFxSSxNQUFBLENBQUFHLElBQUEsR0FBQSxVQUFBOUUsSUFBQSxFQUFBO0FBQUEsb0JBQ0FvRCxXQUFBLENBQUFhLE1BQUEsQ0FBQWpFLElBQUEsRUFBQTJFLE1BQUEsRUFEQTtBQUFBLGlCQUFBLENBVkE7QUFBQSxnQkFjQUEsTUFBQSxDQUFBTSxVQUFBLEdBQUEsVUFBQXJILEtBQUEsRUFBQTtBQUFBLG9CQUNBK0csTUFBQSxDQUFBdEMsTUFBQSxDQUFBNkMsTUFBQSxDQUFBdEgsS0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLGlCQUFBLENBZEE7QUFBQSxhQVZBO0FBQUEsUztRQ0xBckgsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBOE4sU0FBQSxDQUFBLFNBQUEsRUFBQWUsZ0JBQUEsRTtRQUVBLFNBQUFBLGdCQUFBLEdBQUE7QUFBQSxZQUNBLElBQUFmLFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBYyxRQUFBLEVBQUEsdUNBRkE7QUFBQSxnQkFHQTNELEtBQUEsRUFBQSxFQUNBNEQsU0FBQSxFQUFBLFlBREEsRUFIQTtBQUFBLGdCQU1BZCxVQUFBLEVBQUFlLG9CQU5BO0FBQUEsZ0JBT0F4RixJQUFBLEVBQUEsVUFBQTJCLEtBQUEsRUFBQThELEVBQUEsRUFBQUMsSUFBQSxFQUFBQyxJQUFBLEVBQUE7QUFBQSxpQkFQQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFlBYUFILG9CQUFBLENBQUFqTyxPQUFBLEdBQUE7QUFBQSxnQkFBQSxRQUFBO0FBQUEsZ0JBQUEsYUFBQTtBQUFBLGFBQUEsQ0FiQTtBQUFBLFlBZUEsT0FBQStNLFNBQUEsQ0FmQTtBQUFBLFlBaUJBLFNBQUFrQixvQkFBQSxDQUFBYixNQUFBLEVBQUF6TixVQUFBLEVBQUE7QUFBQSxnQkFDQXlOLE1BQUEsQ0FBQWlCLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQWpCLE1BQUEsQ0FBQVksU0FBQSxDQUFBcEwsTUFBQSxDQUFBOUIsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFuQixVQUFBLENBQUFzQixRQUFBLENBQUFtTSxNQUFBLENBQUFZLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUyIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpOyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJyxcbiAgICAnPGdyaWQtdGFibGU+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8dGFibGUgY2xhc3M9XCJ0YWJsZSBncmlkXCI+JytcbiAgICAgICAgJzx0aGVhZD4nK1xuICAgICAgICAgICc8dHI+JytcbiAgICAgICAgICAgICc8dGggbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj57e2NvbHVtbi50aXRsZX19PC90aD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3RoZWFkPicrXG4gICAgICAgICc8dGJvZHk+JytcbiAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAgICAgICAgICc8dGQgbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1wiPicrXG4gICAgICAgICAgICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gcm93LmxpbmtzXCI+JyArXG4gICAgICAgICAgICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAnPC90ZD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3Rib2R5PicrXG4gICAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPidcbiAgKTtcblxuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCcsXG4gICAgJzxncmlkLWZvcm0+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImdvKGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxkaXY+JyArXG4gICAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzwvZGl2PicgK1xuICAgICAgJzxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cImdyaWRGb3JtXCIgbmctaW5pdD1cInNldEZvcm1TY29wZSh0aGlzKVwiJyArXG4gICAgICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICAgICAnY2xhc3M9XCJmb3JtLWhvcml6b250YWxcIiByb2xlPVwiZm9ybVwiIG5nLWlmPVwiaGlkZUZvcm0gIT09IHRydWVcIj4nK1xuICAgICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuICB2YXIgZGF0YSxcbiAgICAgIHNjaGVtYTtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldCgkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXREYXRhOiBzZXREYXRhLFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0U2NoZW1hOiBzZXRTY2hlbWEsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgICAgbG9hZENvbGxlY3Rpb25SZXNvdXJjZTogbG9hZENvbGxlY3Rpb25SZXNvdXJjZSxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldERhdGEodmFsdWUpIHtcbiAgICAgIGRhdGEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRTY2hlbWEodmFsdWUpIHtcbiAgICAgIHNjaGVtYSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHNlbGYuc2V0RGF0YShkYXRhKTtcbiAgICAgICAgc2VsZi5zZXRTY2hlbWEoc2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZXQgbW9kZWwgYmVmb3JlIGNhbGwgZmV0Y2ggZGF0YScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfVEFCTEU7XG4gICAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy50YWJsZSkge1xuICAgICAgICAgICAgc2VsZi5jb25maWcudGFibGUgPSB7fTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUucm93cyA9IHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMgPSBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy50YWJsZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuICAgICAgICBpZiAoIXNlbGYuY29uZmlnLmZvcm0pIHtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLm1vZGVsID0gZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBfLnVuaW9uKHNlbGYuY29uZmlnLmZvcm0uZm9ybSwgZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY29uZmlnLmZvcm0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBtZXJnZVJlbFNjaGVtYShcbiAgICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICAgIH0pO1xuXG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGZpZWxkcztcbiAgICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlc291cmNlTGluayArICcvJyArIHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSArJy8nICsgZW51bUl0ZW07XG5cbiAgICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcblxuICAgICAgc2VsZi5sb2FkQ29sbGVjdGlvblJlc291cmNlKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VUaXRsZU1hcHMsIGZ1bmN0aW9uIChpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICogQHBhcmFtIGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkQ29sbGVjdGlvblJlc291cmNlKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rUmVzb3VyY2VzLCBmdW5jdGlvbiAodXJsKSB7XG5cbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZ1bmN0aW9uIChkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgICByZXNvdXJjZXNbdXJsXSA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgdG90YWwrKztcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuXG4gICAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgICB9XG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTsqL1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZmllbGRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICAgIHZhciB0bXAgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICAgIHRtcFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gcmVzb3VyY2Uub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJlc291cmNlKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRtcC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICB0bXAubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRtcCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSb3dzQnlEYXRhKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcm93cyA9IFtdO1xuICAgICAgdmFyIGluY2x1ZGVkID0gW107XG4gICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXMpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcblxuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlZFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgdmFyIGNhY2hlZCA9IHt9O1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuXG4gICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcbiAgICAgICAgICAgIGlmIChjYWNoZWRbcmVsSXRlbS51cmxdKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWNoZScpO1xuICAgICAgICAgICAgICB0b3RhbCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9hZERhdGEocmVsSXRlbS51cmwsIHN1Y2Nlc3MpO1xuICAgICAgICAgICAgICBjYWNoZWRbcmVsSXRlbS51cmxdID0ge307XG4gICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfLnNpemUocmVzb3VyY2VzKSA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG5cbiAgICAgICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0sIGtpKSB7XG4gICAgICAgICAgICBfLmZvckVhY2goaXRlbSwgZnVuY3Rpb24ocmVsLCBrcikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrcmkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldID0gcmVzdWx0W2tpXSB8fCB7fTtcbiAgICAgICAgICAgICAgICByZXN1bHRba2ldW2tyXSA9IHJlc3VsdFtraV1ba3JdIHx8IFtdO1xuICAgICAgICAgICAgICAgIHJlc3VsdFtraV1ba3JdW2tyaV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY2FsbGJhY2socmVzdWx0KVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuXG4gICAgICBmdW5jdGlvbiBzdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICByZXNvdXJjZXNbZGF0YS5kb2N1bWVudC51cmxdID0ge1xuICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgc2NoZW1hOiBzY2hlbWFcbiAgICAgICAgfTtcbiAgICAgICAgY29uc29sZS5sb2coJ2xvYWQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgfVxufVxuXG5PYmplY3QuYnlTdHJpbmcgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldO1xuICAgIGlmIChrIGluIG9iaikge1xuICAgICAgb2JqID0gb2JqW2tdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59OyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChncmlkRW50aXR5LnR5cGUgPT09IGdyaWRFbnRpdHkuVFlQRV9UQUJMRSkge1xuICAgICAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0obGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZT0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSkge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgIGdyaWRFbnRpdHkuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgIC8vJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5KSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LnNldE1vZGVsKCRzY29wZS5ncmlkTW9kZWwpO1xuICB9XG59Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=