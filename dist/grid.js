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
            '_'
        ];
        function gridForm(gridEntity, $timeout, _) {
            function Form(model) {
                this.setModel(model);
                this.form = [];
                this.model = {};
                this.schema = {};
                this.links = {};
            }
            Form.prototype = new gridEntity();
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
            });
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
                var self = this;
                var model = self.getModel();
                var url;
                url = self.getResourceUrl(model.url, model.params);
                $timeout(function () {
                    self.fetchData(url, fetchDataSuccess);
                });
                function fetchDataSuccess(data, schema) {
                    var newData = data.property('data').property('attributes');
                    var schemaWithoutRef = self.mergeRelSchema(newData.schemas()[0].data.value(), schema);
                    self._getFieldsForm(data, function (fields) {
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
                setLocationSearch: setLocationSearch,
                strToObject: strToObject
            };
            return factory;
            function strToObject(obj, path) {
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
            }
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
                //this.pageCount = 0;
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
                this.pagination = new gridPagination();
                /**
     * @type {Sorting}
     */
                this.sorting = new Sorting();
                this.rows = [];
                this.columns = {};
                this.links = {};
            }
            Table.prototype = new gridEntity();
            angular.extend(Table.prototype, {
                getConfig: getConfig,
                getTableInfo: getTableInfo,
                getColumnsBySchema: getColumnsBySchema,
                rowsToTableFormat: rowsToTableFormat,
                getSortingParamByField: getSortingParamByField,
                getSortingParamValue: getSortingParamValue,
                setSorting: setSorting,
                _getRowsByData: _getRowsByData
            });
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
                var self = this;
                var model = self.getModel();
                var url;
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
   * Get value for GET sorting param
   * @returns {*}
   */
            function getSortingParamValue() {
                if (this.sorting.direction) {
                    return this.getSortingParamByField(this.sorting.field) + '_' + this.sorting.direction;
                }
                return null;
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
                'Helper',
                '$interval',
                '_'
            ];
            return provider;
            function gridEntityGet(Helper, $interval, _) {
                var model;
                var messages = {
                    successDeleted: 'Successfully delete',
                    successCreated: 'Successfully create',
                    successUpdated: 'Successfully update',
                    serverError: 'Oops! server error'
                };
                /**
     * @class
     * @constructor
     */
                function Entity() {
                }
                /**
     * Jsonary data object
     *
     * @type {Jsonary}
     */
                this.data = {};
                angular.extend(Entity.prototype, {
                    default: { actionGetResource: 'read' },
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
                });
                return Entity;
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
                                haystack[key] = Helper.strToObject(schemaFull, haystack[key].$ref.substring(2));
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
        angular.module('grid').factory('grid-action-create', gridActionCreate);
        gridActionCreate.$inject = ['$http'];
        function gridActionCreate($http) {
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
            'gridTable',
            'gridForm'
        ];
        function gridActionDelete($http, gridTable, gridForm) {
            return function (obj, link, scope) {
                var params = {
                    method: link.method,
                    url: link.href
                };
                $http(params).then(actionDeleteSuccess, actionDeleteError);
                function actionDeleteSuccess() {
                    if (obj instanceof gridTable) {
                        obj.getTableInfo(function (table) {
                            scope.rows = table.rows;
                            scope.columns = table.columns;
                            scope.links = table.links;
                        });
                    } else if (obj instanceof gridForm) {
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
        function gridTableDirective(gridTable, gridActions) {
            var directive = {
                restrict: 'E',
                controller: gridTableDirectiveCtrl
            };
            gridTableDirectiveCtrl.$inject = [
                '$timeout',
                '$scope'
            ];
            return directive;
            function gridTableDirectiveCtrl($timeout, $scope) {
                /** @type {gridTable} */
                var tableInst = new gridTable($scope.gridModel);
                $scope.alerts = [];
                $scope.tableInst = tableInst;
                $timeout(function () {
                    $scope.$broadcast('onBeforeLoadData');
                    tableInst.getTableInfo(function (table) {
                        $scope.rows = table.rows;
                        $scope.columns = table.columns;
                        $scope.links = table.links;
                        $scope.$broadcast('onLoadData');
                    });
                });
                $scope.edit = function (link) {
                    gridActions.action(tableInst, link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
            }
        }
        angular.module('grid').directive('tablePagination', tablePaginationDirective);
        tablePaginationDirective.$inject = [];
        function tablePaginationDirective() {
            var directive = {
                scope: { tableInst: '=table' },
                require: '^gridTable',
                templateUrl: 'templates/grid/table-pagination.html',
                restrict: 'A',
                controller: tablePaginationCtrl
            };
            tablePaginationCtrl.$inject = [
                '$scope',
                '$location'
            ];
            return directive;
            function tablePaginationCtrl($scope, $location) {
                /** @type {gridPagination} */
                var pagination = $scope.tableInst.pagination;
                $scope.$on('onBeforeLoadData', function () {
                    pagination.setCurrentPage($location.search().page);
                });
                $scope.$on('onLoadData', function () {
                    $scope.show = true;
                    $scope.setPagination();
                });
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
        angular.module('grid').directive('tableThead', gridTheadDirective);
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
                $scope.$on('onBeforeLoadData', function () {
                    console.log('sorting before load');
                    setSortingBySearch($location.search());
                });
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
                $scope.sortBy = function (column) {
                    var direction;
                    column.sorting = direction = sorting.getDirectionColumn(column.sorting);
                    $scope.tableInst.setSorting(column.attributeName, direction);
                    $location.search('sort', $scope.tableInst.getSortingParamValue());
                };
                function setSortingBySearch(fields) {
                    var sorting = $scope.tableInst.sorting;
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
                $templateCache.put('templates/grid/table-pagination.html', '<pagination ng-if="show" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>\n');
                $templateCache.put('templates/grid/table.html', '<grid-table>\n    <span ng-repeat="link in links">\n        <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n      </span>\n    <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n\n    <table class="table grid">\n        <thead table-thead table="tableInst"></thead>\n        <tbody>\n            <tr ng-repeat="row in rows">\n                <td ng-repeat="column in columns">\n                    <span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>\n                    <span ng-if="column.attributeName == \'links\'">\n                        <span ng-repeat="link in row.links">\n                            <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n                        </span>\n                    </span>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n    <div table-pagination table="tableInst"></div>\n</grid-table>\n\n<!--<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>-->');
            }
        ]);
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJuZXdEYXRhIiwicHJvcGVydHkiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJzY2hlbWFzIiwidmFsdWUiLCJmaWVsZHMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsInJlbGF0aW9ucyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJfcmVwbGFjZUZyb21GdWxsIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiZmV0Y2hDb2xsZWN0aW9uIiwicmVzb3VyY2VzIiwibmFtZSIsImZ1bGxTY2hlbWEiLCJjbG9uZSIsImdldFR5cGVQcm9wZXJ0eSIsInRtcE9iaiIsInRpdGxlIiwibGluayIsIm9uQ2xpY2siLCJoZWxwZXJTcnYiLCJwYXJzZUxvY2F0aW9uU2VhcmNoIiwic2V0TG9jYXRpb25TZWFyY2giLCJzdHJUb09iamVjdCIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJpbmRleE9mIiwiY2hhaW4iLCJzbGljZSIsImNvbXBhY3QiLCJvYmplY3QiLCJzZWFyY2hQYXRoIiwiT2JqZWN0Iiwia2V5cyIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJncmlkUGFnaW5hdGlvbiIsIkhlbHBlciIsIlBhZ2luYXRpb24iLCJwYWdlUGFyYW0iLCJjdXJyZW50UGFnZSIsInBlclBhZ2UiLCJ0b3RhbENvdW50IiwiZ2V0UGFnZVBhcmFtIiwic2V0VG90YWxDb3VudCIsImdldFRvdGFsQ291bnQiLCJzZXRQZXJQYWdlIiwiZ2V0UGVyUGFnZSIsImdldFBhZ2VDb3VudCIsInNldEN1cnJlbnRQYWdlIiwiZ2V0Q3VycmVudFBhZ2UiLCJnZXRPZmZzZXQiLCJnZXRQYWdlVXJsIiwidG90YWxQYWdlcyIsIk1hdGgiLCJjZWlsIiwibWF4Iiwic29ydGluZ1NydiIsIlNvcnRpbmciLCJzb3J0UGFyYW0iLCJESVJFQ1RJT05fQVNDIiwiRElSRUNUSU9OX0RFU0MiLCJmaWVsZCIsImRpcmVjdGlvbiIsInNvcnRGaWVsZHMiLCJnZXRDb2x1bW4iLCJnZXREaXJlY3Rpb25Db2x1bW4iLCJzZXRTb3J0RmllbGRzIiwic2V0U29ydGluZyIsImdldFVybCIsImN1cnJlbnREaXJlY3Rpb24iLCJncmlkVGFibGUiLCJUYWJsZSIsInBhZ2luYXRpb24iLCJzb3J0aW5nIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJnZXRTb3J0aW5nUGFyYW1WYWx1ZSIsIl9nZXRSb3dzQnlEYXRhIiwicmVsIiwiZmllbGROYW1lIiwicm93Iiwicm93UmVzdWx0IiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsIl9nZXRSZWxhdGlvbkxpbmsiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEs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UEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQWFBRixvQkFBQSxDQUFBclQsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBYkE7QUFBQSxZQWVBLE9BQUF5USxTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBNEMsb0JBQUEsQ0FBQXZDLE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUEwQyxjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUExQyxNQUFBLENBQUFHLFNBQUEsQ0FBQXZQLE1BQUEsQ0FBQXdELElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBMUYsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBZ1UsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDByQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnM6IF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMsXG4gICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgIF9nZXRGaWVsZHNGb3JtOiBfZ2V0RmllbGRzRm9ybSxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgX2dldEZvcm1CdXR0b25CeVNjaGVtYTogX2dldEZvcm1CdXR0b25CeVNjaGVtYVxuICB9KTtcblxuICByZXR1cm4gRm9ybTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBmb3JtOiBzZWxmLmZvcm0sXG4gICAgICBtb2RlbDogc2VsZi5tb2RlbCxcbiAgICAgIHNjaGVtYTogc2VsZi5zY2hlbWEsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSlcblxuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHJlc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICB9KTtcbiAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKFxuICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgKS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgdmFyIGRhdGFSZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgdmFyIGRhdGFBdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuXG4gICAgdmFyIHJlbGF0aW9ucyA9IGRhdGFSZWxhdGlvbnMudmFsdWUoKTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICB2YXIgZG9jdW1lbnRTY2hlbWEgPSBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgIHZhciByZXNvdXJjZUxpbmsgPSBpdGVtLmxpbmtzLnNlbGY7XG4gICAgICAvKiogZ2V0IG5hbWUgZnJvbSBzY2hlbWEgKi9cbiAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmID0gc2VsZi5fcmVwbGFjZUZyb21GdWxsKFxuICAgICAgICBkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkb2N1bWVudFNjaGVtYVxuICAgICAgKVsncHJvcGVydGllcyddW2tleV07XG5cbiAgICAgIHZhciBzb3VyY2VFbnVtID0ge307XG5cbiAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtXG4gICAgICB9IGVsc2UgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICB9XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbihlbnVtSXRlbSkge1xuICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChyZXNvdXJjZUxpbmssIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBlbnVtSXRlbX0pO1xuXG4gICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgcmVsYXRpb25OYW1lOiBrZXksXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICB9KVxuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlVGl0bGVNYXBzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKVxuICAgICAgICAgICAgLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hXG4gICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgIHJlc3VsdCA9IF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzKTtcbiAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KFxuICAgICAgXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcylcbiAgICApO1xuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbih1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykpXG4gICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgIC5vYmplY3QoKVxuICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JyArIHNlYXJjaFBhdGggOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlVXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW29mZnNldF0nXSA9IHRoaXMuZ2V0T2Zmc2V0KCk7XG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tsaW1pdF0nXSA9IHRoaXMuZ2V0UGVyUGFnZSgpO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ1NvcnRpbmcnLCBzb3J0aW5nU3J2KTtcbnNvcnRpbmdTcnYuJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIHNvcnRpbmdTcnYoSGVscGVyLCBfKSB7XG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpID49IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldFVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgaWYgKCF0aGlzLmZpZWxkKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5zb3J0UGFyYW0gKyAnWycgKyB0aGlzLmZpZWxkICsgJ10nXSA9IHRoaXMuZGlyZWN0aW9uO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZSk7XG5ncmlkVGFibGUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFBhZ2luYXRpb24nLCAnU29ydGluZycsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgZ3JpZFBhZ2luYXRpb24sIFNvcnRpbmcsICR0aW1lb3V0LCBfKSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFRhYmxlKG1vZGVsKSB7XG5cbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdGhpcy5wYWdpbmF0aW9uID0gbmV3IGdyaWRQYWdpbmF0aW9uKCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge1NvcnRpbmd9XG4gICAgICovXG4gICAgdGhpcy5zb3J0aW5nID0gbmV3IFNvcnRpbmcoKTtcbiAgICB0aGlzLnJvd3MgPSBbXTtcbiAgICB0aGlzLmNvbHVtbnMgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBUYWJsZS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFRhYmxlLnByb3RvdHlwZSwge1xuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIGdldFNvcnRpbmdQYXJhbVZhbHVlOiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YVxuICB9KTtcblxuICByZXR1cm4gVGFibGU7XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcm93czogc2VsZi5yb3dzLFxuICAgICAgY29sdW1uczogc2VsZi5jb2x1bW5zLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpO1xuICAgIHZhciB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5wYWdpbmF0aW9uLnNldFRvdGFsQ291bnQoZGF0YS5wcm9wZXJ0eSgnbWV0YScpLnByb3BlcnR5VmFsdWUoJ3RvdGFsJykpO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgdmFyIGZpZWxkTmFtZSA9IHJlbC5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLm5hbWU7XG4gICAgICByZXN1bHQgKz0gJy4nICsgZmllbGROYW1lO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHZhbHVlIGZvciBHRVQgc29ydGluZyBwYXJhbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvcnRpbmdQYXJhbVZhbHVlKCkge1xuICAgIGlmICh0aGlzLnNvcnRpbmcuZGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKHRoaXMuc29ydGluZy5maWVsZCkgKyAnXycgKyB0aGlzLnNvcnRpbmcuZGlyZWN0aW9uXG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICAvKipcbiAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWFcbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgIF8uZm9yRWFjaChjb2x1bW5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICBpZiAoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzKSB7XG4gICAgIHJlbGF0aW9uc2hpcHMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMucHJvcGVydGllcztcbiAgICAgfVxuICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgIH0pOyovXG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgdmFyIGRhdGEgPSByb3cub3duO1xuICAgICAgdmFyIHJvd1Jlc3VsdCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocm93LnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgcm93UmVzdWx0W2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgICAgIC8qKiBuYW1lIGFkZGl0aW9uYWwgZmllbGQocmVsYXRpb24gcm93KSAqL1xuICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICB9KTtcblxuICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgcm93UmVzdWx0LmxpbmtzLnB1c2gobGluayk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICB9XG5cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWydIZWxwZXInLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldChIZWxwZXIsICRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbDtcbiAgICB2YXIgbWVzc2FnZXMgPSB7XG4gICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQGNsYXNzXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gRW50aXR5KCkge1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSnNvbmFyeSBkYXRhIG9iamVjdFxuICAgICAqXG4gICAgICogQHR5cGUge0pzb25hcnl9XG4gICAgICovXG4gICAgdGhpcy5kYXRhID0ge307XG5cbiAgICBhbmd1bGFyLmV4dGVuZChFbnRpdHkucHJvdG90eXBlLCB7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBjb25maWc6IHt9LFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gICAgICBmZXRjaERhdGE6IGZldGNoRGF0YSxcbiAgICAgIGZldGNoQ29sbGVjdGlvbjogZmV0Y2hDb2xsZWN0aW9uLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFJlc291cmNlVXJsOiBnZXRSZXNvdXJjZVVybCxcbiAgICAgIG1lcmdlUmVsU2NoZW1hOiBtZXJnZVJlbFNjaGVtYSxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfSk7XG5cbiAgICByZXR1cm4gRW50aXR5O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1cmwgYnkgcGFyYW1zIGZvciBsb2FkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24oakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uICh1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24gKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICB9XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZFRhYmxlJywgJ2dyaWRGb3JtJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkVGFibGUsIGdyaWRGb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBncmlkVGFibGUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBncmlkRm9ybSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkRm9ybScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRGb3JtLCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIHZhciBmb3JtSW5zdCA9IG5ldyBncmlkRm9ybSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkdGltZW91dCwgJHNjb3BlKSB7XG4gICAgLyoqIEB0eXBlIHtncmlkVGFibGV9ICovXG4gICAgdmFyIHRhYmxlSW5zdCA9IG5ldyBncmlkVGFibGUoJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG4gICAgJHNjb3BlLnRhYmxlSW5zdCA9IHRhYmxlSW5zdDtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uQmVmb3JlTG9hZERhdGEnKTtcblxuICAgICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uTG9hZERhdGEnKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlUGFnaW5hdGlvbicsIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSk7XG5cbnRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtcGFnaW5hdGlvbi5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IHRhYmxlUGFnaW5hdGlvbkN0cmxcbiAgfTtcblxuICB0YWJsZVBhZ2luYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259ICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSAkc2NvcGUudGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRUaGVhZEN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHIpIHtcbiAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3NvcnRpbmcgYmVmb3JlIGxvYWQnKTtcbiAgICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSAkc2NvcGUudGFibGVJbnN0LmNvbHVtbnM7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkcyA9IHNvcnRpbmcuc29ydEZpZWxkcztcbiAgICAgICRzY29wZS5zZXRTb3J0aW5nKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZpZWxkID0gc29ydGluZy5nZXRDb2x1bW4oKTtcblxuICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgIF8ud2hlcmUodGhpcy5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgdmFyIGRpcmVjdGlvbjtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBkaXJlY3Rpb24gPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGRpcmVjdGlvbik7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1WYWx1ZSgpKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWxcIixcIjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJzaG93XFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIHRhYmxlLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxkaXYgdGFibGUtcGFnaW5hdGlvbiB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L2Rpdj5cXG48L2dyaWQtdGFibGU+XFxuXFxuPCEtLTxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj4tLT5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9