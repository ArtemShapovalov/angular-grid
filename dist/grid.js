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
        angular.module('grid').factory('_', function () {
            return lodash;
        });
        angular.module('grid').factory('gridForm', gridForm);
        gridForm.$inject = [
            'grid-entity',
            '$timeout',
            '$interval',
            '_'
        ];
        function gridForm(gridEntity, $timeout, $interval, _) {
            function Form() {
                this.form = [];
                this.model = {};
                this.schema = {};
                this.links = {};
            }
            angular.extend(Form.prototype, {
                getFormInfo: getFormInfo,
                getConfig: getConfig,
                _getTitleMapsForRelations: _getTitleMapsForRelations,
                _createTitleMap: _createTitleMap,
                _getFormConfig: _getFormConfig,
                _getFieldsForm: _getFieldsForm,
                _fieldsToFormFormat: _fieldsToFormFormat,
                _getEmptyData: _getEmptyData,
                _getFormButtonBySchema: _getFormButtonBySchema
            }, gridEntity);
            return Form;
            function getConfig() {
                var self = this;
                return {
                    form: self.form,
                    model: self.model,
                    schema: self.schema,
                    links: self.links
                };
            }
            /**
   *
   * @param callback
   */
            function getFormInfo(callback) {
                /*jshint validthis: true */
                var self = this, model = self.getModel(), url;
                url = self.getResourceUrl(model.url, model.params);
                $timeout(function () {
                    self.fetchData(url, fetchDataSuccess);
                });
                function fetchDataSuccess(data, schema) {
                    var newData = data.property('data').property('attributes');
                    var schemaWithoutRef = self.mergeRelSchema(newData.schemas()[0].data.value(), schema);
                    self.type = self.TYPE_FORM;
                    self._getFieldsForm(data, function (fields, relations) {
                        self.links = data.links();
                        self.schema = schemaWithoutRef;
                        self.model = self._fieldsToFormFormat(fields);
                        self._getFormConfig(data, callbackFormConfig);
                        function callbackFormConfig(config) {
                            self.form = config;
                            /** add button to config form */
                            self.form = _.union(self.form, self._getFormButtonBySchema(data.property('data').links()));
                            if (callback !== undefined) {
                                callback(self.getConfig());
                            }
                        }
                    });
                }
            }
            /**
   * Convert Jsonary Data to result model for rendering form
   *
   * @param resource
   * @returns {*}
   */
            function _fieldsToFormFormat(resource) {
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
   * Generate form config for Angular schema form
   * @param data
   * @param callback
   * @private
   */
            function _getFormConfig(data, callback) {
                var self = this;
                var result = [];
                self._createTitleMap(data.property('data'), function (titleMaps) {
                    var attributes = self.mergeRelSchema(data.property('data').schemas()[0].data.value(), data.schemas()[0].data.document.raw.value()).properties.attributes.properties;
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
                        var url = self.getResourceUrl(resourceLink, {
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
   * Generate empty model for create form
   *
   * @param schema
   * @param fullSchema
   * @returns {*}
   * @private
   */
            function _getEmptyData(schema, fullSchema) {
                var self = this;
                var result;
                var schemaWithoutRef = self.mergeRelSchema(schema, fullSchema);
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
   * Generate config for rendering buttons from schema links
   *
   * @param links
   * @returns {Array}
   */
            function _getFormButtonBySchema(links) {
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
        angular.module('grid').factory('gridTable', gridTable);
        gridTable.$inject = [
            'grid-entity',
            '$timeout',
            '$interval',
            '_'
        ];
        function gridTable(gridEntity, $timeout, $interval, _) {
            function Table() {
                this.rows = [];
                this.columns = {};
                this.schema = {};
                this.links = {};
            }
            angular.extend(Table.prototype, {
                getConfig: getConfig,
                getTableInfo: getTableInfo,
                getColumnsBySchema: getColumnsBySchema,
                rowsToTableFormat: rowsToTableFormat,
                _getRowsByData: _getRowsByData
            }, gridEntity);
            return Table;
            function getConfig() {
                var self = this;
                return {
                    rows: self.rows,
                    columns: self.columns,
                    schema: self.schema,
                    links: self.links
                };
            }
            function getTableInfo(callback) {
                /*jshint validthis: true */
                var self = this, model = self.getModel(), url;
                url = self.getResourceUrl(model.url, model.params);
                $timeout(function () {
                    self.fetchData(url, fetchDataSuccess);
                });
                function fetchDataSuccess(data, schema) {
                    var schemaWithoutRef = self.mergeRelSchema(data.schemas()[0].data.value(), schema);
                    self.type = self.TYPE_TABLE;
                    self._getRowsByData(data, function (rows) {
                        self.rows = self.rowsToTableFormat(rows);
                        self.links = data.links();
                        self.columns = self.getColumnsBySchema(schemaWithoutRef);
                        self.columns.push({
                            title: 'Actions',
                            type: 'string',
                            attributeName: 'links'
                        });
                        if (callback !== undefined) {
                            callback(self.getConfig());
                        }
                    });
                }
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
        }
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
                    setMessage: setMessage,
                    getMessage: getMessage,
                    fetchData: fetchData,
                    fetchCollection: fetchCollection,
                    loadData: loadData,
                    loadSchema: loadSchema,
                    getResourceUrl: getResourceUrl,
                    mergeRelSchema: mergeRelSchema,
                    _getRelationResource: _getRelationResource,
                    _replaceFromFull: _replaceFromFull,
                    _getRelationLink: _getRelationLink,
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
                                url: self.getResourceUrl(relItem.links.self, {
                                    type: self.default.actionGetResource,
                                    id: dataObj.id
                                })
                            });
                        });
                        resource = linkArray;
                    } else {
                        resource = [{
                                url: self.getResourceUrl(relItem.links.self, {
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
            return function (obj, link, scope) {
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
                    obj.getFormInfo(function (form) {
                        scope.schema = form.schema;
                        scope.form = form.form;
                        scope.model = form.model;
                        scope.alerts.push({
                            type: 'success',
                            msg: obj.getMessage('successCreated')
                        });
                    });
                }
                function actionCreateError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || obj.getMessage('serverError')
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
            return function (obj, link, scope) {
                var params = {
                    method: link.method,
                    url: link.href
                };
                $http(params).then(actionDeleteSuccess, actionDeleteError);
                function actionDeleteSuccess() {
                    if (obj.type === obj.TYPE_TABLE) {
                        obj.getTableInfo(function (table) {
                            scope.rows = table.rows;
                            scope.columns = table.columns;
                            scope.links = table.links;
                        });
                    } else if (obj.type === obj.TYPE_FORM) {
                        scope.hideForm = true;
                    }
                    scope.alerts.push({
                        type: 'success',
                        msg: obj.getMessage('successDeleted')
                    });
                }
                function actionDeleteError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || obj.getMessage('serverError')
                    });
                }
            };
        }
        angular.module('grid').factory('grid-action-goTo', gridActionGoTo);
        gridActionGoTo.$inject = ['$location'];
        function gridActionGoTo($location) {
            return function (obj, link) {
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
                    action: function (obj, link, scope) {
                        this.actions[link.definition.data.propertyValue('rel')](obj, link, scope);
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
            return function (obj, link, scope) {
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
                    obj.getFormInfo(function (form) {
                        scope.schema = form.schema;
                        scope.form = form.form;
                        scope.model = form.model;
                        scope.alerts.push({
                            type: 'success',
                            msg: obj.getMessage('successUpdated')
                        });
                    });
                }
                function actionUpdateError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || obj.getMessage('serverError')
                    });
                }
            };
        }
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/form.html', '<grid-form>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a> ' + '</span>' + '<div>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '</div>' + '<form novalidate name="gridForm" ng-init="setFormScope(this)"' + 'sf-schema="schema" sf-form="form" sf-model="model"' + 'class="form-horizontal" role="form" ng-if="hideForm !== true">' + '</form>' + '</grid-form>');
            }
        ]);
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
                'gridForm',
                'grid-actions'
            ];
            return directive;
            function gridFormDirectiveCtrl($scope, gridEntity, gridForm, gridActions) {
                $scope.alerts = [];
                $scope.scopeForm = { gridForm: {} };
                $scope.setFormScope = function (scope) {
                    $scope.scopeForm = scope;
                };
                var formInst = new gridForm();
                formInst.getFormInfo(function (form) {
                    $scope.schema = form.schema;
                    $scope.form = form.form;
                    $scope.model = form.model;
                    $scope.links = form.links;
                    $scope.$digest();
                });
                $scope.edit = function ($event, form) {
                    gridActions.action(formInst, form.link, $scope);
                };
                $scope.go = function (link) {
                    gridActions.action(formInst, link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
            }
        }
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/table.html', '<grid-table>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '<table class="table grid">' + '<thead>' + '<tr>' + '<th ng-repeat="column in columns">{{column.title}}</th>' + '</tr>' + '</thead>' + '<tbody>' + '<tr ng-repeat="row in rows">' + '<td ng-repeat="column in columns">' + '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>' + '<span ng-if="column.attributeName == \'links\'">' + '<span ng-repeat="link in row.links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '</span>' + '</td>' + '</tr>' + '</tbody>' + '</table>' + '</grid-table>');
            }
        ]);
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
                var tableInst = new gridTable();
                tableInst.getTableInfo(function (table) {
                    $scope.rows = table.rows;
                    $scope.columns = table.columns;
                    $scope.links = table.links;    //$scope.$digest();
                });
                $scope.edit = function (link) {
                    gridActions.action(tableInst, link, $scope);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtdGFibGUuanMiLCJncmlkLmpzIiwiYWN0aW9ucy9jcmVhdGUuanMiLCJhY3Rpb25zL2RlbGV0ZS5qcyIsImFjdGlvbnMvZ29Uby5qcyIsImFjdGlvbnMvbWFpbi5qcyIsImFjdGlvbnMvdXBkYXRlLmpzIiwiZGlyZWN0aXZlcy9ncmlkLWZvcm0uanMiLCJkaXJlY3RpdmVzL2dyaWQtdGFibGUuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIiRpbnRlcnZhbCIsIl8iLCJGb3JtIiwiZm9ybSIsIm1vZGVsIiwic2NoZW1hIiwibGlua3MiLCJleHRlbmQiLCJwcm90b3R5cGUiLCJnZXRGb3JtSW5mbyIsImdldENvbmZpZyIsIl9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMiLCJfY3JlYXRlVGl0bGVNYXAiLCJfZ2V0Rm9ybUNvbmZpZyIsIl9nZXRGaWVsZHNGb3JtIiwiX2ZpZWxkc1RvRm9ybUZvcm1hdCIsIl9nZXRFbXB0eURhdGEiLCJfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwic2VsZiIsImNhbGxiYWNrIiwiZ2V0TW9kZWwiLCJ1cmwiLCJnZXRSZXNvdXJjZVVybCIsInBhcmFtcyIsImZldGNoRGF0YSIsImZldGNoRGF0YVN1Y2Nlc3MiLCJkYXRhIiwibmV3RGF0YSIsInByb3BlcnR5Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwic2NoZW1hcyIsInZhbHVlIiwidHlwZSIsIlRZUEVfRk9STSIsImZpZWxkcyIsInJlbGF0aW9ucyIsImNhbGxiYWNrRm9ybUNvbmZpZyIsImNvbmZpZyIsInVuaW9uIiwidW5kZWZpbmVkIiwicmVzb3VyY2UiLCJvd24iLCJmb3JFYWNoIiwicmVsYXRpb25zaGlwcyIsInJlbGF0aW9uIiwia2V5IiwibWFwIiwicmVsYXRpb25JdGVtIiwicHJvcGVydHlWYWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdCIsInRpdGxlTWFwcyIsImF0dHJpYnV0ZXMiLCJkb2N1bWVudCIsInJhdyIsInByb3BlcnRpZXMiLCJvYmoiLCJ0aXRsZU1hcCIsImluY2x1ZGVkIiwiX2dldFJlbGF0aW9uUmVzb3VyY2UiLCJfYmF0Y2hMb2FkRGF0YSIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJtYXBWYWx1ZXMiLCJuIiwiaXRlbSIsImluZGV4Iiwic291cmNlVGl0bGVNYXBzIiwiZGF0YVJlbGF0aW9ucyIsImRhdGFBdHRyaWJ1dGVzIiwiZG9jdW1lbnRTY2hlbWEiLCJyZXNvdXJjZUxpbmsiLCJhdHRyaWJ1dGVOYW1lIiwic2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJzb3VyY2VFbnVtIiwiaXRlbXMiLCJlbnVtIiwiZW51bUl0ZW0iLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJpZCIsInJlbGF0aW9uTmFtZSIsImZldGNoQ29sbGVjdGlvbiIsInJlc291cmNlcyIsIm5hbWUiLCJmdWxsU2NoZW1hIiwiY2xvbmUiLCJnZXRUeXBlUHJvcGVydHkiLCJ0bXBPYmoiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0IiwiX2dldFJvd3NCeURhdGEiLCJUWVBFX1RBQkxFIiwicm93Iiwicm93UmVzdWx0IiwiZmllbGQiLCJqb2luIiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJzZXRNb2RlbCIsInNldE1lc3NhZ2UiLCJnZXRNZXNzYWdlIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwiYWxlcnQiLCJKc29uYXJ5IiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJhZGRTY2hlbWEiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJzY2hlbWFGdWxsIiwiaGF5c3RhY2siLCJoYXNPd25Qcm9wZXJ0eSIsIiRyZWYiLCJPYmplY3QiLCJieVN0cmluZyIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwicmVsIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwidGFibGUiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0Iiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwiZ3JpZE1vZGVsIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImF0dHIiLCJjdHJsIiwiZ2V0VGVtcGxhdGVVcmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FB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SUFBQSxFQUFBLFVBQUE0RSxLQUFBLEVBQUFtRSxFQUFBLEVBQUFDLElBQUEsRUFBQUMsSUFBQSxFQUFBO0FBQUEsaUJBUEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQWFBSCxvQkFBQSxDQUFBOU8sT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLGFBQUE7QUFBQSxhQUFBLENBYkE7QUFBQSxZQWVBLE9BQUEwTixTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBb0Isb0JBQUEsQ0FBQWYsTUFBQSxFQUFBOU4sVUFBQSxFQUFBO0FBQUEsZ0JBQ0E4TixNQUFBLENBQUFtQixjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUFuQixNQUFBLENBQUFjLFNBQUEsQ0FBQW5OLE1BQUEsQ0FBQVUsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFuQyxVQUFBLENBQUF5SCxRQUFBLENBQUFxRyxNQUFBLENBQUFjLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUyIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZEZvcm0oZ3JpZEVudGl0eSwgJHRpbWVvdXQsICRpbnRlcnZhbCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0oKSB7XG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoRm9ybS5wcm90b3R5cGUsIHtcbiAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9uczogX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgIF9maWVsZHNUb0Zvcm1Gb3JtYXQ6IF9maWVsZHNUb0Zvcm1Gb3JtYXQsXG4gICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hOiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hXG4gIH0sIGdyaWRFbnRpdHkpO1xuXG4gIHJldHVybiBGb3JtO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZvcm06IHNlbGYuZm9ybSxcbiAgICAgIG1vZGVsOiBzZWxmLm1vZGVsLFxuICAgICAgc2NoZW1hOiBzZWxmLnNjaGVtYSxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgIHVybDtcblxuICAgIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfRk9STTtcblxuICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMsIHJlbGF0aW9ucykge1xuXG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgICBzZWxmLmZvcm0gPSBfLnVuaW9uKHNlbGYuZm9ybSwgc2VsZi5fZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pXG5cbiAgICB9XG5cbiAgfVxuXG5cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pO1xuICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICBpZiAodGl0bGVNYXBzW2tleV0pIHtcbiAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKG9iailcbiAgICAgIH0pO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmllbGRzO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhLnByb3BlcnR5KCdkYXRhJykpKTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIG93bjogZmllbGRzLFxuICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgdmFyIGRvY3VtZW50U2NoZW1hID0gZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFSZWxhdGlvbnMucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG4gICAgICB2YXIgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiA9IHNlbGYuX3JlcGxhY2VGcm9tRnVsbChkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBkb2N1bWVudFNjaGVtYSlbJ3Byb3BlcnRpZXMnXVtrZXldO1xuXG4gICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcyAmJiBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bVxuICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bVxuICAgICAgfVxuXG4gICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHJlc291cmNlTGluaywge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGVudW1JdGVtfSk7XG5cbiAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICByZWxhdGlvbk5hbWU6IGtleSxcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBhdHRyaWJ1dGVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHJldHVybiBzb3VyY2VUaXRsZU1hcHM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRpdGxlTWFwIGZvciBmb3JtIGFuZCBsb2FkIGRlcGVuZGVuY3kgcmVzb3VyY2VcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbiAoaXRlbSkge1xuXG4gICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVxuICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSk7XG5cbiAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJyRpbnRlcnZhbCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgJHRpbWVvdXQsICRpbnRlcnZhbCwgXykge1xuXG4gIGZ1bmN0aW9uIFRhYmxlKCkge1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YVxuICB9LCBncmlkRW50aXR5KTtcblxuICByZXR1cm4gVGFibGU7XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcm93czogc2VsZi5yb3dzLFxuICAgICAgY29sdW1uczogc2VsZi5jb2x1bW5zLFxuICAgICAgc2NoZW1hOiBzZWxmLnNjaGVtYSxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9UQUJMRTtcblxuICAgICAgc2VsZi5fZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzKSB7XG5cbiAgICAgICAgc2VsZi5yb3dzID0gc2VsZi5yb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5jb2x1bW5zID0gc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG5cbiAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgIH1cbiAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICB9KTsqL1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgIHZhciByb3dSZXN1bHQgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG4gIHZhciBkYXRhLFxuICAgICAgc2NoZW1hO1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzID0ge1xuICAgICAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIFRZUEVfRk9STTogJ2Zvcm0nLFxuICAgICAgVFlQRV9UQUJMRTogJ3RhYmxlJyxcbiAgICAgIHR5cGU6ICcnLFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBpZiAobW9kZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGVydCgnUGxlYXNlIHNldCBtb2RlbCBiZWZvcmUgY2FsbCBmZXRjaCBkYXRhJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24gKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbiAoalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbnM7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgIGlmIChyZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykudmFsdWUoKSkge1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihyZWxJdGVtLCByZWxLZXkpIHtcbiAgICAgICAgICByZXN1bHRbcmVsS2V5XSA9IHNlbGYuX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmsgZnJvbSByZWxhdGlvbiBmb3IgbG9hZCByZXNvdXJjZSBkYXRhXG4gICAgICpcbiAgICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICAgKiBAcGFyYW0gcmVsSXRlbVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXNvdXJjZSA9IFtdO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgIHZhciBsaW5rQXJyYXkgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbEl0ZW0uZGF0YSwgZnVuY3Rpb24oZGF0YU9iaikge1xuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBkYXRhT2JqLmlkfSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc291cmNlID0gbGlua0FycmF5O1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvdXJjZSA9IFt7XG4gICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXSA9IHJlc3VsdFtrUm93XVtrUmVsXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSBvYmouVFlQRV9UQUJMRSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmoudHlwZSA9PT0gb2JqLlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnLFxuICAgICc8Z3JpZC1mb3JtPicgK1xuICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJnbyhsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAnPC9zcGFuPicrXG4gICAgJzxkaXY+JyArXG4gICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgJzwvZGl2PicgK1xuICAgICc8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XCJncmlkRm9ybVwiIG5nLWluaXQ9XCJzZXRGb3JtU2NvcGUodGhpcylcIicgK1xuICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICdjbGFzcz1cImZvcm0taG9yaXpvbnRhbFwiIHJvbGU9XCJmb3JtXCIgbmctaWY9XCJoaWRlRm9ybSAhPT0gdHJ1ZVwiPicrXG4gICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZEZvcm0nLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkRm9ybSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG5cbiAgICB2YXIgZm9ybUluc3QgPSBuZXcgZ3JpZEZvcm0oKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnLFxuICAgICc8Z3JpZC10YWJsZT4nICtcbiAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiBsaW5rc1wiPicgK1xuICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAnPC9zcGFuPicrXG4gICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlIGdyaWRcIj4nK1xuICAgICc8dGhlYWQ+JytcbiAgICAnPHRyPicrXG4gICAgJzx0aCBuZy1yZXBlYXQ9XCJjb2x1bW4gaW4gY29sdW1uc1wiPnt7Y29sdW1uLnRpdGxlfX08L3RoPicrXG4gICAgJzwvdHI+JytcbiAgICAnPC90aGVhZD4nK1xuICAgICc8dGJvZHk+JytcbiAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAnPHRkIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+JytcbiAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXCI+JytcbiAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiByb3cubGlua3NcIj4nICtcbiAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgJzwvc3Bhbj4nK1xuICAgICc8L3NwYW4+JytcbiAgICAnPC90ZD4nK1xuICAgICc8L3RyPicrXG4gICAgJzwvdGJvZHk+JytcbiAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPidcbiAgKTtcbn1dKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZURpcmVjdGl2ZSk7XG5cbmdyaWRUYWJsZURpcmVjdGl2ZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkVGFibGUnLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkVGFibGUsIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgdmFyIHRhYmxlSW5zdCA9IG5ldyBncmlkVGFibGUoKTtcblxuICAgIHRhYmxlSW5zdC5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICRzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgLy8kc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24odGFibGVJbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd2bXNHcmlkJywgdm1zR3JpZERpcmVjdGl2ZSk7XG5cbmZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZTogJzxuZy1pbmNsdWRlIHNyYz1cImdldFRlbXBsYXRlVXJsKClcIiAvPicsXG4gICAgc2NvcGU6IHtcbiAgICAgIGdyaWRNb2RlbDogJz1ncmlkTW9kZWwnXG4gICAgfSxcbiAgICBjb250cm9sbGVyOiB2bXNHcmlkRGlyZWN0aXZlQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHIsIGN0cmwpIHtcblxuICAgIH1cbiAgfTtcblxuICB2bXNHcmlkRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSkge1xuICAgICRzY29wZS5nZXRUZW1wbGF0ZVVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCRzY29wZS5ncmlkTW9kZWwucGFyYW1zLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJztcbiAgICB9O1xuXG4gICAgZ3JpZEVudGl0eS5zZXRNb2RlbCgkc2NvcGUuZ3JpZE1vZGVsKTtcbiAgfVxufSJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9