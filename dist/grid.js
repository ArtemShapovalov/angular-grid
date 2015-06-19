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
        angular.module('grid').factory('gridPagination', gridPagination);
        gridPagination.$inject = ['_'];
        function gridPagination(_) {
            function Pagination() {
                /** Name of the parameter storing the current page index */
                this.pageParam = 'page';
                /** The zero-based current page number */
                this.currentPage = 1;
                /** Number of pages */
                this.pageCount = 0;
                /** The number of items per page */
                this.perPage = 1;
                /** Total number of items */
                this.totalCount = 2;
            }
            angular.extend(Pagination.prototype, {
                getPageParam: getPageParam,
                setTotalCount: setTotalCount,
                getTotalCount: getTotalCount,
                setPerPage: setPerPage,
                getPerPage: getPerPage,
                getPageCount: getPageCount,
                setCurrentPage: setCurrentPage,
                getCurrentPage: getCurrentPage,
                getOffset: getOffset,
                getPageUrl: getPageUrl
            });
            return Pagination;
            function getPageParam() {
                return this.pageParam;
            }
            function setTotalCount(totalCount) {
                this.totalCount = totalCount;
            }
            function getTotalCount() {
                return this.totalCount;
            }
            function setPerPage(perPage) {
                this.perPage = perPage;
            }
            function getPerPage() {
                return this.perPage;
            }
            function getPageCount() {
                var totalPages = this.perPage < 1 ? 1 : Math.ceil(this.totalCount / this.perPage);
                return Math.max(totalPages || 0, 1);
            }
            function setCurrentPage(currentPage) {
                this.currentPage = currentPage;
            }
            function getCurrentPage() {
                return this.currentPage;
            }
            function getOffset() {
                var result;
                result = Math.max(this.currentPage || 0, 1) * this.perPage - this.perPage;
                return result;
            }
            function getPageUrl(url) {
                var result;
                var searchParams = {};
                var pos = url.indexOf('?');
                result = url;
                if (pos >= 0) {
                    searchParams = getLocationSearch(url);
                    result = url.slice(0, pos);
                }
                searchParams[this.pageParam + '[offset]'] = this.getOffset();
                searchParams[this.pageParam + '[limit]'] = this.getPerPage();
                var searchPath = Object.keys(searchParams).map(function (k) {
                    return k + '=' + encodeURIComponent(searchParams[k]);
                }).join('&');
                searchPath = searchPath ? '?' + searchPath : '';
                return result + searchPath;
            }
            function getLocationSearch(url) {
                var params;
                // Remove the '?' at the start of the string and split out each assignment
                params = _.chain(url.slice(url.indexOf('?') + 1).split('&'))    // Split each array item into [key, value] ignore empty string if search is empty
.map(function (item) {
                    if (item)
                        return item.split('=');
                })    // Remove undefined in the case the search is empty
.compact()    // Turn [key, value] arrays into object parameters
.object()    // Return the value of the chain operation
.value();
                return params;
            }
        }
        angular.module('grid').factory('gridTable', gridTable);
        gridTable.$inject = [
            'grid-entity',
            'gridPagination',
            '$timeout',
            '_'
        ];
        function gridTable(gridEntity, gridPagination, $timeout, _) {
            function Table() {
                /**
     * @type {gridPagination}
     */
                this.pagination = new gridPagination(), this.rows = [];
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
                url = self.pagination.getPageUrl(self.getResourceUrl(model.url, model.params));
                $timeout(function () {
                    self.fetchData(url, fetchDataSuccess);
                });
                function fetchDataSuccess(data, schema) {
                    var schemaWithoutRef = self.mergeRelSchema(data.schemas()[0].data.value(), schema);
                    self.pagination.setTotalCount(data.property('meta').propertyValue('total'));
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
                /**
     * Load data by url and check type (create or other)
     * if create - fetch schema with create empty data,
     * if other action - fetch data with schema
     * @param url
     * @param callback
     */
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
                /**
     * Get links from data relationships section
     * INPUT:
     *   "data": [{
     *      ...
     *      "relationships": {
     *        "author": {
     *           "links": {
     *             "self": "http://example.com/users/1/relationships/author",
     *             "related": "http://example.com/users/1/author"
     *           },
     *           "data": { "type": "users", "id": "9" }
     *        }
     *      }
     *   }]
     * OUTPUT:
     *   [
     *      http://example.com/users/1/author/9
     *   ]
     * @param rowsRelationships
     * @returns {Array}
     */
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
                $templateCache.put('templates/grid/table.html', '<grid-table>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '<table class="table grid">' + '<thead>' + '<tr>' + '<th ' + 'ng-repeat="column in columns"' + 'ng-class="{ \'sortable\': column.sortable(this), \'sort-asc\': params.sorting()[column.sortable(this)]==\'asc\', \'sort-desc\': params.sorting()[column.sortable(this)]==\'desc\' }"' + 'ng-click="sortBy(column, $event)">{{column.title}}</th>' + '</tr>' + '</thead>' + '<tbody>' + '<tr ng-repeat="row in rows">' + '<td ng-repeat="column in columns">' + '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>' + '<span ng-if="column.attributeName == \'links\'">' + '<span ng-repeat="link in row.links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '</span>' + '</td>' + '</tr>' + '</tbody>' + '</table>' + '</grid-table>' + '<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>');
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
            gridTableDirectiveCtrl.$inject = [
                '$scope',
                '$location'
            ];
            return directive;
            function gridTableDirectiveCtrl($scope, $location) {
                $scope.alerts = [];
                /**
     * @type {gridTable}
     */
                var tableInst = new gridTable();
                /**
     * @type {gridPagination}
     */
                var pagination = tableInst.pagination;
                pagination.setCurrentPage($location.search().page);
                tableInst.getTableInfo(function (table) {
                    $scope.setPagination();
                    $scope.rows = table.rows;
                    $scope.columns = table.columns;
                    $scope.links = table.links;
                });
                $scope.edit = function (link) {
                    gridActions.action(tableInst, link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
                $scope.setPagination = function () {
                    $scope.totalItems = pagination.getTotalCount();
                    $scope.currentPage = pagination.getCurrentPage();
                    $scope.itemsPerPage = pagination.getPerPage();
                };
                $scope.pageChanged = function (pageNo) {
                    pagination.setCurrentPage(pageNo);
                    $scope.currentPage = pagination.getCurrentPage();
                    $location.search('page', pageNo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtcGFnaW5hdGlvbi5qcyIsImdyaWQtdGFibGUuanMiLCJncmlkLmpzIiwiYWN0aW9ucy9jcmVhdGUuanMiLCJhY3Rpb25zL2RlbGV0ZS5qcyIsImFjdGlvbnMvZ29Uby5qcyIsImFjdGlvbnMvbWFpbi5qcyIsImFjdGlvbnMvdXBkYXRlLmpzIiwiZGlyZWN0aXZlcy9ncmlkLWZvcm0uanMiLCJkaXJlY3RpdmVzL2dyaWQtdGFibGUuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIiRpbnRlcnZhbCIsIl8iLCJGb3JtIiwiZm9ybSIsIm1vZGVsIiwic2NoZW1hIiwibGlua3MiLCJleHRlbmQiLCJwcm90b3R5cGUiLCJnZXRGb3JtSW5mbyIsImdldENvbmZpZyIsIl9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMiLCJfY3JlYXRlVGl0bGVNYXAiLCJfZ2V0Rm9ybUNvbmZpZyIsIl9nZXRGaWVsZHNGb3JtIiwiX2ZpZWxkc1RvRm9ybUZvcm1hdCIsIl9nZXRFbXB0eURhdGEiLCJfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwic2VsZiIsImNhbGxiYWNrIiwiZ2V0TW9kZWwiLCJ1cmwiLCJnZXRSZXNvdXJjZVVybCIsInBhcmFtcyIsImZldGNoRGF0YSIsImZldGNoRGF0YVN1Y2Nlc3MiLCJkYXRhIiwibmV3RGF0YSIsInByb3BlcnR5Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwic2NoZW1hcyIsInZhbHVlIiwidHlwZSIsIlRZUEVfRk9STSIsImZpZWxkcyIsInJlbGF0aW9ucyIsImNhbGxiYWNrRm9ybUNvbmZpZyIsImNvbmZpZyIsInVuaW9uIiwidW5kZWZpbmVkIiwicmVzb3VyY2UiLCJvd24iLCJmb3JFYWNoIiwicmVsYXRpb25zaGlwcyIsInJlbGF0aW9uIiwia2V5IiwibWFwIiwicmVsYXRpb25JdGVtIiwicHJvcGVydHlWYWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdCIsInRpdGxlTWFwcyIsImF0dHJpYnV0ZXMiLCJkb2N1bWVudCIsInJhdyIsInByb3BlcnRpZXMiLCJvYmoiLCJ0aXRsZU1hcCIsImluY2x1ZGVkIiwiX2dldFJlbGF0aW9uUmVzb3VyY2UiLCJfYmF0Y2hMb2FkRGF0YSIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJtYXBWYWx1ZXMiLCJuIiwiaXRlbSIsImluZGV4Iiwic291cmNlVGl0bGVNYXBzIiwiZGF0YVJlbGF0aW9ucyIsImRhdGFBdHRyaWJ1dGVzIiwiZG9jdW1lbnRTY2hlbWEiLCJyZXNvdXJjZUxpbmsiLCJhdHRyaWJ1dGVOYW1lIiwic2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJzb3VyY2VFbnVtIiwiaXRlbXMiLCJlbnVtIiwiZW51bUl0ZW0iLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJpZCIsInJlbGF0aW9uTmFtZSIsImZldGNoQ29sbGVjdGlvbiIsInJlc291cmNlcyIsIm5hbWUiLCJmdWxsU2NoZW1hIiwiY2xvbmUiLCJnZXRUeXBlUHJvcGVydHkiLCJ0bXBPYmoiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiZ3JpZFBhZ2luYXRpb24iLCJQYWdpbmF0aW9uIiwicGFnZVBhcmFtIiwiY3VycmVudFBhZ2UiLCJwYWdlQ291bnQiLCJwZXJQYWdlIiwidG90YWxDb3VudCIsImdldFBhZ2VQYXJhbSIsInNldFRvdGFsQ291bnQiLCJnZXRUb3RhbENvdW50Iiwic2V0UGVyUGFnZSIsImdldFBlclBhZ2UiLCJnZXRQYWdlQ291bnQiLCJzZXRDdXJyZW50UGFnZSIsImdldEN1cnJlbnRQYWdlIiwiZ2V0T2Zmc2V0IiwiZ2V0UGFnZVVybCIsInRvdGFsUGFnZXMiLCJNYXRoIiwiY2VpbCIsIm1heCIsInNlYXJjaFBhcmFtcyIsInBvcyIsImluZGV4T2YiLCJnZXRMb2NhdGlvblNlYXJjaCIsInNsaWNlIiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJrIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImNoYWluIiwic3BsaXQiLCJjb21wYWN0Iiwib2JqZWN0IiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJwYWdpbmF0aW9uIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsIl9nZXRSb3dzQnlEYXRhIiwiVFlQRV9UQUJMRSIsInJvdyIsInJvd1Jlc3VsdCIsImZpZWxkIiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJzZXRNb2RlbCIsInNldE1lc3NhZ2UiLCJnZXRNZXNzYWdlIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwiYWxlcnQiLCJKc29uYXJ5IiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJhZGRTY2hlbWEiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJzY2hlbWFGdWxsIiwiaGF5c3RhY2siLCJoYXNPd25Qcm9wZXJ0eSIsIiRyZWYiLCJieVN0cmluZyIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwicmVsIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsInBhdGgiLCJyZXBsYWNlIiwiYSIsImkiLCJsZW5ndGgiLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwidGFibGUiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0Iiwic2VhcmNoIiwicGFnZSIsInNldFBhZ2luYXRpb24iLCJ0b3RhbEl0ZW1zIiwiaXRlbXNQZXJQYWdlIiwicGFnZUNoYW5nZWQiLCJwYWdlTm8iLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiYXR0ciIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztRQU1BLElBQUFBLElBQUEsR0FBQSxFQUFBLEM7UUFDQSxJQUFBO0FBQUEsWUFDQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsWUFBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBO0FBQUEsWUFDQUgsT0FBQSxDQUFBQyxNQUFBLENBQUEsY0FBQSxFQURBO0FBQUEsWUFFQUYsSUFBQSxDQUFBRyxJQUFBLENBQUEsY0FBQSxFQUZBO0FBQUEsU0FBQSxDQUdBLE9BQUFDLENBQUEsRUFBQTtBQUFBLFM7UUFFQSxJQUFBQyxPQUFBLEdBQUFKLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUYsSUFBQSxDQUFBLEM7UUFFQUMsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxPQUFBLENBQUEsR0FBQSxFQUFBLFlBQUE7QUFBQSxZQUNBLE9BQUFDLE1BQUEsQ0FEQTtBQUFBLFNBQUEsRTtRQ25CQU4sT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxPQUFBLENBQUEsVUFBQSxFQUFBRSxRQUFBLEU7UUFDQUEsUUFBQSxDQUFBQyxPQUFBLEdBQUE7QUFBQSxZQUFBLGFBQUE7QUFBQSxZQUFBLFVBQUE7QUFBQSxZQUFBLFdBQUE7QUFBQSxZQUFBLEdBQUE7QUFBQSxTQUFBLEM7UUFDQSxTQUFBRCxRQUFBLENBQUFFLFVBQUEsRUFBQUMsUUFBQSxFQUFBQyxTQUFBLEVBQUFDLENBQUEsRUFBQTtB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QSxTQUFBQSxnQkFBQSxHQUFBO0FBQUEsWUFDQSxJQUFBeEIsU0FBQSxHQUFBO0FBQUEsZ0JBQ0FFLFFBQUEsRUFBQSxHQURBO0FBQUEsZ0JBRUF1QixRQUFBLEVBQUEsdUNBRkE7QUFBQSxnQkFHQXZFLEtBQUEsRUFBQSxFQUNBd0UsU0FBQSxFQUFBLFlBREEsRUFIQTtBQUFBLGdCQU1BdkIsVUFBQSxFQUFBd0Isb0JBTkE7QUFBQSxnQkFPQXRMLElBQUEsRUFBQSxVQUFBNkcsS0FBQSxFQUFBMEUsRUFBQSxFQUFBQyxJQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLGlCQVBBO0FBQUEsYUFBQSxDQURBO0FBQUEsWUFhQUgsb0JBQUEsQ0FBQXRSLE9BQUEsR0FBQTtBQUFBLGdCQUFBLFFBQUE7QUFBQSxnQkFBQSxhQUFBO0FBQUEsYUFBQSxDQWJBO0FBQUEsWUFlQSxPQUFBMlAsU0FBQSxDQWZBO0FBQUEsWUFpQkEsU0FBQTJCLG9CQUFBLENBQUF0QixNQUFBLEVBQUEvUCxVQUFBLEVBQUE7QUFBQSxnQkFDQStQLE1BQUEsQ0FBQTBCLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQTFCLE1BQUEsQ0FBQXFCLFNBQUEsQ0FBQTNQLE1BQUEsQ0FBQVUsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBUUFuQyxVQUFBLENBQUE2SixRQUFBLENBQUFrRyxNQUFBLENBQUFxQixTQUFBLEVBUkE7QUFBQSxhQWpCQTtBQUFBLFMiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbG9kYXNoO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRGb3JtJywgZ3JpZEZvcm0pO1xuZ3JpZEZvcm0uJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcblxuICBmdW5jdGlvbiBGb3JtKCkge1xuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnM6IF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMsXG4gICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgIF9nZXRGaWVsZHNGb3JtOiBfZ2V0RmllbGRzRm9ybSxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgX2dldEZvcm1CdXR0b25CeVNjaGVtYTogX2dldEZvcm1CdXR0b25CeVNjaGVtYVxuICB9LCBncmlkRW50aXR5KTtcblxuICByZXR1cm4gRm9ybTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBmb3JtOiBzZWxmLmZvcm0sXG4gICAgICBtb2RlbDogc2VsZi5tb2RlbCxcbiAgICAgIHNjaGVtYTogc2VsZi5zY2hlbWEsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX0ZPUk07XG5cbiAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzLCByZWxhdGlvbnMpIHtcblxuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgIHNlbGYubW9kZWwgPSBzZWxmLl9maWVsZHNUb0Zvcm1Gb3JtYXQoZmllbGRzKTtcblxuICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgIHNlbGYuZm9ybSA9IGNvbmZpZztcblxuICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgc2VsZi5mb3JtID0gXy51bmlvbihzZWxmLmZvcm0sIHNlbGYuX2dldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9KVxuXG4gICAgfVxuXG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHJlc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICB9KTtcbiAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKFxuICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgKS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gW107XG5cbiAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICB2YXIgZGF0YUF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG5cbiAgICB2YXIgcmVsYXRpb25zID0gZGF0YVJlbGF0aW9ucy52YWx1ZSgpO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YUF0dHJpYnV0ZXMudmFsdWUoKTtcblxuICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihpdGVtLCBrZXkpIHtcblxuICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgIC8qKiBnZXQgbmFtZSBmcm9tIHNjaGVtYSAqL1xuICAgICAgdmFyIGF0dHJpYnV0ZU5hbWUgPSBkYXRhUmVsYXRpb25zLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgdmFyIHNvdXJjZUVudW0gPSB7fTtcblxuICAgICAgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMgJiYgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgIH0gZWxzZSBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW1cbiAgICAgIH1cblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZUVudW0sIGZ1bmN0aW9uIChlbnVtSXRlbSkge1xuICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChyZXNvdXJjZUxpbmssIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBlbnVtSXRlbX0pO1xuXG4gICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgcmVsYXRpb25OYW1lOiBrZXksXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICB9KVxuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlVGl0bGVNYXBzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgIHZhbHVlOiBpdGVtLmVudW1JdGVtLFxuICAgICAgICAgIC8vdmFsdWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpLFxuICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZW1wdHkgbW9kZWwgZm9yIGNyZWF0ZSBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFcbiAgICogQHBhcmFtIGZ1bGxTY2hlbWFcbiAgICogQHJldHVybnMgeyp9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgIHJlc3VsdC5kYXRhID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcykpO1xuICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2godmFsdWUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBjb25maWcgZm9yIHJlbmRlcmluZyBidXR0b25zIGZyb20gc2NoZW1hIGxpbmtzXG4gICAqXG4gICAqIEBwYXJhbSBsaW5rc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2J1dHRvbicsXG4gICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgIG9uQ2xpY2s6ICdlZGl0KCRldmVudCwgZm9ybSknXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFBhZ2luYXRpb24nLCBncmlkUGFnaW5hdGlvbik7XG5ncmlkUGFnaW5hdGlvbi4kaW5qZWN0ID0gWydfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihfKSB7XG5cbiAgZnVuY3Rpb24gUGFnaW5hdGlvbigpIHtcbiAgICAvKiogTmFtZSBvZiB0aGUgcGFyYW1ldGVyIHN0b3JpbmcgdGhlIGN1cnJlbnQgcGFnZSBpbmRleCAqL1xuICAgIHRoaXMucGFnZVBhcmFtID0gJ3BhZ2UnO1xuICAgIC8qKiBUaGUgemVyby1iYXNlZCBjdXJyZW50IHBhZ2UgbnVtYmVyICovXG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IDE7XG4gICAgLyoqIE51bWJlciBvZiBwYWdlcyAqL1xuICAgIHRoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zID0ge307XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICByZXN1bHQgPSB1cmw7XG5cbiAgICBpZiAocG9zPj0wKSB7XG4gICAgICBzZWFyY2hQYXJhbXMgPSBnZXRMb2NhdGlvblNlYXJjaCh1cmwpO1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tvZmZzZXRdJ10gPSB0aGlzLmdldE9mZnNldCgpO1xuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbbGltaXRdJ10gPSB0aGlzLmdldFBlclBhZ2UoKTtcblxuICAgIHZhciBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nK3NlYXJjaFBhdGg6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgcGFyYW1zO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSAnPycgYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgYW5kIHNwbGl0IG91dCBlYWNoIGFzc2lnbm1lbnRcbiAgICBwYXJhbXMgPSBfLmNoYWluKCB1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykgKVxuICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAvLyBSZW1vdmUgdW5kZWZpbmVkIGluIHRoZSBjYXNlIHRoZSBzZWFyY2ggaXMgZW1wdHlcbiAgICAgIC5jb21wYWN0KClcbiAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAub2JqZWN0KClcbiAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgLnZhbHVlKCk7XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRQYWdpbmF0aW9uJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgJHRpbWVvdXQsIF8pIHtcblxuICBmdW5jdGlvbiBUYWJsZSgpIHtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdGhpcy5wYWdpbmF0aW9uID0gbmV3IGdyaWRQYWdpbmF0aW9uKCksXG4gICAgdGhpcy5yb3dzID0gW107XG4gICAgdGhpcy5jb2x1bW5zID0ge307XG4gICAgdGhpcy5zY2hlbWEgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChUYWJsZS5wcm90b3R5cGUsIHtcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBnZXRUYWJsZUluZm86IGdldFRhYmxlSW5mbyxcbiAgICBnZXRDb2x1bW5zQnlTY2hlbWE6IGdldENvbHVtbnNCeVNjaGVtYSxcbiAgICByb3dzVG9UYWJsZUZvcm1hdDogcm93c1RvVGFibGVGb3JtYXQsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0sIGdyaWRFbnRpdHkpO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgIHVybDtcblxuICAgIHVybCA9IHNlbGYucGFnaW5hdGlvbi5nZXRQYWdlVXJsKHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG5cbiAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9UQUJMRTtcblxuICAgICAgc2VsZi5fZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzKSB7XG5cbiAgICAgICAgc2VsZi5yb3dzID0gc2VsZi5yb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5jb2x1bW5zID0gc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG5cbiAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgIH1cbiAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICB9KTsqL1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgIHZhciByb3dSZXN1bHQgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG4gIHZhciBkYXRhLFxuICAgICAgc2NoZW1hO1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCR0aW1lb3V0LCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzID0ge1xuICAgICAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIFRZUEVfRk9STTogJ2Zvcm0nLFxuICAgICAgVFlQRV9UQUJMRTogJ3RhYmxlJyxcbiAgICAgIHR5cGU6ICcnLFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBpZiAobW9kZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGVydCgnUGxlYXNlIHNldCBtb2RlbCBiZWZvcmUgY2FsbCBmZXRjaCBkYXRhJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24gKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbiAoalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbnM7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgIGlmIChyZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykudmFsdWUoKSkge1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihyZWxJdGVtLCByZWxLZXkpIHtcbiAgICAgICAgICByZXN1bHRbcmVsS2V5XSA9IHNlbGYuX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmsgZnJvbSByZWxhdGlvbiBmb3IgbG9hZCByZXNvdXJjZSBkYXRhXG4gICAgICpcbiAgICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICAgKiBAcGFyYW0gcmVsSXRlbVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXNvdXJjZSA9IFtdO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgIHZhciBsaW5rQXJyYXkgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbEl0ZW0uZGF0YSwgZnVuY3Rpb24oZGF0YU9iaikge1xuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBkYXRhT2JqLmlkfSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc291cmNlID0gbGlua0FycmF5O1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvdXJjZSA9IFt7XG4gICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXSA9IHJlc3VsdFtrUm93XVtrUmVsXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSBvYmouVFlQRV9UQUJMRSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmoudHlwZSA9PT0gb2JqLlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnLFxuICAgICc8Z3JpZC1mb3JtPicgK1xuICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJnbyhsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAnPC9zcGFuPicrXG4gICAgJzxkaXY+JyArXG4gICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgJzwvZGl2PicgK1xuICAgICc8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XCJncmlkRm9ybVwiIG5nLWluaXQ9XCJzZXRGb3JtU2NvcGUodGhpcylcIicgK1xuICAgICdzZi1zY2hlbWE9XCJzY2hlbWFcIiBzZi1mb3JtPVwiZm9ybVwiIHNmLW1vZGVsPVwibW9kZWxcIicgK1xuICAgICdjbGFzcz1cImZvcm0taG9yaXpvbnRhbFwiIHJvbGU9XCJmb3JtXCIgbmctaWY9XCJoaWRlRm9ybSAhPT0gdHJ1ZVwiPicrXG4gICAgJzwvZm9ybT4nK1xuICAgICc8L2dyaWQtZm9ybT4nXG4gICk7XG59XSk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZEZvcm0nLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkRm9ybSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGU9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG5cbiAgICB2YXIgZm9ybUluc3QgPSBuZXcgZ3JpZEZvcm0oKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnLFxuICAgICc8Z3JpZC10YWJsZT4nICtcbiAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIGxpbmtzXCI+JyArXG4gICAgICAgICc8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIG5nLWNsaWNrPVwiZWRpdChsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8YWxlcnQgbmctcmVwZWF0PVwiYWxlcnQgaW4gYWxlcnRzXCIgdHlwZT1cInt7YWxlcnQudHlwZX19XCIgY2xvc2U9XCJjbG9zZUFsZXJ0KCRpbmRleClcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD4nK1xuICAgICAgJzx0YWJsZSBjbGFzcz1cInRhYmxlIGdyaWRcIj4nK1xuICAgICAgICAnPHRoZWFkPicrXG4gICAgICAgICAgJzx0cj4nK1xuICAgICAgICAgICAgJzx0aCAnICtcbiAgICAgICAgICAgICAgJ25nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCInICtcbiAgICAgICAgICAgICAgJ25nLWNsYXNzPVwieyBcXCdzb3J0YWJsZVxcJzogY29sdW1uLnNvcnRhYmxlKHRoaXMpLCBcXCdzb3J0LWFzY1xcJzogcGFyYW1zLnNvcnRpbmcoKVtjb2x1bW4uc29ydGFibGUodGhpcyldPT1cXCdhc2NcXCcsIFxcJ3NvcnQtZGVzY1xcJzogcGFyYW1zLnNvcnRpbmcoKVtjb2x1bW4uc29ydGFibGUodGhpcyldPT1cXCdkZXNjXFwnIH1cIicrXG4gICAgICAgICAgICAgICduZy1jbGljaz1cInNvcnRCeShjb2x1bW4sICRldmVudClcIj57e2NvbHVtbi50aXRsZX19PC90aD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3RoZWFkPicrXG4gICAgICAgICc8dGJvZHk+JytcbiAgICAgICAgICAnPHRyIG5nLXJlcGVhdD1cInJvdyBpbiByb3dzXCI+JytcbiAgICAgICAgICAnPHRkIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+JytcbiAgICAgICAgICAnPHNwYW4gbmctaWY9XCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj4nK1xuICAgICAgICAgICc8c3BhbiBuZy1pZj1cImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXCI+JytcbiAgICAgICAgICAnPHNwYW4gbmctcmVwZWF0PVwibGluayBpbiByb3cubGlua3NcIj4nICtcbiAgICAgICAgICAnPGEgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIiBuZy1jbGljaz1cImVkaXQobGluaylcIj57e2xpbmsudGl0bGV9fTwvYT4gJyArXG4gICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAnPC90ZD4nK1xuICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICc8L3Rib2R5PicrXG4gICAgICAnPC90YWJsZT4nICtcbiAgICAnPC9ncmlkLXRhYmxlPicrXG4gICAgJzxwYWdpbmF0aW9uIG5nLWlmPVwicm93c1wiIGRpcmVjdGlvbi1saW5rcz1cImZhbHNlXCIgYm91bmRhcnktbGlua3M9XCJ0cnVlXCIgaXRlbXMtcGVyLXBhZ2U9XCJpdGVtc1BlclBhZ2VcIiB0b3RhbC1pdGVtcz1cInRvdGFsSXRlbXNcIiBuZy1tb2RlbD1cImN1cnJlbnRQYWdlXCIgbmctY2hhbmdlPVwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXCI+PC9wYWdpbmF0aW9uPidcbiAgKTtcbn1dKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZURpcmVjdGl2ZSk7XG5cbmdyaWRUYWJsZURpcmVjdGl2ZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkVGFibGUnLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkVGFibGUsIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRUYWJsZX1cbiAgICAgKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9IHRhYmxlSW5zdC5wYWdpbmF0aW9uO1xuXG4gICAgcGFnaW5hdGlvbi5zZXRDdXJyZW50UGFnZSgkbG9jYXRpb24uc2VhcmNoKCkucGFnZSk7XG5cbiAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbigpO1xuXG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5KSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LnNldE1vZGVsKCRzY29wZS5ncmlkTW9kZWwpO1xuICB9XG59Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=