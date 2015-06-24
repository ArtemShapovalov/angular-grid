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
            function Form(model) {
                this.setModel(model);
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
            function Table(model) {
                this.setModel(model);
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
                'gridForm',
                'grid-actions'
            ];
            return directive;
            function gridFormDirectiveCtrl($scope, gridForm, gridActions) {
                $scope.alerts = [];
                $scope.scopeForm = { gridForm: {} };
                $scope.setFormScope = function (scope) {
                    $scope.scopeForm = scope;
                };
                var formInst = new gridForm($scope.gridModel);
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
            'gridTable',
            'grid-actions'
        ];
        //TODO: should be set require ...  depends on vmsGrid
        function gridTableDirective(gridTable, gridActions) {
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
                var tableInst = new gridTable($scope.gridModel);
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
                    $scope.$broadcast('onLoadData');
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
                scope: { tableInst: '=table' },
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
                $scope.$on('onLoadData', function () {
                    $scope.columns = $scope.tableInst.columns;
                    $scope.sortFields = sorting.sortFields;
                    $scope.setSorting();
                });
                $scope.setSorting = function () {
                    var field = sorting.getColumn();
                    if (field) {
                        _.where(this.columns, { 'attributeName': field })[0].sorting = sorting.direction;
                    }
                };
                $scope.sortBy = function (column, event) {
                    column.sorting = sorting.getDirectionColumn(column.sorting);
                    $scope.tableInst.setSorting(column.attributeName, column.sorting);
                    var field = $scope.tableInst.getSortingParamByField(column.attributeName);
                    if (column.sorting) {
                        $location.search('sort', field + '_' + column.sorting);
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
            vmsGridDirectiveCtrl.$inject = ['$scope'];
            return directive;
            function vmsGridDirectiveCtrl($scope) {
                $scope.getTemplateUrl = function () {
                    if ($scope.gridModel.params.type) {
                        return 'templates/grid/form.html';
                    }
                    return 'templates/grid/table.html';
                };
            }
        }
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/form.html', '<grid-form>\n    <span ng-repeat="link in links">\n    <a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a>\n    </span>\n\n    <div>\n        <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n    </div>\n    <form novalidate name="gridForm" ng-init="setFormScope(this)"\n          sf-schema="schema" sf-form="form" sf-model="model"\n          class="form-horizontal" role="form" ng-if="hideForm !== true">\n    </form>\n</grid-form>');
                $templateCache.put('templates/grid/table-head.html', '<tr>\n    <th ng-repeat="column in columns">\n        <div ng-if="sortFields.indexOf(column.attributeName)>=0" class="th-inner sortable" ng-click="sortBy(column, $event)">{{column.title}}\n            <span ng-if="column.sorting" class="order" ng-class="{\'dropup\': column.sorting==\'desc\'}">\n                <span class="caret" style="margin: 0px 5px;"></span>\n            </span>\n        </div>\n        <div ng-if="sortFields.indexOf(column.attributeName)<0" class="th-inner">{{column.title}}</div>\n    </th>\n</tr>\n');
                $templateCache.put('templates/grid/table.html', '<grid-table>\n    <span ng-repeat="link in links">\n        <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n      </span>\n    <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n\n    <table class="table grid">\n        <thead grid-thead table="tableInst"></thead>\n        <tbody>\n            <tr ng-repeat="row in rows">\n                <td ng-repeat="column in columns">\n                    <span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>\n                    <span ng-if="column.attributeName == \'links\'">\n                        <span ng-repeat="link in row.links">\n                            <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n                        </span>\n                    </span>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</grid-table>\n<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>');
            }
        ]);
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10aGVhZC5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJmYWN0b3J5IiwibG9kYXNoIiwiZ3JpZEZvcm0iLCIkaW5qZWN0IiwiZ3JpZEVudGl0eSIsIiR0aW1lb3V0IiwiJGludGVydmFsIiwiXyIsIkZvcm0iLCJtb2RlbCIsInNldE1vZGVsIiwiZm9ybSIsInNjaGVtYSIsImxpbmtzIiwiZXh0ZW5kIiwicHJvdG90eXBlIiwiZ2V0Rm9ybUluZm8iLCJnZXRDb25maWciLCJfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9maWVsZHNUb0Zvcm1Gb3JtYXQiLCJfZ2V0RW1wdHlEYXRhIiwiX2dldEZvcm1CdXR0b25CeVNjaGVtYSIsInNlbGYiLCJjYWxsYmFjayIsImdldE1vZGVsIiwidXJsIiwiZ2V0UmVzb3VyY2VVcmwiLCJwYXJhbXMiLCJmZXRjaERhdGEiLCJmZXRjaERhdGFTdWNjZXNzIiwiZGF0YSIsIm5ld0RhdGEiLCJwcm9wZXJ0eSIsInNjaGVtYVdpdGhvdXRSZWYiLCJtZXJnZVJlbFNjaGVtYSIsInNjaGVtYXMiLCJ2YWx1ZSIsInR5cGUiLCJUWVBFX0ZPUk0iLCJmaWVsZHMiLCJyZWxhdGlvbnMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJfcmVwbGFjZUZyb21GdWxsIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiaWQiLCJyZWxhdGlvbk5hbWUiLCJmZXRjaENvbGxlY3Rpb24iLCJyZXNvdXJjZXMiLCJuYW1lIiwiZnVsbFNjaGVtYSIsImNsb25lIiwiZ2V0VHlwZVByb3BlcnR5IiwidG1wT2JqIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInNlYXJjaFBhcmFtcyIsInBvcyIsImluZGV4T2YiLCJjaGFpbiIsInNsaWNlIiwic3BsaXQiLCJjb21wYWN0Iiwib2JqZWN0Iiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJrIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGFnZUNvdW50IiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0IiwiZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCIsIl9nZXRSb3dzQnlEYXRhIiwiVFlQRV9UQUJMRSIsInJlbCIsImZpZWxkTmFtZSIsInJvdyIsInJvd1Jlc3VsdCIsImZvck93biIsInJlcyIsInRtcFJvdyIsInByb3ZpZGVyIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsImJ5U3RyaW5nIiwic3Vic3RyaW5nIiwicmVsSXRlbSIsInJlbEtleSIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zIiwicm93c1JlbGF0aW9uc2hpcHMiLCJrUm93Iiwia1JlbCIsImtSZWxJdGVtIiwicGF0aCIsInJlcGxhY2UiLCJhIiwiaSIsImxlbmd0aCIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0Iiwic2VhcmNoIiwicGFnZSIsInNldFNvcnRpbmdCeVNlYXJjaCIsInNldFBhZ2luYXRpb24iLCJ0b3RhbEl0ZW1zIiwiaXRlbXNQZXJQYWdlIiwicGFnZUNoYW5nZWQiLCJwYWdlTm8iLCJsYXN0SW5kZXhPZiIsImdyaWRUaGVhZERpcmVjdGl2ZSIsInJlcXVpcmUiLCJ0ZW1wbGF0ZVVybCIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsIiRvbiIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwiZXZlbnQiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFB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LFFBQUEsQ0FBQSxDQWJBO0FBQUEsWUFlQSxPQUFBMlEsU0FBQSxDQWZBO0FBQUEsWUFpQkEsU0FBQXdDLG9CQUFBLENBQUFuQyxNQUFBLEVBQUE7QUFBQSxnQkFDQUEsTUFBQSxDQUFBc0MsY0FBQSxHQUFBLFlBQUE7QUFBQSxvQkFDQSxJQUFBdEMsTUFBQSxDQUFBRyxTQUFBLENBQUF4UCxNQUFBLENBQUFVLElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBN0MsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBOFQsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDJCQUFBLEVBQUEsNG5DQUFBLEVBRkE7QUFBQSxhQUFBO0FBQUEsU0FBQSxFIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJyRpbnRlcnZhbCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoRm9ybS5wcm90b3R5cGUsIHtcbiAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9uczogX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgIF9maWVsZHNUb0Zvcm1Gb3JtYXQ6IF9maWVsZHNUb0Zvcm1Gb3JtYXQsXG4gICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hOiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hXG4gIH0sIGdyaWRFbnRpdHkpO1xuXG4gIHJldHVybiBGb3JtO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZvcm06IHNlbGYuZm9ybSxcbiAgICAgIG1vZGVsOiBzZWxmLm1vZGVsLFxuICAgICAgc2NoZW1hOiBzZWxmLnNjaGVtYSxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgIHVybDtcblxuICAgIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfRk9STTtcblxuICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMsIHJlbGF0aW9ucykge1xuXG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgICBzZWxmLmZvcm0gPSBfLnVuaW9uKHNlbGYuZm9ybSwgc2VsZi5fZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pXG5cbiAgICB9XG5cbiAgfVxuXG5cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pO1xuICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICBpZiAodGl0bGVNYXBzW2tleV0pIHtcbiAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKG9iailcbiAgICAgIH0pO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmllbGRzO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhLnByb3BlcnR5KCdkYXRhJykpKTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIG93bjogZmllbGRzLFxuICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgdmFyIGRvY3VtZW50U2NoZW1hID0gZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFSZWxhdGlvbnMucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG4gICAgICB2YXIgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiA9IHNlbGYuX3JlcGxhY2VGcm9tRnVsbChkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBkb2N1bWVudFNjaGVtYSlbJ3Byb3BlcnRpZXMnXVtrZXldO1xuXG4gICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcyAmJiBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bVxuICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bVxuICAgICAgfVxuXG4gICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHJlc291cmNlTGluaywge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGVudW1JdGVtfSk7XG5cbiAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICByZWxhdGlvbk5hbWU6IGtleSxcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBhdHRyaWJ1dGVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHJldHVybiBzb3VyY2VUaXRsZU1hcHM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRpdGxlTWFwIGZvciBmb3JtIGFuZCBsb2FkIGRlcGVuZGVuY3kgcmVzb3VyY2VcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbiAoaXRlbSkge1xuXG4gICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVxuICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSk7XG5cbiAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2hcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcz49MCkge1xuICAgICAgLy8gUmVtb3ZlIHRoZSAnPycgYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgYW5kIHNwbGl0IG91dCBlYWNoIGFzc2lnbm1lbnRcbiAgICAgIHNlYXJjaFBhcmFtcyA9IF8uY2hhaW4oIHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSApXG4gICAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgICAgLm1hcChmdW5jdGlvbihpdGVtKSB7IGlmIChpdGVtKSByZXR1cm4gaXRlbS5zcGxpdCgnPScpOyB9KVxuICAgICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgICAvLyBUdXJuIFtrZXksIHZhbHVlXSBhcnJheXMgaW50byBvYmplY3QgcGFyYW1ldGVyc1xuICAgICAgICAgIC5vYmplY3QoKVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAgIC52YWx1ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWFyY2hQYXJhbXMgfHwge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcykge1xuICAgIHZhciBzZWFyY2hQYXRoO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICBpZiAocG9zPj0wKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nK3NlYXJjaFBhdGg6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICB0aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlVXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW29mZnNldF0nXSA9IHRoaXMuZ2V0T2Zmc2V0KCk7XG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tsaW1pdF0nXSA9IHRoaXMuZ2V0UGVyUGFnZSgpO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdTb3J0aW5nJywgc29ydGluZ1Nydik7XG5zb3J0aW5nU3J2LiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBzb3J0aW5nU3J2KEhlbHBlciwgXykge1xuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gU29ydGluZygpIHtcbiAgICB0aGlzLnNvcnRQYXJhbSA9ICdzb3J0JztcbiAgfVxuXG4gIFNvcnRpbmcuRElSRUNUSU9OX0FTQyA9ICdhc2MnO1xuICBTb3J0aW5nLkRJUkVDVElPTl9ERVNDID0gJ2Rlc2MnO1xuICBTb3J0aW5nLmZpZWxkID0gdW5kZWZpbmVkO1xuICBTb3J0aW5nLmRpcmVjdGlvbiA9ICcnO1xuICBTb3J0aW5nLnNvcnRGaWVsZHMgPSBbXTtcblxuICBhbmd1bGFyLmV4dGVuZChTb3J0aW5nLnByb3RvdHlwZSwge1xuICAgIGdldENvbHVtbjogZ2V0Q29sdW1uLFxuICAgIGdldERpcmVjdGlvbkNvbHVtbjogZ2V0RGlyZWN0aW9uQ29sdW1uLFxuICAgIHNldFNvcnRGaWVsZHM6IHNldFNvcnRGaWVsZHMsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBnZXRVcmw6IGdldFVybFxuICB9KTtcblxuICByZXR1cm4gU29ydGluZztcblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXREaXJlY3Rpb25Db2x1bW5cbiAgICogQHBhcmFtIGN1cnJlbnREaXJlY3Rpb25cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXREaXJlY3Rpb25Db2x1bW4oY3VycmVudERpcmVjdGlvbikge1xuICAgIGlmICghY3VycmVudERpcmVjdGlvbikge1xuICAgICAgcmV0dXJuICdhc2MnO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudERpcmVjdGlvbiA9PSAnYXNjJyA/ICdkZXNjJyA6ICcnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb2x1bW4gZm9yIGZpZWxkIGlmIGZpZWxkIGhhdmUgJy4nIHRoZW4gZ2V0IGZpcnN0IHBhcnRcbiAgICogRm9yIGV4YW1wbGU6ICd1c2VyLm5hbWUnIHJldHVybiAndXNlcidcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRDb2x1bW5cbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ3x1bmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW4oKSB7XG4gICAgaWYgKHRoaXMuZmllbGQpIHtcbiAgICAgIGlmICh0aGlzLmZpZWxkLmluZGV4T2YoJy4nKT49MCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWVsZC5zbGljZSgwLCB0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmZpZWxkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0aW5nXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmZpZWxkID0gZmllbGQ7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0RmllbGRzXG4gICAqIEBwYXJhbSBmaWVsZHNcbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRGaWVsZHMoZmllbGRzKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBpZiAoIXRoaXMuZmllbGQpIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnNvcnRQYXJhbSArICdbJysgdGhpcy5maWVsZCArJ10nXSA9IHRoaXMuZGlyZWN0aW9uO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRQYWdpbmF0aW9uJywgJ1NvcnRpbmcnLCAnJHRpbWVvdXQnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFRhYmxlKGdyaWRFbnRpdHksIGdyaWRQYWdpbmF0aW9uLCBTb3J0aW5nLCAkdGltZW91dCwgXykge1xuXG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBUYWJsZShtb2RlbCkge1xuXG4gICAgdGhpcy5zZXRNb2RlbChtb2RlbCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRQYWdpbmF0aW9ufVxuICAgICAqL1xuICAgIHRoaXMucGFnaW5hdGlvbiA9IG5ldyBncmlkUGFnaW5hdGlvbigpLFxuICAgIC8qKlxuICAgICAqIEB0eXBlIHtTb3J0aW5nfVxuICAgICAqL1xuICAgIHRoaXMuc29ydGluZyA9IG5ldyBTb3J0aW5nKCksXG4gICAgdGhpcy5yb3dzID0gW107XG4gICAgdGhpcy5jb2x1bW5zID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGFcbiAgfSwgZ3JpZEVudGl0eSk7XG5cbiAgcmV0dXJuIFRhYmxlO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvd3M6IHNlbGYucm93cyxcbiAgICAgIGNvbHVtbnM6IHNlbGYuY29sdW1ucyxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5wYWdpbmF0aW9uLnNldFRvdGFsQ291bnQoZGF0YS5wcm9wZXJ0eSgnbWV0YScpLnByb3BlcnR5VmFsdWUoJ3RvdGFsJykpO1xuXG4gICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfVEFCTEU7XG5cbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpO1xuXG4gICAgICAgIHNlbGYuc29ydGluZy5zZXRTb3J0RmllbGRzKF8ubWFwKHNlbGYuY29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICAgICAgc2VsZi5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgZmllbGQgPSB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpO1xuICAgIHRoaXMuc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pXG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgVGFibGUjZ2V0U29ydGluZ1BhcmFtQnlGaWVsZFxuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZpZWxkO1xuICAgIHZhciByZWwgPSB0aGlzLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoZmllbGQpO1xuXG4gICAgaWYgKHJlbC52YWx1ZSgpKSB7XG4gICAgICB2YXIgZmllbGROYW1lID0gcmVsLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCkubmFtZTtcbiAgICAgIHJlc3VsdCArPSAnLicrZmllbGROYW1lO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWFcbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgIF8uZm9yRWFjaChjb2x1bW5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICBpZiAoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzKSB7XG4gICAgIHJlbGF0aW9uc2hpcHMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMucHJvcGVydGllcztcbiAgICAgfVxuICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgIH0pOyovXG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgdmFyIGRhdGEgPSByb3cub3duO1xuICAgICAgdmFyIHJvd1Jlc3VsdCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocm93LnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgcm93UmVzdWx0W2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgICAgIC8qKiBuYW1lIGFkZGl0aW9uYWwgZmllbGQocmVsYXRpb24gcm93KSAqL1xuICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICB9KTtcblxuICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgcm93UmVzdWx0LmxpbmtzLnB1c2gobGluayk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICB9XG5cbn1cblxuXG5cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldCgkdGltZW91dCwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIFRZUEVfRk9STTogJ2Zvcm0nLFxuICAgICAgVFlQRV9UQUJMRTogJ3RhYmxlJyxcbiAgICAgIHR5cGU6ICcnLFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBpZiAobW9kZWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGVydCgnUGxlYXNlIHNldCBtb2RlbCBiZWZvcmUgY2FsbCBmZXRjaCBkYXRhJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24gKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbiAoalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLmRhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBPYmplY3QuYnlTdHJpbmcoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbnM7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgIGlmIChyZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykudmFsdWUoKSkge1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihyZWxJdGVtLCByZWxLZXkpIHtcbiAgICAgICAgICByZXN1bHRbcmVsS2V5XSA9IHNlbGYuX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmsgZnJvbSByZWxhdGlvbiBmb3IgbG9hZCByZXNvdXJjZSBkYXRhXG4gICAgICpcbiAgICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICAgKiBAcGFyYW0gcmVsSXRlbVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXNvdXJjZSA9IFtdO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgIHZhciBsaW5rQXJyYXkgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbEl0ZW0uZGF0YSwgZnVuY3Rpb24oZGF0YU9iaikge1xuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBkYXRhT2JqLmlkfSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc291cmNlID0gbGlua0FycmF5O1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvdXJjZSA9IFt7XG4gICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXSA9IHJlc3VsdFtrUm93XVtrUmVsXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn1cblxuT2JqZWN0LmJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHZhciBrID0gYVtpXTtcbiAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgIG9iaiA9IG9ialtrXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSBvYmouVFlQRV9UQUJMRSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmoudHlwZSA9PT0gb2JqLlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZEZvcm0nLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRm9ybSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGUgPSBmdW5jdGlvbihzY29wZSkge1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICB2YXIgZm9ybUluc3QgPSBuZXcgZ3JpZEZvcm0oJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICBmb3JtSW5zdC5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFRhYmxlfVxuICAgICAqL1xuICAgIHZhciB0YWJsZUluc3QgPSBuZXcgZ3JpZFRhYmxlKCRzY29wZS5ncmlkTW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9IHRhYmxlSW5zdC5wYWdpbmF0aW9uO1xuXG4gICAgJHNjb3BlLnRhYmxlSW5zdCA9IHRhYmxlSW5zdDtcblxuICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuXG4gICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcblxuICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdvbkxvYWREYXRhJyk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldFBhZ2luYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS50b3RhbEl0ZW1zID0gcGFnaW5hdGlvbi5nZXRUb3RhbENvdW50KCk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkc2NvcGUuaXRlbXNQZXJQYWdlID0gcGFnaW5hdGlvbi5nZXRQZXJQYWdlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5wYWdlQ2hhbmdlZCA9IGZ1bmN0aW9uKHBhZ2VObykge1xuICAgICAgcGFnaW5hdGlvbi5zZXRDdXJyZW50UGFnZShwYWdlTm8pO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJGxvY2F0aW9uLnNlYXJjaCgncGFnZScsIHBhZ2VObyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gdGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAgIGlmICghZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgcG9zID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5sYXN0SW5kZXhPZignXycpO1xuICAgICAgdmFyIGZpZWxkID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZSgwLCBwb3MpO1xuICAgICAgdmFyIGRpcmVjdGlvbiA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UocG9zICsgMSk7XG5cbiAgICAgIHNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKTtcbiAgICB9XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGhlYWQnLCBncmlkVGhlYWREaXJlY3RpdmUpO1xuXG5ncmlkVGhlYWREaXJlY3RpdmUuJGluamVjdCA9IFtdO1xuXG5mdW5jdGlvbiBncmlkVGhlYWREaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICBzY29wZToge1xuICAgICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgICB9LFxuICAgICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUaGVhZEN0cmwsXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHIpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICAgIH1cbiAgfTtcblxuICBncmlkVGhlYWRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUaGVhZEN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7U29ydGluZ30gKi9cbiAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5jb2x1bW5zID0gJHNjb3BlLnRhYmxlSW5zdC5jb2x1bW5zO1xuICAgICAgJHNjb3BlLnNvcnRGaWVsZHMgPSBzb3J0aW5nLnNvcnRGaWVsZHM7XG4gICAgICAkc2NvcGUuc2V0U29ydGluZygpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFNvcnRpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmaWVsZCA9IHNvcnRpbmcuZ2V0Q29sdW1uKCk7XG5cbiAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICBfLndoZXJlKHRoaXMuY29sdW1ucywgeydhdHRyaWJ1dGVOYW1lJzogZmllbGR9KVswXS5zb3J0aW5nID0gc29ydGluZy5kaXJlY3Rpb247XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zb3J0QnkgPSBmdW5jdGlvbihjb2x1bW4sIGV2ZW50KSB7XG5cbiAgICAgIGNvbHVtbi5zb3J0aW5nID0gc29ydGluZy5nZXREaXJlY3Rpb25Db2x1bW4oY29sdW1uLnNvcnRpbmcpO1xuXG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGNvbHVtbi5zb3J0aW5nKTtcblxuICAgICAgdmFyIGZpZWxkID0gJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTtcblxuICAgICAgaWYgKGNvbHVtbi5zb3J0aW5nKSB7XG4gICAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCBmaWVsZCArJ18nKyBjb2x1bW4uc29ydGluZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgbnVsbCk7XG4gICAgICB9XG5cbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgZ3JpZC10aGVhZCB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L3RoZWFkPlxcbiAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciBuZy1yZXBlYXQ9XFxcInJvdyBpbiByb3dzXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1xcXCI+e3tyb3dbY29sdW1uLmF0dHJpYnV0ZU5hbWVdfX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgPT0gXFwnbGlua3NcXCdcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiByb3cubGlua3NcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZWRpdChsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZ3JpZC10YWJsZT5cXG48cGFnaW5hdGlvbiBuZy1pZj1cXFwicm93c1xcXCIgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCIgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiIGl0ZW1zLXBlci1wYWdlPVxcXCJpdGVtc1BlclBhZ2VcXFwiIHRvdGFsLWl0ZW1zPVxcXCJ0b3RhbEl0ZW1zXFxcIiBuZy1tb2RlbD1cXFwiY3VycmVudFBhZ2VcXFwiIG5nLWNoYW5nZT1cXFwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXFxcIj48L3BhZ2luYXRpb24+XCIpO31dKTsiXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==