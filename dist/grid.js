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
                    setModel: setModel,
                    getModel: getModel,
                    getMessage: getMessage,
                    setMessage: setMessage,
                    fetchData: fetchData,
                    loadData: loadData,
                    loadSchema: loadSchema,
                    getTableInfo: getTableInfo,
                    getFormInfo: getFormInfo,
                    fetchCollection: fetchCollection,
                    getTitleMapsForRelations: getTitleMapsForRelations,
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
                function getTitleMapsForRelations(data) {
                    var self = this;
                    var sourceTitleMaps = [];
                    var dataRelations = data.property('relationships');
                    var dataAttributes = data.property('attributes');
                    var relations = dataRelations.value();
                    var attributes = dataAttributes.value();
                    var documentSchema = data.schemas()[0].data.document.raw.value();
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
                    return sourceTitleMaps;
                }
                /**
     * Create titleMap for form and load dependency resource
     * @param data
     * @param callback
     * @private
     */
                function _createTitleMap(data, callback) {
                    var self = this;
                    var sourceTitleMaps = self.getTitleMapsForRelations(data);
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
     *
     * @param {array} linkResources
     * @param callback
     */
                function fetchCollection(linkResources, callback) {
                    var self = this;
                    var loaded = 0;
                    var total = 0;
                    var resources = {};
                    var links;
                    links = _.uniq(linkResources);
                    _.forEach(links, function (url) {
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
                /**
     * Convert Jsonary Data to result model for rendering form
     *
     * @param resource
     * @returns {*}
     */
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
                    _.forEach(rows, function (row) {
                        var data = row.own;
                        var rowResult = data.property('attributes').value();
                        _.forEach(row.relationships, function (relation, key) {
                            rowResult[key] = _.map(relation, function (relationItem) {
                                var field = row.own.property('relationships').property(key).schemas()[0].data.propertyValue('name');
                                /** name additional field(relation row) */
                                if (field) {
                                    return relationItem.property('data').property('attributes').propertyValue(field);
                                }
                                return relationItem.property('data').propertyValue('id');
                            }).join(', ');
                        });
                        rowResult.links = [];
                        _.forOwn(data.links(), function (link) {
                            rowResult.links.push(link);
                        });
                        result.push(rowResult);
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
                function getLinkFromRowsDataRelations(rowsRelationships) {
                    var result = [];
                    _.forEach(rowsRelationships, function (row) {
                        _.forEach(row, function (rel) {
                            _.forEach(rel, function (relItem) {
                                result.push(relItem.url);
                            });
                        });
                    });
                    return result;
                }
                /**
     * Multiple (batch) load data
     *
     * @param rowsRelationships
     * @param callback
     */
                function _batchLoadData(rowsRelationships, callback) {
                    var self = this;
                    self.fetchCollection(getLinkFromRowsDataRelations(rowsRelationships), function (resources) {
                        var result = [];
                        _.forEach(rowsRelationships, function (row, kRow) {
                            _.forEach(row, function (rel, kRel) {
                                _.forEach(rel, function (relItem, kRelItem) {
                                    result[kRow] = result[kRow] || {};
                                    result[kRow][kRel] = result[kRow][kRel] || [];
                                    result[kRow][kRel][kRelItem] = resources[relItem.url];
                                });
                            });
                        });
                        callback(result);
                    });
                }
                /**
     * Generate config for rendering buttons from schema links
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXRNb2RlbCIsImdldE1vZGVsIiwiZ2V0TWVzc2FnZSIsInNldE1lc3NhZ2UiLCJmZXRjaERhdGEiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJnZXRUYWJsZUluZm8iLCJnZXRGb3JtSW5mbyIsImZldGNoQ29sbGVjdGlvbiIsImdldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX3JlcGxhY2VGcm9tRnVsbCIsIl9nZXRSZWxhdGlvbkxpbmsiLCJfY3JlYXRlVGl0bGVNYXAiLCJfZ2V0Rm9ybUNvbmZpZyIsIl9nZXRGaWVsZHNGb3JtIiwiX2dldFJvd3NCeURhdGEiLCJfZ2V0RW1wdHlEYXRhIiwiX2JhdGNoTG9hZERhdGEiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInVybCIsImNhbGxiYWNrIiwic2VsZiIsInBhcmFtcyIsImZldGNoRGF0YVN1Y2Nlc3MiLCJ1bmRlZmluZWQiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwicHJvcGVydHkiLCJzY2hlbWFzIiwiZG9jdW1lbnQiLCJyYXciLCJ2YWx1ZSIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJhZGRTY2hlbWEiLCJmdWxsU2NoZW1hIiwicmVzdWx0Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwiY2xvbmUiLCJwcm9wZXJ0aWVzIiwiZ2V0VHlwZVByb3BlcnR5IiwiYXR0cmlidXRlcyIsIm9iaiIsInRtcE9iaiIsImZvckVhY2giLCJrZXkiLCJnZXRSZXNvdXJjZVVybCIsInJlc291cmNlIiwiaWQiLCJ0YWJsZSIsInJvd3MiLCJyZWxhdGlvbnMiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImxpbmtzIiwiY29sdW1ucyIsImdldENvbHVtbnNCeVNjaGVtYSIsInRpdGxlIiwiYXR0cmlidXRlTmFtZSIsIm5ld0RhdGEiLCJmb3JtIiwiZmllbGRzIiwiZmllbGRzVG9Gb3JtRm9ybWF0IiwiY2FsbGJhY2tGb3JtQ29uZmlnIiwidW5pb24iLCJnZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJ0aXRsZU1hcHMiLCJ0aXRsZU1hcCIsImluY2x1ZGVkIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsIm93biIsInJlbGF0aW9uc2hpcHMiLCJtYXBWYWx1ZXMiLCJuIiwiaXRlbSIsImluZGV4Iiwic291cmNlVGl0bGVNYXBzIiwiZGF0YVJlbGF0aW9ucyIsImRhdGFBdHRyaWJ1dGVzIiwiZG9jdW1lbnRTY2hlbWEiLCJyZXNvdXJjZUxpbmsiLCJwcm9wZXJ0eVZhbHVlIiwic2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiIsInNvdXJjZUVudW0iLCJpdGVtcyIsImVudW0iLCJlbnVtSXRlbSIsInJlbGF0aW9uTmFtZSIsIm1hcCIsInJlc291cmNlcyIsIm5hbWUiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJoYXlzdGFjayIsInNjaGVtYUZ1bGwiLCJoYXNPd25Qcm9wZXJ0eSIsIkFycmF5IiwiaXNBcnJheSIsIiRyZWYiLCJPYmplY3QiLCJieVN0cmluZyIsInN1YnN0cmluZyIsInJlbGF0aW9uIiwicmVsYXRpb25JdGVtIiwicm93Iiwicm93UmVzdWx0IiwiZmllbGQiLCJqb2luIiwiZm9yT3duIiwibGluayIsInJlcyIsInRtcFJvdyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwicmVsIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsIm9uQ2xpY2siLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJrIiwiZ3JpZEFjdGlvbkNyZWF0ZSIsIiRodHRwIiwic2NvcGUiLCJtZXRob2QiLCJocmVmIiwiJGJyb2FkY2FzdCIsInNjb3BlRm9ybSIsImdyaWRGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwiZ3JpZE1vZGVsIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImF0dHIiLCJjdHJsIiwiZ2V0VGVtcGxhdGVVcmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FDakJBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7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QUFBLEVBQUF0TixVQUFBLEVBQUE7QUFBQSxnQkFDQXNOLE1BQUEsQ0FBQWlCLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQWpCLE1BQUEsQ0FBQVksU0FBQSxDQUFBbkwsTUFBQSxDQUFBNUIsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFuQixVQUFBLENBQUFxQixRQUFBLENBQUFpTSxNQUFBLENBQUFZLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUyIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpOyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJyxcbiAgICAnPGdyaWQtdGFibGU+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8dGFibGUgY2xhc3M9XCJ0YWJsZSBncmlkXCI+JytcbiAgICAgICAgJzx0aGVhZD4nK1xuICAgICAgICAgICc8dHI+JytcbiAgICAgICAgICAgICc8dGggbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj57e2NvbHVtbi50aXRsZX19PC90aD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3RoZWFkPicrXG4gICAgICAgICc8dGJvZHk+JytcbiAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAgICAgICAgICc8dGQgbmctcmVwZWF0PVwiY29sdW1uIGluIGNvbHVtbnNcIj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1wiPicrXG4gICAgICAgICAgICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gcm93LmxpbmtzXCI+JyArXG4gICAgICAgICAgICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAnPC90ZD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3Rib2R5PicrXG4gICAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPidcbiAgKTtcblxuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCcsXG4gICAgJzxncmlkLWZvcm0+JyArXG4gICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImdvKGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxkaXY+JyArXG4gICAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzwvZGl2PicgK1xuICAgICAgJzxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cImdyaWRGb3JtXCIgbmctaW5pdD1cInNldEZvcm1TY29wZSh0aGlzKVwiJyArXG4gICAgICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICAgICAnY2xhc3M9XCJmb3JtLWhvcml6b250YWxcIiByb2xlPVwiZm9ybVwiIG5nLWlmPVwiaGlkZUZvcm0gIT09IHRydWVcIj4nK1xuICAgICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuICB2YXIgZGF0YSxcbiAgICAgIHNjaGVtYTtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldCgkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBnZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnM6IGdldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2V0IG1vZGVsIGJlZm9yZSBjYWxsIGZldGNoIGRhdGEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbiAoakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uIChqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYS5kYXRhLnZhbHVlKCksIHNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXMpKTtcblxuICAgICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdG1wT2JqO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSZXNvdXJjZVVybCh1cmwsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgICAgaWYgKHBhcmFtcy5yZXNvdXJjZSkge1xuICAgICAgICByZXN1bHQgPSB1cmwgKyAnLycgKyBwYXJhbXMucmVzb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSkge1xuICAgICAgICBpZiAocGFyYW1zLnR5cGUgPT09ICd1cGRhdGUnIHx8IHBhcmFtcy50eXBlID09PSAncmVhZCcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvc2NoZW1hIy9kZWZpbml0aW9ucy9jcmVhdGUnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX1RBQkxFO1xuICAgICAgICAgIGlmICghc2VsZi5jb25maWcudGFibGUpIHtcbiAgICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlID0ge307XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgc2VsZi5fZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzLCByZWxhdGlvbnMpIHtcblxuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLnJvd3MgPSByb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5jb2x1bW5zID0gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5jb25maWcudGFibGUpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgICAgIHVybDtcblxuICAgICAgdXJsID0gZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfRk9STTtcbiAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy5mb3JtKSB7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5tb2RlbCA9IGZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5mb3JtID0gXy51bmlvbihzZWxmLmNvbmZpZy5mb3JtLmZvcm0sIGdldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy5mb3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfSlcblxuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gbWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgICBpZiAodGl0bGVNYXBzW2tleV0pIHtcbiAgICAgICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgICB9KTtcblxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgICB9KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBmaWVsZHM7XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgICAgdmFyIHJlbGF0aW9ucyA9IGRhdGFSZWxhdGlvbnMudmFsdWUoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YUF0dHJpYnV0ZXMudmFsdWUoKTtcblxuICAgICAgdmFyIGRvY3VtZW50U2NoZW1hID0gZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlc291cmNlTGluayArICcvJyArIHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSArICcvJyArIGVudW1JdGVtO1xuXG4gICAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgICByZWxhdGlvbk5hbWU6IGtleSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IGF0dHJpYnV0ZU5hbWVcbiAgICAgICAgICB9KVxuICAgICAgICB9KTtcblxuICAgICAgfSk7XG4gICAgICByZXR1cm4gc291cmNlVGl0bGVNYXBzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gc2VsZi5nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSk7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VUaXRsZU1hcHMsIGZ1bmN0aW9uIChpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uICh1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24gKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlIGZ1bmN0aW9uIHJlcGxhY2luZyAkcmVmIGZyb20gc2NoZW1hXG4gICAgICogQHBhcmFtIGhheXN0YWNrXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrLCBzY2hlbWFGdWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gaGF5c3RhY2spIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIGhheXN0YWNrW2tleV0uJHJlZikge1xuICAgICAgICAgICAgaGF5c3RhY2tba2V5XSA9IE9iamVjdC5ieVN0cmluZyhzY2hlbWFGdWxsLCBoYXlzdGFja1trZXldLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhheXN0YWNrO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgc2NoZW1hIHdpdGggJHJlZiBsaW5rIHRvIHNjaGVtYSB3aXRob3V0ICRyZWZcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIHNjaGVtYUZ1bGwpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2NoZW1hO1xuXG4gICAgICBzY2hlbWFXaXRob3V0UmVmID0gX3JlcGxhY2VGcm9tRnVsbChzY2hlbWFXaXRob3V0UmVmLCBzY2hlbWFGdWxsKTtcblxuICAgICAgcmV0dXJuIHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFXaXRob3V0UmVmXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG5cbiAgICAgIF8uZm9yRWFjaChjb2x1bW5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvKnZhciByZWxhdGlvbnNoaXBzID0ge307XG4gICAgICBpZiAoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMucHJvcGVydGllcztcbiAgICAgIH1cbiAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pOyovXG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlc291cmNlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZmllbGRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgICAgdmFyIHJvd1Jlc3VsdCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgICAgICAgLyoqIG5hbWUgYWRkaXRpb25hbCBmaWVsZChyZWxhdGlvbiByb3cpICovXG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgICByb3dSZXN1bHQubGlua3MucHVzaChsaW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSb3dzQnlEYXRhKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcm93cyA9IFtdO1xuICAgICAgdmFyIGluY2x1ZGVkID0gW107XG4gICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXMpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGRhdGFPYmouaWR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2UgPSBsaW5rQXJyYXk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlID0gW3tcbiAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXSA9IHJlc3VsdFtrUm93XVtrUmVsXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpbmtzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ2J1dHRvbicsXG4gICAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICAgIG9uQ2xpY2s6ICdlZGl0KCRldmVudCwgZm9ybSknXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICB9XG59XG5cbk9iamVjdC5ieVN0cmluZyA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICB2YXIgayA9IGFbaV07XG4gICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICBvYmogPSBvYmpba107XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25DcmVhdGVTdWNjZXNzLCBhY3Rpb25DcmVhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVTdWNjZXNzKCkge1xuICAgICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NDcmVhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkRlbGV0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKGdyaWRFbnRpdHkudHlwZSA9PT0gZ3JpZEVudGl0eS5UWVBFX1RBQkxFKSB7XG4gICAgICAgIGdyaWRFbnRpdHkuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChncmlkRW50aXR5LnR5cGUgPT09IGdyaWRFbnRpdHkuVFlQRV9GT1JNKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWdvVG8nLCBncmlkQWN0aW9uR29Ubyk7XG5ncmlkQWN0aW9uR29Uby4kaW5qZWN0ID0gWyckbG9jYXRpb24nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25Hb1RvKCRsb2NhdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24obGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpe1xuICAgICAgcmV0dXJuIGxpbmsuc3ViamVjdERhdGEucHJvcGVydHlWYWx1ZShwMSk7XG4gICAgfSk7XG5cbiAgICAkbG9jYXRpb24udXJsKHJlc3VsdExpbmspO1xuICB9O1xufSIsIi8qIEdyaWQgbGlua3MgYWN0aW9ucyAqL1xuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1hY3Rpb25zJywgZ3JpZEFjdGlvbnMpO1xuZ3JpZEFjdGlvbnMuJGluamVjdCA9IFtdO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbnMoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgIGFjdGlvbnM6IHt9LFxuICAgICRnZXQ6IGdyaWRBY3Rpb25zR2V0XG4gIH07XG5cbiAgZ3JpZEFjdGlvbnNHZXQuJGluamVjdCA9IFsnZ3JpZC1hY3Rpb24tZ29UbycsICdncmlkLWFjdGlvbi1kZWxldGUnLCAnZ3JpZC1hY3Rpb24tdXBkYXRlJywgJ2dyaWQtYWN0aW9uLWNyZWF0ZSddO1xuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEFjdGlvbnNHZXQoQWN0aW9uR29UbywgQWN0aW9uRGVsZXRlLCBBY3Rpb25VcGRhdGUsIEFjdGlvbkNyZWF0ZSkge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHRoaXMuYWN0aW9ucyA9IHtcbiAgICAgIGdvVG9VcGRhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvQ3JlYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0xpc3Q6IEFjdGlvbkdvVG8sXG4gICAgICByZWFkOiBBY3Rpb25Hb1RvLFxuICAgICAgZGVsZXRlOiBBY3Rpb25EZWxldGUsXG4gICAgICB1cGRhdGU6IEFjdGlvblVwZGF0ZSxcbiAgICAgIGNyZWF0ZTogQWN0aW9uQ3JlYXRlXG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0aW9uOiBmdW5jdGlvbiAobGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShsaW5rLCBzY29wZSk7XG4gICAgICB9LmJpbmQodGhpcylcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi11cGRhdGUnLCBncmlkQWN0aW9uVXBkYXRlKTtcbmdyaWRBY3Rpb25VcGRhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25VcGRhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHksIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlPSBmdW5jdGlvbihzY29wZSl7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZURpcmVjdGl2ZSk7XG5cbmdyaWRUYWJsZURpcmVjdGl2ZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkLWFjdGlvbnMnXTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRFbnRpdHksIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgZ3JpZEVudGl0eS5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICRzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgLy8kc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5J107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHkpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuc2V0TW9kZWwoJHNjb3BlLmdyaWRNb2RlbCk7XG4gIH1cbn0iXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==