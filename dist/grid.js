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
        angular.module('grid').factory('Helper', helperSrv);
        helperSrv.$inject = ['_'];
        function helperSrv() {
            var factory = {
                parseLocationSearch: parseLocationSearch,
                setLocationSearch: setLocationSearch
            };
            return factory;
            /**
   * Parse search param url
   * @param url
   * @returns {*}
   */
            function parseLocationSearch(url) {
                var searchParams;
                var pos = url.indexOf('?');
                if (pos >= 0) {
                    // Remove the '?' at the start of the string and split out each assignment
                    searchParams = _.chain(url.slice(url.indexOf('?') + 1).split('&'))    // Split each array item into [key, value] ignore empty string if search is empty
.map(function (item) {
                        if (item)
                            return item.split('=');
                    })    // Remove undefined in the case the search is empty
.compact()    // Turn [key, value] arrays into object parameters
.object()    // Return the value of the chain operation
.value();
                }
                return searchParams || {};
            }
            function setLocationSearch(url, searchParams) {
                var searchPath;
                var pos = url.indexOf('?');
                var result = url;
                if (pos >= 0) {
                    result = url.slice(0, pos);
                }
                searchPath = Object.keys(searchParams).map(function (k) {
                    return k + '=' + encodeURIComponent(searchParams[k]);
                }).join('&');
                searchPath = searchPath ? '?' + searchPath : '';
                return result + searchPath;
            }
        }
        angular.module('grid').factory('gridPagination', gridPagination);
        gridPagination.$inject = [
            'Helper',
            '_'
        ];
        function gridPagination(Helper, _) {
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
                var searchParams;
                searchParams = Helper.parseLocationSearch(url);
                searchParams[this.pageParam + '[offset]'] = this.getOffset();
                searchParams[this.pageParam + '[limit]'] = this.getPerPage();
                result = Helper.setLocationSearch(url, searchParams);
                return result;
            }
        }
        angular.module('grid').factory('Sorting', sortingSrv);
        sortingSrv.$inject = [
            'Helper',
            '_'
        ];
        function sortingSrv(Helper, _) {
            /**
   * @class
   * @constructor
   */
            function Sorting() {
                this.sortParam = 'sort';
            }
            Sorting.DIRECTION_ASC = 'asc';
            Sorting.DIRECTION_DESC = 'desc';
            Sorting.field = undefined;
            Sorting.direction = '';
            Sorting.sortFields = [];
            angular.extend(Sorting.prototype, {
                getColumn: getColumn,
                getDirectionColumn: getDirectionColumn,
                setSortFields: setSortFields,
                setSorting: setSorting,
                getUrl: getUrl
            });
            return Sorting;
            /**
   * @name Sorting#getDirectionColumn
   * @param currentDirection
   * @returns {*}
   */
            function getDirectionColumn(currentDirection) {
                if (!currentDirection) {
                    return 'asc';
                }
                return currentDirection == 'asc' ? 'desc' : '';
            }
            /**
   * Get column for field if field have '.' then get first part
   * For example: 'user.name' return 'user'
   *
   * @name Sorting#getColumn
   *
   * @returns {string|undefined}
   */
            function getColumn() {
                if (this.field) {
                    if (this.field.indexOf('.') >= 0) {
                        return this.field.slice(0, this.field.indexOf('.'));
                    }
                    return this.field;
                }
                return undefined;
            }
            /**
   * @name Sorting#setSorting
   * @param field
   * @param direction
   */
            function setSorting(field, direction) {
                this.field = field;
                this.direction = direction;
            }
            /**
   * @name Sorting#setSortFields
   * @param fields
   */
            function setSortFields(fields) {
                this.sortFields = fields;
            }
            /**
   * @name Sorting#getUrl
   * @param url
   * @returns {string}
   */
            function getUrl(url) {
                var result;
                var searchParams;
                if (!this.field) {
                    return url;
                }
                searchParams = Helper.parseLocationSearch(url);
                searchParams[this.sortParam + '[' + this.field + ']'] = this.direction;
                result = Helper.setLocationSearch(url, searchParams);
                return result;
            }
        }
        angular.module('grid').factory('gridTable', gridTable);
        gridTable.$inject = [
            'grid-entity',
            'gridPagination',
            'Sorting',
            '$timeout',
            '_'
        ];
        function gridTable(gridEntity, gridPagination, Sorting, $timeout, _) {
            /**
   * @class
   * @constructor
   */
            function Table() {
                /**
     * @type {gridPagination}
     */
                this.pagination = new gridPagination(), /**
     * @type {Sorting}
     */
                this.sorting = new Sorting(), this.rows = [];
                this.columns = {};
                this.links = {};
            }
            angular.extend(Table.prototype, {
                getConfig: getConfig,
                getTableInfo: getTableInfo,
                getColumnsBySchema: getColumnsBySchema,
                rowsToTableFormat: rowsToTableFormat,
                getSortingParamByField: getSortingParamByField,
                setSorting: setSorting,
                _getRowsByData: _getRowsByData
            }, gridEntity);
            return Table;
            function getConfig() {
                var self = this;
                return {
                    rows: self.rows,
                    columns: self.columns,
                    links: self.links
                };
            }
            function getTableInfo(callback) {
                /*jshint validthis: true */
                var self = this, model = self.getModel(), url;
                /** add page to url */
                url = self.pagination.getPageUrl(self.getResourceUrl(model.url, model.params));
                /** add sort to url */
                url = self.sorting.getUrl(url);
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
                        self.sorting.setSortFields(_.map(self.columns, 'attributeName'));
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
            function setSorting(field, direction) {
                field = this.getSortingParamByField(field);
                this.sorting.setSorting(field, direction);
            }
            /**
   * @name Table#getSortingParamByField
   * @param field
   * @returns {*}
   */
            function getSortingParamByField(field) {
                var result = field;
                var rel = this.data.property('data').item(0).property('relationships').property(field);
                if (rel.value()) {
                    var fieldName = rel.schemas()[0].data.value().name;
                    result += '.' + fieldName;
                }
                return result;
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
                /**
     * Jsonary data object
     *
     * @type {Jsonary}
     */
                this.data = {};
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
                        self.data = data;
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
        angular.module('grid').directive('gridTable', gridTableDirective);
        gridTableDirective.$inject = [
            'grid-entity',
            'gridTable',
            'grid-actions'
        ];
        //TODO: should be set require ...  depends on vmsGrid
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
                $scope.tableInst = tableInst;
                pagination.setCurrentPage($location.search().page);
                setSortingBySearch($location.search());
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
                function setSortingBySearch(fields) {
                    var sorting = tableInst.sorting;
                    if (!fields[sorting.sortParam]) {
                        return false;
                    }
                    var pos = fields[sorting.sortParam].lastIndexOf('_');
                    var field = fields[sorting.sortParam].slice(0, pos);
                    var direction = fields[sorting.sortParam].slice(pos + 1);
                    sorting.setSorting(field, direction);
                }
            }
        }
        angular.module('grid').directive('gridThead', gridTheadDirective);
        gridTheadDirective.$inject = [];
        function gridTheadDirective() {
            var directive = {
                scope: {
                    tableInst: '=table',
                    columns: '=columns'
                },
                require: '^gridTable',
                templateUrl: 'templates/grid/table-head.html',
                restrict: 'A',
                controller: gridTheadCtrl,
                link: function (scope, element, attr) {
                }
            };
            gridTheadCtrl.$inject = [
                '$scope',
                '$location'
            ];
            return directive;
            function gridTheadCtrl($scope, $location) {
                /** @type {Sorting} */
                var sorting = $scope.tableInst.sorting;
                $scope.$watch('columns', function (newVal) {
                    if (newVal) {
                        $scope.sortFields = sorting.sortFields;
                        $scope.setSorting();
                    }
                });
                $scope.setSorting = function () {
                    var field = sorting.getColumn();
                    if (field) {
                        _.where($scope.columns, { 'attributeName': field })[0].sorting = sorting.direction;
                    }
                };
                $scope.sortBy = function (column, event) {
                    column.sorting = sorting.getDirectionColumn(column.sorting);
                    $scope.tableInst.setSorting(column.attributeName, column.sorting);
                    var field = $scope.tableInst.getSortingParamByField(column.attributeName);
                    if (column.sorting) {
                        $location.search('sort', field + '_' + direction);
                    } else {
                        $location.search('sort', null);
                    }
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
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/form.html', '<grid-form>\n    <span ng-repeat="link in links">\n    <a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a>\n    </span>\n\n    <div>\n        <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n    </div>\n    <form novalidate name="gridForm" ng-init="setFormScope(this)"\n          sf-schema="schema" sf-form="form" sf-model="model"\n          class="form-horizontal" role="form" ng-if="hideForm !== true">\n    </form>\n</grid-form>');
                $templateCache.put('templates/grid/table-head.html', '<tr>\n    <th ng-repeat="column in columns">\n        <div ng-if="sortFields.indexOf(column.attributeName)>=0" class="th-inner sortable" ng-click="sortBy(column, $event)">{{column.title}}\n            <span ng-if="column.sorting" class="order" ng-class="{\'dropup\': column.sorting==\'desc\'}">\n                <span class="caret" style="margin: 0px 5px;"></span>\n            </span>\n        </div>\n        <div ng-if="sortFields.indexOf(column.attributeName)<0" class="th-inner">{{column.title}}</div>\n    </th>\n</tr>\n');
                $templateCache.put('templates/grid/table.html', '<grid-table>\n    <span ng-repeat="link in links">\n        <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n      </span>\n    <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n\n    <table class="table grid">\n        <thead grid-thead table="tableInst" columns="columns"></thead>\n        <tbody>\n            <tr ng-repeat="row in rows">\n                <td ng-repeat="column in columns">\n                    <span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>\n                    <span ng-if="column.attributeName == \'links\'">\n                        <span ng-repeat="link in row.links">\n                            <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n                        </span>\n                    </span>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</grid-table>\n<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>');
            }
        ]);
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10aGVhZC5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJmYWN0b3J5IiwibG9kYXNoIiwiZ3JpZEZvcm0iLCIkaW5qZWN0IiwiZ3JpZEVudGl0eSIsIiR0aW1lb3V0IiwiJGludGVydmFsIiwiXyIsIkZvcm0iLCJmb3JtIiwibW9kZWwiLCJzY2hlbWEiLCJsaW5rcyIsImV4dGVuZCIsInByb3RvdHlwZSIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJuZXdEYXRhIiwicHJvcGVydHkiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJzY2hlbWFzIiwidmFsdWUiLCJ0eXBlIiwiVFlQRV9GT1JNIiwiZmllbGRzIiwicmVsYXRpb25zIiwiY2FsbGJhY2tGb3JtQ29uZmlnIiwiY29uZmlnIiwidW5pb24iLCJ1bmRlZmluZWQiLCJyZXNvdXJjZSIsIm93biIsImZvckVhY2giLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJrZXkiLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJwcm9wZXJ0eVZhbHVlIiwiQXJyYXkiLCJpc0FycmF5IiwicmVzdWx0IiwidGl0bGVNYXBzIiwiYXR0cmlidXRlcyIsImRvY3VtZW50IiwicmF3IiwicHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9iYXRjaExvYWREYXRhIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJzb3VyY2VUaXRsZU1hcHMiLCJkYXRhUmVsYXRpb25zIiwiZGF0YUF0dHJpYnV0ZXMiLCJkb2N1bWVudFNjaGVtYSIsInJlc291cmNlTGluayIsImF0dHJpYnV0ZU5hbWUiLCJzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmIiwiX3JlcGxhY2VGcm9tRnVsbCIsInNvdXJjZUVudW0iLCJpdGVtcyIsImVudW0iLCJlbnVtSXRlbSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiZmV0Y2hDb2xsZWN0aW9uIiwicmVzb3VyY2VzIiwibmFtZSIsImZ1bGxTY2hlbWEiLCJjbG9uZSIsImdldFR5cGVQcm9wZXJ0eSIsInRtcE9iaiIsInRpdGxlIiwibGluayIsIm9uQ2xpY2siLCJoZWxwZXJTcnYiLCJwYXJzZUxvY2F0aW9uU2VhcmNoIiwic2V0TG9jYXRpb25TZWFyY2giLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJpbmRleE9mIiwiY2hhaW4iLCJzbGljZSIsInNwbGl0IiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiayIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJncmlkUGFnaW5hdGlvbiIsIkhlbHBlciIsIlBhZ2luYXRpb24iLCJwYWdlUGFyYW0iLCJjdXJyZW50UGFnZSIsInBhZ2VDb3VudCIsInBlclBhZ2UiLCJ0b3RhbENvdW50IiwiZ2V0UGFnZVBhcmFtIiwic2V0VG90YWxDb3VudCIsImdldFRvdGFsQ291bnQiLCJzZXRQZXJQYWdlIiwiZ2V0UGVyUGFnZSIsImdldFBhZ2VDb3VudCIsInNldEN1cnJlbnRQYWdlIiwiZ2V0Q3VycmVudFBhZ2UiLCJnZXRPZmZzZXQiLCJnZXRQYWdlVXJsIiwidG90YWxQYWdlcyIsIk1hdGgiLCJjZWlsIiwibWF4Iiwic29ydGluZ1NydiIsIlNvcnRpbmciLCJzb3J0UGFyYW0iLCJESVJFQ1RJT05fQVNDIiwiRElSRUNUSU9OX0RFU0MiLCJmaWVsZCIsImRpcmVjdGlvbiIsInNvcnRGaWVsZHMiLCJnZXRDb2x1bW4iLCJnZXREaXJlY3Rpb25Db2x1bW4iLCJzZXRTb3J0RmllbGRzIiwic2V0U29ydGluZyIsImdldFVybCIsImN1cnJlbnREaXJlY3Rpb24iLCJncmlkVGFibGUiLCJUYWJsZSIsInBhZ2luYXRpb24iLCJzb3J0aW5nIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJfZ2V0Um93c0J5RGF0YSIsIlRZUEVfVEFCTEUiLCJyZWwiLCJmaWVsZE5hbWUiLCJyb3ciLCJyb3dSZXN1bHQiLCJmb3JPd24iLCJyZXMiLCJ0bXBSb3ciLCJwcm92aWRlciIsIiRnZXQiLCJncmlkRW50aXR5R2V0IiwibWVzc2FnZXMiLCJzdWNjZXNzRGVsZXRlZCIsInN1Y2Nlc3NDcmVhdGVkIiwic3VjY2Vzc1VwZGF0ZWQiLCJzZXJ2ZXJFcnJvciIsInNldE1vZGVsIiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsImJ5U3RyaW5nIiwic3Vic3RyaW5nIiwicmVsSXRlbSIsInJlbEtleSIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zIiwicm93c1JlbGF0aW9uc2hpcHMiLCJrUm93Iiwia1JlbCIsImtSZWxJdGVtIiwicGF0aCIsInJlcGxhY2UiLCJhIiwiaSIsImxlbmd0aCIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0Iiwic2VhcmNoIiwicGFnZSIsInNldFNvcnRpbmdCeVNlYXJjaCIsInNldFBhZ2luYXRpb24iLCJ0b3RhbEl0ZW1zIiwiaXRlbXNQZXJQYWdlIiwicGFnZUNoYW5nZWQiLCJwYWdlTm8iLCJsYXN0SW5kZXhPZiIsImdyaWRUaGVhZERpcmVjdGl2ZSIsInJlcXVpcmUiLCJ0ZW1wbGF0ZVVybCIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsIiR3YXRjaCIsIm5ld1ZhbCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwiZXZlbnQiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJncmlkTW9kZWwiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9B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LGdCQUNBK1EsTUFBQSxDQUFBdUMsY0FBQSxHQUFBLFlBQUE7QUFBQSxvQkFDQSxJQUFBdkMsTUFBQSxDQUFBbUMsU0FBQSxDQUFBelIsTUFBQSxDQUFBVSxJQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBLDBCQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLG9CQUlBLE9BQUEsMkJBQUEsQ0FKQTtBQUFBLGlCQUFBLENBREE7QUFBQSxnQkFRQW5DLFVBQUEsQ0FBQWlMLFFBQUEsQ0FBQThGLE1BQUEsQ0FBQW1DLFNBQUEsRUFSQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBM1QsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBK1QsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDJCQUFBLEVBQUEsOG9DQUFBLEVBRkE7QUFBQSxhQUFBO0FBQUEsU0FBQSxFIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJyRpbnRlcnZhbCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybSgpIHtcbiAgICB0aGlzLmZvcm0gPSBbXTtcbiAgICB0aGlzLm1vZGVsID0ge307XG4gICAgdGhpcy5zY2hlbWEgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSwgZ3JpZEVudGl0eSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuXG4gICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSlcblxuICAgIH1cblxuICB9XG5cblxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSByZXNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIF9maWVsZHNUb0Zvcm1Gb3JtYXQocmVzb3VyY2UpIHtcbiAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICB2YXIgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgfSk7XG4gICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBmaWVsZHNba2V5XVswXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gc2VsZi5tZXJnZVJlbFNjaGVtYShcbiAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWVsZHM7XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgdmFyIGRhdGFSZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgdmFyIGRhdGFBdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuXG4gICAgdmFyIHJlbGF0aW9ucyA9IGRhdGFSZWxhdGlvbnMudmFsdWUoKTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICB2YXIgZG9jdW1lbnRTY2hlbWEgPSBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgIHZhciByZXNvdXJjZUxpbmsgPSBpdGVtLmxpbmtzLnNlbGY7XG4gICAgICAvKiogZ2V0IG5hbWUgZnJvbSBzY2hlbWEgKi9cbiAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmID0gc2VsZi5fcmVwbGFjZUZyb21GdWxsKGRhdGFBdHRyaWJ1dGVzLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIGRvY3VtZW50U2NoZW1hKVsncHJvcGVydGllcyddW2tleV07XG5cbiAgICAgIHZhciBzb3VyY2VFbnVtID0ge307XG5cbiAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtXG4gICAgICB9IGVsc2UgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICB9XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbiAoZW51bUl0ZW0pIHtcbiAgICAgICAgdmFyIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVzb3VyY2VMaW5rLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IGF0dHJpYnV0ZU5hbWVcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdXJjZVRpdGxlTWFwcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBzZWxmLl9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSk7XG5cbiAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihfLm1hcChzb3VyY2VUaXRsZU1hcHMsICd1cmwnKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VUaXRsZU1hcHMsIGZ1bmN0aW9uIChpdGVtKSB7XG5cbiAgICAgICAgaWYgKCF0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdKSB7XG4gICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXS5wdXNoKHtcbiAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hXG4gICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgIHJlc3VsdCA9IF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzKTtcbiAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXMpKTtcblxuICAgIGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0eShvYmopIHtcbiAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGlmICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaFxuICB9O1xuXG4gIHJldHVybiBmYWN0b3J5O1xuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zPj0wKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbiggdXJsLnNsaWNlKHVybC5pbmRleE9mKCc/JykgKyAxKS5zcGxpdCgnJicpIClcbiAgICAgICAgICAvLyBTcGxpdCBlYWNoIGFycmF5IGl0ZW0gaW50byBba2V5LCB2YWx1ZV0gaWdub3JlIGVtcHR5IHN0cmluZyBpZiBzZWFyY2ggaXMgZW1wdHlcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgICAgLmNvbXBhY3QoKVxuICAgICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgICAgLm9iamVjdCgpXG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY2hhaW4gb3BlcmF0aW9uXG4gICAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3M+PTApIHtcbiAgICAgIHJlc3VsdCA9IHVybC5zbGljZSgwLCBwb3MpO1xuICAgIH1cblxuICAgIHNlYXJjaFBhdGggPSBPYmplY3Qua2V5cyhzZWFyY2hQYXJhbXMpLm1hcChmdW5jdGlvbihrKSB7XG4gICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChzZWFyY2hQYXJhbXNba10pXG4gICAgfSkuam9pbignJicpO1xuXG4gICAgc2VhcmNoUGF0aCA9IHNlYXJjaFBhdGggPyAnPycrc2VhcmNoUGF0aDogJyc7XG5cbiAgICByZXR1cm4gcmVzdWx0ICsgc2VhcmNoUGF0aDtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFBhZ2luYXRpb24nLCBncmlkUGFnaW5hdGlvbik7XG5ncmlkUGFnaW5hdGlvbi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFBhZ2luYXRpb24oSGVscGVyLCBfKSB7XG5cbiAgZnVuY3Rpb24gUGFnaW5hdGlvbigpIHtcbiAgICAvKiogTmFtZSBvZiB0aGUgcGFyYW1ldGVyIHN0b3JpbmcgdGhlIGN1cnJlbnQgcGFnZSBpbmRleCAqL1xuICAgIHRoaXMucGFnZVBhcmFtID0gJ3BhZ2UnO1xuICAgIC8qKiBUaGUgemVyby1iYXNlZCBjdXJyZW50IHBhZ2UgbnVtYmVyICovXG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IDE7XG4gICAgLyoqIE51bWJlciBvZiBwYWdlcyAqL1xuICAgIHRoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ1NvcnRpbmcnLCBzb3J0aW5nU3J2KTtcbnNvcnRpbmdTcnYuJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIHNvcnRpbmdTcnYoSGVscGVyLCBfKSB7XG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpPj0wKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkLnNsaWNlKDAsIHRoaXMuZmllbGQuaW5kZXhPZignLicpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZmllbGQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRpbmdcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZmllbGQgPSBmaWVsZDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRGaWVsZHNcbiAgICogQHBhcmFtIGZpZWxkc1xuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydEZpZWxkcyhmaWVsZHMpIHtcbiAgICB0aGlzLnNvcnRGaWVsZHMgPSBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXRVcmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIGlmICghdGhpcy5maWVsZCkge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMuc29ydFBhcmFtICsgJ1snKyB0aGlzLmZpZWxkICsnXSddID0gdGhpcy5kaXJlY3Rpb247XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZSk7XG5ncmlkVGFibGUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFBhZ2luYXRpb24nLCAnU29ydGluZycsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgZ3JpZFBhZ2luYXRpb24sIFNvcnRpbmcsICR0aW1lb3V0LCBfKSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFRhYmxlKCkge1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKSxcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpLFxuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIGFuZ3VsYXIuZXh0ZW5kKFRhYmxlLnByb3RvdHlwZSwge1xuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0sIGdyaWRFbnRpdHkpO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgdXJsO1xuXG4gICAgLyoqIGFkZCBwYWdlIHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYucGFnaW5hdGlvbi5nZXRQYWdlVXJsKHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpKTtcbiAgICAvKiogYWRkIHNvcnQgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5zb3J0aW5nLmdldFVybCh1cmwpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYucGFnaW5hdGlvbi5zZXRUb3RhbENvdW50KGRhdGEucHJvcGVydHkoJ21ldGEnKS5wcm9wZXJ0eVZhbHVlKCd0b3RhbCcpKTtcblxuICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX1RBQkxFO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgdmFyIGZpZWxkTmFtZSA9IHJlbC5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLm5hbWU7XG4gICAgICByZXN1bHQgKz0gJy4nK2ZpZWxkTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFXaXRob3V0UmVmXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgIH1cbiAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICB9KTsqL1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgIHZhciByb3dSZXN1bHQgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRpbnRlcnZhbCcsICdfJ107XG5cbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRFbnRpdHlHZXQoJHRpbWVvdXQsICRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbCxcbiAgICAgICAgbWVzc2FnZXMgPSB7XG4gICAgICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBKc29uYXJ5IGRhdGEgb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSB7SnNvbmFyeX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSB7fTtcblxuICAgIHJldHVybiB7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgbWVyZ2VSZWxTY2hlbWE6IG1lcmdlUmVsU2NoZW1hLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1cmwgYnkgcGFyYW1zIGZvciBsb2FkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZXQgbW9kZWwgYmVmb3JlIGNhbGwgZmV0Y2ggZGF0YScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uICh1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24gKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gT2JqZWN0LmJ5U3RyaW5nKHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICB9XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59XG5cbk9iamVjdC5ieVN0cmluZyA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICB2YXIgayA9IGFbaV07XG4gICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICBvYmogPSBvYmpba107XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NDcmVhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmoudHlwZSA9PT0gb2JqLlRZUEVfVEFCTEUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAob2JqLnR5cGUgPT09IG9iai5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWdvVG8nLCBncmlkQWN0aW9uR29Ubyk7XG5ncmlkQWN0aW9uR29Uby4kaW5qZWN0ID0gWyckbG9jYXRpb24nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25Hb1RvKCRsb2NhdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0ob2JqLCBsaW5rLCBzY29wZSk7XG4gICAgICB9LmJpbmQodGhpcylcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi11cGRhdGUnLCBncmlkQWN0aW9uVXBkYXRlKTtcbmdyaWRBY3Rpb25VcGRhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25VcGRhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5JywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEVudGl0eSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlPSBmdW5jdGlvbihzY29wZSl7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCk7XG5cbiAgICBmb3JtSW5zdC5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRFbnRpdHksIGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFRhYmxlfVxuICAgICAqL1xuICAgIHZhciB0YWJsZUluc3QgPSBuZXcgZ3JpZFRhYmxlKCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRQYWdpbmF0aW9ufVxuICAgICAqL1xuICAgIHZhciBwYWdpbmF0aW9uID0gdGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgcGFnaW5hdGlvbi5zZXRDdXJyZW50UGFnZSgkbG9jYXRpb24uc2VhcmNoKCkucGFnZSk7XG4gICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG5cbiAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbigpO1xuXG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0U29ydGluZ0J5U2VhcmNoKGZpZWxkcykge1xuICAgICAgdmFyIHNvcnRpbmcgPSB0YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHRhYmxlSW5zdDogJz10YWJsZScsXG4gICAgICAgIGNvbHVtbnM6ICc9Y29sdW1ucydcbiAgICAgIH0sXG4gICAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLWhlYWQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGF0dHIpO1xuICAgICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnY29sdW1ucycsIGZ1bmN0aW9uKG5ld1ZhbCl7XG4gICAgICBpZiAobmV3VmFsKSB7XG4gICAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgICAkc2NvcGUuc2V0U29ydGluZygpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFNvcnRpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmaWVsZCA9IHNvcnRpbmcuZ2V0Q29sdW1uKCk7XG5cbiAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICBfLndoZXJlKCRzY29wZS5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbiwgZXZlbnQpIHtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG5cbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgY29sdW1uLnNvcnRpbmcpO1xuXG4gICAgICB2YXIgZmllbGQgPSAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoY29sdW1uLmF0dHJpYnV0ZU5hbWUpO1xuXG4gICAgICBpZiAoY29sdW1uLnNvcnRpbmcpIHtcbiAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCgnc29ydCcsIGZpZWxkICsnXycrIGRpcmVjdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgbnVsbCk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWQtZW50aXR5J107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRFbnRpdHkpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICAgIGdyaWRFbnRpdHkuc2V0TW9kZWwoJHNjb3BlLmdyaWRNb2RlbCk7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZShcImdyaWRcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sXCIsXCI8Z3JpZC1mb3JtPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZ28obGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICA8L3NwYW4+XFxuXFxuICAgIDxkaXY+XFxuICAgICAgICA8YWxlcnQgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBhbGVydHNcXFwiIHR5cGU9XFxcInt7YWxlcnQudHlwZX19XFxcIiBjbG9zZT1cXFwiY2xvc2VBbGVydCgkaW5kZXgpXFxcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD5cXG4gICAgPC9kaXY+XFxuICAgIDxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cXFwiZ3JpZEZvcm1cXFwiIG5nLWluaXQ9XFxcInNldEZvcm1TY29wZSh0aGlzKVxcXCJcXG4gICAgICAgICAgc2Ytc2NoZW1hPVxcXCJzY2hlbWFcXFwiIHNmLWZvcm09XFxcImZvcm1cXFwiIHNmLW1vZGVsPVxcXCJtb2RlbFxcXCJcXG4gICAgICAgICAgY2xhc3M9XFxcImZvcm0taG9yaXpvbnRhbFxcXCIgcm9sZT1cXFwiZm9ybVxcXCIgbmctaWY9XFxcImhpZGVGb3JtICE9PSB0cnVlXFxcIj5cXG4gICAgPC9mb3JtPlxcbjwvZ3JpZC1mb3JtPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLWhlYWQuaHRtbFwiLFwiPHRyPlxcbiAgICA8dGggbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IG5nLWlmPVxcXCJzb3J0RmllbGRzLmluZGV4T2YoY29sdW1uLmF0dHJpYnV0ZU5hbWUpPj0wXFxcIiBjbGFzcz1cXFwidGgtaW5uZXIgc29ydGFibGVcXFwiIG5nLWNsaWNrPVxcXCJzb3J0QnkoY29sdW1uLCAkZXZlbnQpXFxcIj57e2NvbHVtbi50aXRsZX19XFxuICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5zb3J0aW5nXFxcIiBjbGFzcz1cXFwib3JkZXJcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnZHJvcHVwXFwnOiBjb2x1bW4uc29ydGluZz09XFwnZGVzY1xcJ31cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiY2FyZXRcXFwiIHN0eWxlPVxcXCJtYXJnaW46IDBweCA1cHg7XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IG5nLWlmPVxcXCJzb3J0RmllbGRzLmluZGV4T2YoY29sdW1uLmF0dHJpYnV0ZU5hbWUpPDBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lclxcXCI+e3tjb2x1bW4udGl0bGV9fTwvZGl2PlxcbiAgICA8L3RoPlxcbjwvdHI+XFxuXCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbFwiLFwiPGdyaWQtdGFibGU+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgICAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZWRpdChsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8YWxlcnQgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBhbGVydHNcXFwiIHR5cGU9XFxcInt7YWxlcnQudHlwZX19XFxcIiBjbG9zZT1cXFwiY2xvc2VBbGVydCgkaW5kZXgpXFxcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD5cXG5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSBncmlkXFxcIj5cXG4gICAgICAgIDx0aGVhZCBncmlkLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiIGNvbHVtbnM9XFxcImNvbHVtbnNcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9ncmlkLXRhYmxlPlxcbjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9