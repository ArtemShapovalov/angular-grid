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
        angular.module('grid').factory('gridFormSrv', gridForm);
        gridForm.$inject = [
            'grid-entity',
            '$timeout',
            '$interval',
            '_'
        ];
        function gridForm(gridEntity, $timeout, $interval, _) {
            angular.extend(this, gridEntity);
            this.model = {};
            this.form = [];
            this.schema = {};
            this.links = {};
            return this;
        }
        angular.module('grid').factory('gridTable', gridTable);
        gridTable.$inject = [
            'grid-entity',
            '$timeout',
            '$interval',
            '_'
        ];
        function gridTable(gridEntity) {
            angular.extend(this, gridEntity);
            this.rows = {};
            this.columns = {};
            this.schema = {};
            this.links = {};
            return this;
        }
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
                    //form: function() { return new Form() },
                    //table: function() { return new Table() },
                    default: { actionGetResource: 'read' },
                    TYPE_FORM: 'form',
                    TYPE_TABLE: 'table',
                    type: '',
                    config: {},
                    setModel: setModel,
                    getModel: getModel,
                    setMessage: setMessage,
                    getMessage: getMessage,
                    fetchData: fetchData,
                    fetchCollection: fetchCollection,
                    loadData: loadData,
                    loadSchema: loadSchema,
                    getTableInfo: getTableInfo,
                    getFormInfo: getFormInfo,
                    _getTitleMapsForRelations: _getTitleMapsForRelations,
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
                /**
     * Generate empty model for create form
     *
     * @param schema
     * @param fullSchema
     * @returns {*}
     * @private
     */
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
                /**
     * Create url by params for load resource
     *
     * @param url
     * @param params
     * @returns {*}
     */
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
                function _getTitleMapsForRelations(data) {
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
                            var url = getResourceUrl(resourceLink, {
                                type: self.default.actionGetResource,
                                id: enumItem
                            });
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
                    var sourceTitleMaps = self._getTitleMapsForRelations(data);
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
            'gridTable',
            'grid-actions'
        ];
        //TODO: should be set require ... depends on vmsGrid
        function gridTableDirective(gridEntity, gridTable, gridActions) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtdGFibGUuanMiLCJncmlkLmpzIiwiYWN0aW9ucy9jcmVhdGUuanMiLCJhY3Rpb25zL2RlbGV0ZS5qcyIsImFjdGlvbnMvZ29Uby5qcyIsImFjdGlvbnMvbWFpbi5qcyIsImFjdGlvbnMvdXBkYXRlLmpzIiwiZGlyZWN0aXZlcy9ncmlkLWZvcm0uanMiLCJkaXJlY3RpdmVzL2dyaWQtdGFibGUuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIiRpbnRlcnZhbCIsIl8iLCJleHRlbmQiLCJtb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsImdyaWRUYWJsZSIsInJvd3MiLCJjb2x1bW5zIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiLCJsb2Rhc2giLCJwcm92aWRlciIsImRhdGEiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJUWVBFX0ZPUk0iLCJUWVBFX1RBQkxFIiwidHlwZSIsImNvbmZpZyIsInNldE1vZGVsIiwiZ2V0TW9kZWwiLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImZldGNoRGF0YSIsImZldGNoQ29sbGVjdGlvbiIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsImdldFRhYmxlSW5mbyIsImdldEZvcm1JbmZvIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX3JlcGxhY2VGcm9tRnVsbCIsIl9nZXRSZWxhdGlvbkxpbmsiLCJfY3JlYXRlVGl0bGVNYXAiLCJfZ2V0Rm9ybUNvbmZpZyIsIl9nZXRGaWVsZHNGb3JtIiwiX2dldFJvd3NCeURhdGEiLCJfZ2V0RW1wdHlEYXRhIiwiX2JhdGNoTG9hZERhdGEiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInVybCIsImNhbGxiYWNrIiwic2VsZiIsInBhcmFtcyIsImZldGNoRGF0YVN1Y2Nlc3MiLCJ1bmRlZmluZWQiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwicHJvcGVydHkiLCJzY2hlbWFzIiwiZG9jdW1lbnQiLCJyYXciLCJ2YWx1ZSIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJhZGRTY2hlbWEiLCJmdWxsU2NoZW1hIiwicmVzdWx0Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwiY2xvbmUiLCJwcm9wZXJ0aWVzIiwiZ2V0VHlwZVByb3BlcnR5IiwiYXR0cmlidXRlcyIsIm9iaiIsInRtcE9iaiIsImZvckVhY2giLCJrZXkiLCJnZXRSZXNvdXJjZVVybCIsInJlc291cmNlIiwiaWQiLCJ0YWJsZSIsInJlbGF0aW9ucyIsInJvd3NUb1RhYmxlRm9ybWF0IiwiZ2V0Q29sdW1uc0J5U2NoZW1hIiwidGl0bGUiLCJhdHRyaWJ1dGVOYW1lIiwibmV3RGF0YSIsImZpZWxkcyIsImZpZWxkc1RvRm9ybUZvcm1hdCIsImNhbGxiYWNrRm9ybUNvbmZpZyIsInVuaW9uIiwiZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwidGl0bGVNYXBzIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJvd24iLCJyZWxhdGlvbnNoaXBzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwicHJvcGVydHlWYWx1ZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJzb3VyY2VFbnVtIiwiaXRlbXMiLCJlbnVtIiwiZW51bUl0ZW0iLCJyZWxhdGlvbk5hbWUiLCJtYXAiLCJyZXNvdXJjZXMiLCJuYW1lIiwibGlua1Jlc291cmNlcyIsImxvYWRlZCIsInRvdGFsIiwidW5pcSIsImludGVydmFsIiwiY2FuY2VsIiwiaGF5c3RhY2siLCJzY2hlbWFGdWxsIiwiaGFzT3duUHJvcGVydHkiLCJBcnJheSIsImlzQXJyYXkiLCIkcmVmIiwiT2JqZWN0IiwiYnlTdHJpbmciLCJzdWJzdHJpbmciLCJyZWxhdGlvbiIsInJlbGF0aW9uSXRlbSIsInJvdyIsInJvd1Jlc3VsdCIsImZpZWxkIiwiam9pbiIsImZvck93biIsImxpbmsiLCJyZXMiLCJ0bXBSb3ciLCJyZWxJdGVtIiwicmVsS2V5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsInJlbCIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJvbkNsaWNrIiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibGVuZ3RoIiwiayIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwiZGlyZWN0aXZlIiwiZ3JpZEZvcm1EaXJlY3RpdmUiLCJyZXN0cmljdCIsImNvbnRyb2xsZXIiLCJncmlkRm9ybURpcmVjdGl2ZUN0cmwiLCIkc2NvcGUiLCJzZXRGb3JtU2NvcGUiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiYXR0ciIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztRQU1BLElBQUFBLElBQUEsR0FBQSxFQUFBLEM7UUFDQSxJQUFBO0FBQUEsWUFDQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsWUFBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBO0FBQUEsWUFDQUgsT0FBQSxDQUFBQyxNQUFBLENBQUEsY0FBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsY0FBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBQyxPQUFBLEdBQUFKLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUYsSUFBQSxDQUFBLEM7UUNqQkFDLE9BQUEs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QU9BbkYsSUFBQSxFQUFBLFVBQUF1QixLQUFBLEVBQUE2RCxFQUFBLEVBQUFDLElBQUEsRUFBQUMsSUFBQSxFQUFBO0FBQUEsaUJBUEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQWFBSCxvQkFBQSxDQUFBek8sT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLGFBQUE7QUFBQSxhQUFBLENBYkE7QUFBQSxZQWVBLE9BQUF1TixTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBa0Isb0JBQUEsQ0FBQWIsTUFBQSxFQUFBM04sVUFBQSxFQUFBO0FBQUEsZ0JBQ0EyTixNQUFBLENBQUFpQixjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUFqQixNQUFBLENBQUFZLFNBQUEsQ0FBQTlLLE1BQUEsQ0FBQTVCLElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQVFBN0IsVUFBQSxDQUFBK0IsUUFBQSxDQUFBNEwsTUFBQSxDQUFBWSxTQUFBLEVBUkE7QUFBQSxhQWpCQTtBQUFBLFMiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRGb3JtU3J2JywgZ3JpZEZvcm0pO1xuZ3JpZEZvcm0uJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgYW5ndWxhci5leHRlbmQodGhpcywgZ3JpZEVudGl0eSk7XG5cbiAgdGhpcy5tb2RlbCA9IHt9O1xuICB0aGlzLmZvcm0gPSBbXTtcbiAgdGhpcy5zY2hlbWEgPSB7fTtcbiAgdGhpcy5saW5rcyA9IHt9O1xuXG4gIHJldHVybiB0aGlzO1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFRhYmxlKGdyaWRFbnRpdHkpIHtcbiAgYW5ndWxhci5leHRlbmQodGhpcywgZ3JpZEVudGl0eSk7XG5cbiAgdGhpcy5yb3dzID0ge307XG4gIHRoaXMuY29sdW1ucyA9IHt9O1xuICB0aGlzLnNjaGVtYSA9IHt9O1xuICB0aGlzLmxpbmtzID0ge307XG5cbiAgcmV0dXJuIHRoaXM7XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnLFxuICAgICc8Z3JpZC10YWJsZT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlIGdyaWRcIj4nK1xuICAgICAgICAnPHRoZWFkPicrXG4gICAgICAgICAgJzx0cj4nK1xuICAgICAgICAgICAgJzx0aCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPnt7Y29sdW1uLnRpdGxlfX08L3RoPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGhlYWQ+JytcbiAgICAgICAgJzx0Ym9keT4nK1xuICAgICAgICAgICc8dHIgbmctcmVwZWF0PVwicm93IGluIHJvd3NcIj4nK1xuICAgICAgICAgICAgJzx0ZCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1wiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPicrXG4gICAgICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXCI+JytcbiAgICAgICAgICAgICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiByb3cubGlua3NcIj4nICtcbiAgICAgICAgICAgICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICAgICAgICAgICAnPC9zcGFuPicrXG4gICAgICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAgICc8L3RkPicrXG4gICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgJzwvdGJvZHk+JytcbiAgICAgICc8L3RhYmxlPicgK1xuICAgICc8L2dyaWQtdGFibGU+J1xuICApO1xuXG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJyxcbiAgICAnPGdyaWQtZm9ybT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZ28obGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAnPC9zcGFuPicrXG4gICAgICAnPGRpdj4nICtcbiAgICAgICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgICAnPC9kaXY+JyArXG4gICAgICAnPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVwiZ3JpZEZvcm1cIiBuZy1pbml0PVwic2V0Rm9ybVNjb3BlKHRoaXMpXCInICtcbiAgICAgICAgJ3NmLXNjaGVtYT1cInNjaGVtYVwiIHNmLWZvcm09XCJmb3JtXCIgc2YtbW9kZWw9XCJtb2RlbFwiJyArXG4gICAgICAgICdjbGFzcz1cImZvcm0taG9yaXpvbnRhbFwiIHJvbGU9XCJmb3JtXCIgbmctaWY9XCJoaWRlRm9ybSAhPT0gdHJ1ZVwiPicrXG4gICAgICAnPC9mb3JtPicrXG4gICAgJzwvZ3JpZC1mb3JtPidcbiAgKTtcbn1dKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbG9kYXNoO1xufSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG4gIHZhciBkYXRhLFxuICAgICAgc2NoZW1hO1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzID0ge1xuICAgICAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC8vZm9ybTogZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRm9ybSgpIH0sXG4gICAgICAvL3RhYmxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBUYWJsZSgpIH0sXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICAgIF9nZXRGaWVsZHNGb3JtOiBfZ2V0RmllbGRzRm9ybSxcbiAgICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YSxcbiAgICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2V0IG1vZGVsIGJlZm9yZSBjYWxsIGZldGNoIGRhdGEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbiAoakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uIChqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYS5kYXRhLnZhbHVlKCksIHNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICAgIHJlc3VsdCA9IF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzKTtcbiAgICAgIHJlc3VsdC5kYXRhID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcykpO1xuICAgICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSk7XG5cbiAgICAgIGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0eShvYmopIHtcbiAgICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIGlmICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBzd2l0Y2godmFsdWUudHlwZSkge1xuICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgICB1cmw7XG5cbiAgICAgIHVybCA9IGdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IG1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9UQUJMRTtcbiAgICAgICAgICBpZiAoIXNlbGYuY29uZmlnLnRhYmxlKSB7XG4gICAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZSA9IHt9O1xuICAgICAgICAgIH1cblxuXG4gICAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5yb3dzID0gcm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucyA9IGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcbiAgICAgICAgICBzZWxmLmNvbmZpZy50YWJsZS5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgICAgdGl0bGU6ICdBY3Rpb25zJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY29uZmlnLnRhYmxlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgICB1cmw7XG5cbiAgICAgIHVybCA9IGdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9KTtcblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX0ZPUk07XG4gICAgICAgIGlmICghc2VsZi5jb25maWcuZm9ybSkge1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0gPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzLCByZWxhdGlvbnMpIHtcblxuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0ubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgICAgc2VsZi5jb25maWcuZm9ybS5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0ubW9kZWwgPSBmaWVsZHNUb0Zvcm1Gb3JtYXQoZmllbGRzKTtcblxuICAgICAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uZm9ybSA9IGNvbmZpZztcblxuICAgICAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uZm9ybSA9IF8udW5pb24oc2VsZi5jb25maWcuZm9ybS5mb3JtLCBnZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5jb25maWcuZm9ybSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pXG5cbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgICB2YXIgYXR0cmlidXRlcyA9IG1lcmdlUmVsU2NoZW1hKFxuICAgICAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICAgKS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdC5wdXNoKG9iailcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgZmllbGRzO1xuICAgICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhLnByb3BlcnR5KCdkYXRhJykpKTtcblxuICAgICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIG93bjogZmllbGRzLFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9O1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gW107XG5cbiAgICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgdmFyIGRhdGFBdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuXG4gICAgICB2YXIgcmVsYXRpb25zID0gZGF0YVJlbGF0aW9ucy52YWx1ZSgpO1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgICB2YXIgZG9jdW1lbnRTY2hlbWEgPSBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihpdGVtLCBrZXkpIHtcblxuICAgICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgICAvKiogZ2V0IG5hbWUgZnJvbSBzY2hlbWEgKi9cbiAgICAgICAgdmFyIGF0dHJpYnV0ZU5hbWUgPSBkYXRhUmVsYXRpb25zLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgICB2YXIgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiA9IHNlbGYuX3JlcGxhY2VGcm9tRnVsbChkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBkb2N1bWVudFNjaGVtYSlbJ3Byb3BlcnRpZXMnXVtrZXldO1xuXG4gICAgICAgIHZhciBzb3VyY2VFbnVtID0ge307XG5cbiAgICAgICAgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMgJiYgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtKSB7XG4gICAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bVxuICAgICAgICB9IGVsc2UgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW1cbiAgICAgICAgfVxuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbiAoZW51bUl0ZW0pIHtcbiAgICAgICAgICB2YXIgdXJsID0gZ2V0UmVzb3VyY2VVcmwocmVzb3VyY2VMaW5rLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgICAgcmVsYXRpb25OYW1lOiBrZXksXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBhdHRyaWJ1dGVOYW1lXG4gICAgICAgICAgfSlcbiAgICAgICAgfSk7XG5cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNvdXJjZVRpdGxlTWFwcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKTtcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAgIC8vdmFsdWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpLFxuICAgICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gT2JqZWN0LmJ5U3RyaW5nKHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cblxuICAgICAgXy5mb3JFYWNoKGNvbHVtbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICAgfVxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7Ki9cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaWVsZHNUb0Zvcm1Gb3JtYXQocmVzb3VyY2UpIHtcbiAgICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgICAgZmllbGRzW2tleV0gPSBmaWVsZHNba2V5XVswXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBmaWVsZHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgdmFyIGRhdGEgPSByb3cub3duO1xuICAgICAgICB2YXIgcm93UmVzdWx0ID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgICAgcm93UmVzdWx0W2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgICB2YXIgZmllbGQgPSByb3cub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG4gICAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGZpZWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgICAgfSkuam9pbignLCAnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICAgIF8uZm9yT3duKGRhdGEubGlua3MoKSwgZnVuY3Rpb24obGluaykge1xuICAgICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LnB1c2gocm93UmVzdWx0KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByb3dzID0gW107XG4gICAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcblxuICAgICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbnM7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgIGlmIChyZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykudmFsdWUoKSkge1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihyZWxJdGVtLCByZWxLZXkpIHtcbiAgICAgICAgICByZXN1bHRbcmVsS2V5XSA9IHNlbGYuX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmsgZnJvbSByZWxhdGlvbiBmb3IgbG9hZCByZXNvdXJjZSBkYXRhXG4gICAgICpcbiAgICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICAgKiBAcGFyYW0gcmVsSXRlbVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXNvdXJjZSA9IFtdO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgIHZhciBsaW5rQXJyYXkgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbEl0ZW0uZGF0YSwgZnVuY3Rpb24oZGF0YU9iaikge1xuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShyb3dzUmVsYXRpb25zaGlwcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3csIGtSb3cpIHtcbiAgICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwsIGtSZWwpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtSZWxJdGVtKSB7XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XSA9IHJlc3VsdFtrUm93XSB8fCB7fTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF1ba1JlbEl0ZW1dID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBjb25maWcgZm9yIHJlbmRlcmluZyBidXR0b25zIGZyb20gc2NoZW1hIGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlua3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfVEFCTEUpIHtcbiAgICAgICAgZ3JpZEVudGl0eS5nZXRUYWJsZUluZm8oZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGdyaWRFbnRpdHkudHlwZSA9PT0gZ3JpZEVudGl0eS5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24obGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5JywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRFbnRpdHksIGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAvLyRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd2bXNHcmlkJywgdm1zR3JpZERpcmVjdGl2ZSk7XG5cbmZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZTogJzxuZy1pbmNsdWRlIHNyYz1cImdldFRlbXBsYXRlVXJsKClcIiAvPicsXG4gICAgc2NvcGU6IHtcbiAgICAgIGdyaWRNb2RlbDogJz1ncmlkTW9kZWwnXG4gICAgfSxcbiAgICBjb250cm9sbGVyOiB2bXNHcmlkRGlyZWN0aXZlQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHIsIGN0cmwpIHtcblxuICAgIH1cbiAgfTtcblxuICB2bXNHcmlkRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSkge1xuICAgICRzY29wZS5nZXRUZW1wbGF0ZVVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCRzY29wZS5ncmlkTW9kZWwucGFyYW1zLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJztcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5zZXRNb2RlbCgkc2NvcGUuZ3JpZE1vZGVsKTtcbiAgfVxufSJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9