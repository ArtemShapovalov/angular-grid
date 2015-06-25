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
                var self = this, model = self.getModel(), url;
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
                var model, messages = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJuZXdEYXRhIiwicHJvcGVydHkiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJzY2hlbWFzIiwidmFsdWUiLCJmaWVsZHMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsInJlbGF0aW9ucyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJfcmVwbGFjZUZyb21GdWxsIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiZmV0Y2hDb2xsZWN0aW9uIiwicmVzb3VyY2VzIiwibmFtZSIsImZ1bGxTY2hlbWEiLCJjbG9uZSIsImdldFR5cGVQcm9wZXJ0eSIsInRtcE9iaiIsInRpdGxlIiwibGluayIsIm9uQ2xpY2siLCJoZWxwZXJTcnYiLCJwYXJzZUxvY2F0aW9uU2VhcmNoIiwic2V0TG9jYXRpb25TZWFyY2giLCJzdHJUb09iamVjdCIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJpbmRleE9mIiwiY2hhaW4iLCJzbGljZSIsImNvbXBhY3QiLCJvYmplY3QiLCJzZWFyY2hQYXRoIiwiT2JqZWN0Iiwia2V5cyIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJncmlkUGFnaW5hdGlvbiIsIkhlbHBlciIsIlBhZ2luYXRpb24iLCJwYWdlUGFyYW0iLCJjdXJyZW50UGFnZSIsInBlclBhZ2UiLCJ0b3RhbENvdW50IiwiZ2V0UGFnZVBhcmFtIiwic2V0VG90YWxDb3VudCIsImdldFRvdGFsQ291bnQiLCJzZXRQZXJQYWdlIiwiZ2V0UGVyUGFnZSIsImdldFBhZ2VDb3VudCIsInNldEN1cnJlbnRQYWdlIiwiZ2V0Q3VycmVudFBhZ2UiLCJnZXRPZmZzZXQiLCJnZXRQYWdlVXJsIiwidG90YWxQYWdlcyIsIk1hdGgiLCJjZWlsIiwibWF4Iiwic29ydGluZ1NydiIsIlNvcnRpbmciLCJzb3J0UGFyYW0iLCJESVJFQ1RJT05fQVNDIiwiRElSRUNUSU9OX0RFU0MiLCJmaWVsZCIsImRpcmVjdGlvbiIsInNvcnRGaWVsZHMiLCJnZXRDb2x1bW4iLCJnZXREaXJlY3Rpb25Db2x1bW4iLCJzZXRTb3J0RmllbGRzIiwic2V0U29ydGluZyIsImdldFVybCIsImN1cnJlbnREaXJlY3Rpb24iLCJncmlkVGFibGUiLCJUYWJsZSIsInBhZ2luYXRpb24iLCJzb3J0aW5nIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJnZXRTb3J0aW5nUGFyYW1WYWx1ZSIsIl9nZXRSb3dzQnlEYXRhIiwicmVsIiwiZmllbGROYW1lIiwicm93Iiwicm93UmVzdWx0IiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsIl9nZXRSZWxhdGlvbkxpbmsiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEs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T0FBQXlRLFNBQUEsQ0FmQTtBQUFBLFlBaUJBLFNBQUE0QyxvQkFBQSxDQUFBdkMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0FBLE1BQUEsQ0FBQTBDLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQTFDLE1BQUEsQ0FBQUcsU0FBQSxDQUFBdlAsTUFBQSxDQUFBd0QsSUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSwwQkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsYUFqQkE7QUFBQSxTO1FDRkExRixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFnVSxHQUFBLENBQUE7QUFBQSxZQUFBLGdCQUFBO0FBQUEsWUFBQSxVQUFBQyxjQUFBLEVBQUE7QUFBQSxnQkFBQUEsY0FBQSxDQUFBQyxHQUFBLENBQUEsMEJBQUEsRUFBQSw0ZkFBQSxFQUFBO0FBQUEsZ0JBQ0FELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLGdDQUFBLEVBQUEsZ2hCQUFBLEVBREE7QUFBQSxnQkFFQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsc0NBQUEsRUFBQSwyTUFBQSxFQUZBO0FBQUEsZ0JBR0FELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDJCQUFBLEVBQUEsMHJDQUFBLEVBSEE7QUFBQSxhQUFBO0FBQUEsU0FBQSxFIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnM6IF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMsXG4gICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgIF9nZXRGaWVsZHNGb3JtOiBfZ2V0RmllbGRzRm9ybSxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgX2dldEZvcm1CdXR0b25CeVNjaGVtYTogX2dldEZvcm1CdXR0b25CeVNjaGVtYVxuICB9KTtcblxuICByZXR1cm4gRm9ybTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBmb3JtOiBzZWxmLmZvcm0sXG4gICAgICBtb2RlbDogc2VsZi5tb2RlbCxcbiAgICAgIHNjaGVtYTogc2VsZi5zY2hlbWEsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMpIHtcblxuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgIHNlbGYubW9kZWwgPSBzZWxmLl9maWVsZHNUb0Zvcm1Gb3JtYXQoZmllbGRzKTtcblxuICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgIHNlbGYuZm9ybSA9IGNvbmZpZztcblxuICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgc2VsZi5mb3JtID0gXy51bmlvbihzZWxmLmZvcm0sIHNlbGYuX2dldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9KVxuXG4gICAgfVxuXG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHJlc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICB9KTtcbiAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKFxuICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgKS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgIH0pXG4gICAgICB9O1xuXG4gICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gW107XG5cbiAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICB2YXIgZGF0YUF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG5cbiAgICB2YXIgcmVsYXRpb25zID0gZGF0YVJlbGF0aW9ucy52YWx1ZSgpO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YUF0dHJpYnV0ZXMudmFsdWUoKTtcblxuICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihpdGVtLCBrZXkpIHtcblxuICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgIC8qKiBnZXQgbmFtZSBmcm9tIHNjaGVtYSAqL1xuICAgICAgdmFyIGF0dHJpYnV0ZU5hbWUgPSBkYXRhUmVsYXRpb25zLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgdmFyIHNvdXJjZUVudW0gPSB7fTtcblxuICAgICAgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMgJiYgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgIH0gZWxzZSBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW1cbiAgICAgIH1cblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZUVudW0sIGZ1bmN0aW9uIChlbnVtSXRlbSkge1xuICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChyZXNvdXJjZUxpbmssIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBlbnVtSXRlbX0pO1xuXG4gICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgcmVsYXRpb25OYW1lOiBrZXksXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICB9KVxuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlVGl0bGVNYXBzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgIHZhbHVlOiBpdGVtLmVudW1JdGVtLFxuICAgICAgICAgIC8vdmFsdWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpLFxuICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZW1wdHkgbW9kZWwgZm9yIGNyZWF0ZSBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFcbiAgICogQHBhcmFtIGZ1bGxTY2hlbWFcbiAgICogQHJldHVybnMgeyp9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgIHJlc3VsdC5kYXRhID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcykpO1xuICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2godmFsdWUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBjb25maWcgZm9yIHJlbmRlcmluZyBidXR0b25zIGZyb20gc2NoZW1hIGxpbmtzXG4gICAqXG4gICAqIEBwYXJhbSBsaW5rc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2J1dHRvbicsXG4gICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgIG9uQ2xpY2s6ICdlZGl0KCRldmVudCwgZm9ybSknXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnSGVscGVyJywgaGVscGVyU3J2KTtcbmhlbHBlclNydi4kaW5qZWN0ID0gWydfJ107XG5mdW5jdGlvbiBoZWxwZXJTcnYoKSB7XG5cbiAgdmFyIGZhY3RvcnkgPSAge1xuICAgIHBhcnNlTG9jYXRpb25TZWFyY2g6IHBhcnNlTG9jYXRpb25TZWFyY2gsXG4gICAgc2V0TG9jYXRpb25TZWFyY2g6IHNldExvY2F0aW9uU2VhcmNoLFxuICAgIHN0clRvT2JqZWN0OiBzdHJUb09iamVjdFxuICB9O1xuXG4gIHJldHVybiBmYWN0b3J5O1xuXG4gIGZ1bmN0aW9uIHN0clRvT2JqZWN0KG9iaiwgcGF0aCkge1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7ICAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgayA9IGFbaV07XG4gICAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgICAgb2JqID0gb2JqW2tdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHNlYXJjaCBwYXJhbSB1cmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYXRpb25TZWFyY2godXJsKSB7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcblxuICAgIGlmIChwb3M+PTApIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgJz8nIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIGFuZCBzcGxpdCBvdXQgZWFjaCBhc3NpZ25tZW50XG4gICAgICBzZWFyY2hQYXJhbXMgPSBfLmNoYWluKCB1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykgKVxuICAgICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAgIC5tYXAoZnVuY3Rpb24oaXRlbSkgeyBpZiAoaXRlbSkgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTsgfSlcbiAgICAgICAgICAvLyBSZW1vdmUgdW5kZWZpbmVkIGluIHRoZSBjYXNlIHRoZSBzZWFyY2ggaXMgZW1wdHlcbiAgICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgICAgLy8gVHVybiBba2V5LCB2YWx1ZV0gYXJyYXlzIGludG8gb2JqZWN0IHBhcmFtZXRlcnNcbiAgICAgICAgICAub2JqZWN0KClcbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgICAudmFsdWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VhcmNoUGFyYW1zIHx8IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpIHtcbiAgICB2YXIgc2VhcmNoUGF0aDtcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcbiAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgaWYgKHBvcz49MCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JytzZWFyY2hQYXRoOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlVXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW29mZnNldF0nXSA9IHRoaXMuZ2V0T2Zmc2V0KCk7XG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tsaW1pdF0nXSA9IHRoaXMuZ2V0UGVyUGFnZSgpO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdTb3J0aW5nJywgc29ydGluZ1Nydik7XG5zb3J0aW5nU3J2LiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBzb3J0aW5nU3J2KEhlbHBlciwgXykge1xuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gU29ydGluZygpIHtcbiAgICB0aGlzLnNvcnRQYXJhbSA9ICdzb3J0JztcbiAgfVxuXG4gIFNvcnRpbmcuRElSRUNUSU9OX0FTQyA9ICdhc2MnO1xuICBTb3J0aW5nLkRJUkVDVElPTl9ERVNDID0gJ2Rlc2MnO1xuICBTb3J0aW5nLmZpZWxkID0gdW5kZWZpbmVkO1xuICBTb3J0aW5nLmRpcmVjdGlvbiA9ICcnO1xuICBTb3J0aW5nLnNvcnRGaWVsZHMgPSBbXTtcblxuICBhbmd1bGFyLmV4dGVuZChTb3J0aW5nLnByb3RvdHlwZSwge1xuICAgIGdldENvbHVtbjogZ2V0Q29sdW1uLFxuICAgIGdldERpcmVjdGlvbkNvbHVtbjogZ2V0RGlyZWN0aW9uQ29sdW1uLFxuICAgIHNldFNvcnRGaWVsZHM6IHNldFNvcnRGaWVsZHMsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBnZXRVcmw6IGdldFVybFxuICB9KTtcblxuICByZXR1cm4gU29ydGluZztcblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXREaXJlY3Rpb25Db2x1bW5cbiAgICogQHBhcmFtIGN1cnJlbnREaXJlY3Rpb25cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXREaXJlY3Rpb25Db2x1bW4oY3VycmVudERpcmVjdGlvbikge1xuICAgIGlmICghY3VycmVudERpcmVjdGlvbikge1xuICAgICAgcmV0dXJuICdhc2MnO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudERpcmVjdGlvbiA9PSAnYXNjJyA/ICdkZXNjJyA6ICcnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb2x1bW4gZm9yIGZpZWxkIGlmIGZpZWxkIGhhdmUgJy4nIHRoZW4gZ2V0IGZpcnN0IHBhcnRcbiAgICogRm9yIGV4YW1wbGU6ICd1c2VyLm5hbWUnIHJldHVybiAndXNlcidcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRDb2x1bW5cbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ3x1bmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW4oKSB7XG4gICAgaWYgKHRoaXMuZmllbGQpIHtcbiAgICAgIGlmICh0aGlzLmZpZWxkLmluZGV4T2YoJy4nKT49MCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWVsZC5zbGljZSgwLCB0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmZpZWxkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0aW5nXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmZpZWxkID0gZmllbGQ7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0RmllbGRzXG4gICAqIEBwYXJhbSBmaWVsZHNcbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRGaWVsZHMoZmllbGRzKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBpZiAoIXRoaXMuZmllbGQpIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnNvcnRQYXJhbSArICdbJysgdGhpcy5maWVsZCArJ10nXSA9IHRoaXMuZGlyZWN0aW9uO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuXG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRQYWdpbmF0aW9uJywgJ1NvcnRpbmcnLCAnJHRpbWVvdXQnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFRhYmxlKGdyaWRFbnRpdHksIGdyaWRQYWdpbmF0aW9uLCBTb3J0aW5nLCAkdGltZW91dCwgXykge1xuXG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBUYWJsZShtb2RlbCkge1xuXG4gICAgdGhpcy5zZXRNb2RlbChtb2RlbCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRQYWdpbmF0aW9ufVxuICAgICAqL1xuICAgIHRoaXMucGFnaW5hdGlvbiA9IG5ldyBncmlkUGFnaW5hdGlvbigpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtTb3J0aW5nfVxuICAgICAqL1xuICAgIHRoaXMuc29ydGluZyA9IG5ldyBTb3J0aW5nKCk7XG4gICAgdGhpcy5yb3dzID0gW107XG4gICAgdGhpcy5jb2x1bW5zID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgVGFibGUucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChUYWJsZS5wcm90b3R5cGUsIHtcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBnZXRUYWJsZUluZm86IGdldFRhYmxlSW5mbyxcbiAgICBnZXRDb2x1bW5zQnlTY2hlbWE6IGdldENvbHVtbnNCeVNjaGVtYSxcbiAgICByb3dzVG9UYWJsZUZvcm1hdDogcm93c1RvVGFibGVGb3JtYXQsXG4gICAgZ2V0U29ydGluZ1BhcmFtQnlGaWVsZDogZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCxcbiAgICBnZXRTb3J0aW5nUGFyYW1WYWx1ZTogZ2V0U29ydGluZ1BhcmFtVmFsdWUsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGFcbiAgfSk7XG5cbiAgcmV0dXJuIFRhYmxlO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvd3M6IHNlbGYucm93cyxcbiAgICAgIGNvbHVtbnM6IHNlbGYuY29sdW1ucyxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5wYWdpbmF0aW9uLnNldFRvdGFsQ291bnQoZGF0YS5wcm9wZXJ0eSgnbWV0YScpLnByb3BlcnR5VmFsdWUoJ3RvdGFsJykpO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgdmFyIGZpZWxkTmFtZSA9IHJlbC5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLm5hbWU7XG4gICAgICByZXN1bHQgKz0gJy4nK2ZpZWxkTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB2YWx1ZSBmb3IgR0VUIHNvcnRpbmcgcGFyYW1cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zb3J0aW5nLmRpcmVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCh0aGlzLnNvcnRpbmcuZmllbGQpICsnXycrIHRoaXMuc29ydGluZy5kaXJlY3Rpb25cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgXy5mb3JFYWNoKGNvbHVtbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvKnZhciByZWxhdGlvbnNoaXBzID0ge307XG4gICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICB9XG4gICAgIF8uZm9yRWFjaChyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgfSk7Ki9cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93KSB7XG4gICAgICB2YXIgZGF0YSA9IHJvdy5vd247XG4gICAgICB2YXIgcm93UmVzdWx0ID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSByb3cub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG4gICAgICAgICAgLyoqIG5hbWUgYWRkaXRpb25hbCBmaWVsZChyZWxhdGlvbiByb3cpICovXG4gICAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGZpZWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG5cbiAgICAgICAgfSkuam9pbignLCAnKTtcbiAgICAgIH0pO1xuXG4gICAgICByb3dSZXN1bHQubGlua3MgPSBbXTtcbiAgICAgIF8uZm9yT3duKGRhdGEubGlua3MoKSwgZnVuY3Rpb24obGluaykge1xuICAgICAgICByb3dSZXN1bHQubGlua3MucHVzaChsaW5rKTtcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0LnB1c2gocm93UmVzdWx0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhcnJheSByb3dzIGJ5IEpzb25hcnkgRGF0YVxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSBKc29uYXJ5XG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRSb3dzQnlEYXRhKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByb3dzID0gW107XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG4gICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXG4gICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcblxuICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpe1xuICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgfVxuXG4gIH1cblxufVxuXG5cblxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWydIZWxwZXInLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldChIZWxwZXIsICRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbCxcbiAgICAgICAgbWVzc2FnZXMgPSB7XG4gICAgICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFbnRpdHkoKSB7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBKc29uYXJ5IGRhdGEgb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSB7SnNvbmFyeX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSB7fTtcblxuICAgIGFuZ3VsYXIuZXh0ZW5kKEVudGl0eS5wcm90b3R5cGUsIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgbWVyZ2VSZWxTY2hlbWE6IG1lcmdlUmVsU2NoZW1hLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbiAoakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uIChqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYS5kYXRhLnZhbHVlKCksIHNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgYnkgdXJsIGFuZCBjaGVjayB0eXBlIChjcmVhdGUgb3Igb3RoZXIpXG4gICAgICogaWYgY3JlYXRlIC0gZmV0Y2ggc2NoZW1hIHdpdGggY3JlYXRlIGVtcHR5IGRhdGEsXG4gICAgICogaWYgb3RoZXIgYWN0aW9uIC0gZmV0Y2ggZGF0YSB3aXRoIHNjaGVtYVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgc2VsZi5sb2FkU2NoZW1hKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHNlbGYuZGF0YSA9IGRhdGE7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgbG9hZCByZXNvdXJjZSBieSBhcnJheSBsaW5rc1xuICAgICAqXG4gICAgICogQHBhcmFtIHthcnJheX0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgdmFyIGxpbmtzO1xuXG4gICAgICBsaW5rcyA9IF8udW5pcShsaW5rUmVzb3VyY2VzKTtcblxuICAgICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbiAodXJsKSB7XG5cbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZ1bmN0aW9uIChkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgICByZXNvdXJjZXNbdXJsXSA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgdG90YWwrKztcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgc2NoZW1hIHdpdGggJHJlZiBsaW5rIHRvIHNjaGVtYSB3aXRob3V0ICRyZWZcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIHNjaGVtYUZ1bGwpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2NoZW1hO1xuXG4gICAgICBzY2hlbWFXaXRob3V0UmVmID0gX3JlcGxhY2VGcm9tRnVsbChzY2hlbWFXaXRob3V0UmVmLCBzY2hlbWFGdWxsKTtcblxuICAgICAgcmV0dXJuIHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlIGZ1bmN0aW9uIHJlcGxhY2luZyAkcmVmIGZyb20gc2NoZW1hXG4gICAgICogQHBhcmFtIGhheXN0YWNrXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrLCBzY2hlbWFGdWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gaGF5c3RhY2spIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIGhheXN0YWNrW2tleV0uJHJlZikge1xuICAgICAgICAgICAgaGF5c3RhY2tba2V5XSA9IEhlbHBlci5zdHJUb09iamVjdChzY2hlbWFGdWxsLCBoYXlzdGFja1trZXldLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhheXN0YWNrO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc291cmNlID0gW107XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbEl0ZW0uZGF0YSkpIHtcbiAgICAgICAgdmFyIGxpbmtBcnJheSA9IFtdO1xuICAgICAgICBfLmZvckVhY2gocmVsSXRlbS5kYXRhLCBmdW5jdGlvbihkYXRhT2JqKSB7XG4gICAgICAgICAgbGlua0FycmF5LnB1c2goe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGRhdGFPYmouaWR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2UgPSBsaW5rQXJyYXk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlID0gW3tcbiAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgfV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmtzIGZyb20gZGF0YSByZWxhdGlvbnNoaXBzIHNlY3Rpb25cbiAgICAgKiBJTlBVVDpcbiAgICAgKiAgIFwiZGF0YVwiOiBbe1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgICBcImF1dGhvclwiOiB7XG4gICAgICogICAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwidXNlcnNcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICAgIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgIH1dXG4gICAgICogT1VUUFVUOlxuICAgICAqICAgW1xuICAgICAqICAgICAgaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yLzlcbiAgICAgKiAgIF1cbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShyb3dzUmVsYXRpb25zaGlwcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3csIGtSb3cpIHtcbiAgICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwsIGtSZWwpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtSZWxJdGVtKSB7XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XSA9IHJlc3VsdFtrUm93XSB8fCB7fTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF1ba1JlbEl0ZW1dID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25DcmVhdGVTdWNjZXNzLCBhY3Rpb25DcmVhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBncmlkRm9ybSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZEZvcm0nLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRm9ybSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGUgPSBmdW5jdGlvbihzY29wZSkge1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICB2YXIgZm9ybUluc3QgPSBuZXcgZ3JpZEZvcm0oJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICBmb3JtSW5zdC5nZXRGb3JtSW5mbyhmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdvbkJlZm9yZUxvYWREYXRhJyk7XG5cbiAgICAgIHRhYmxlSW5zdC5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICRzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuXG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdvbkxvYWREYXRhJyk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24odGFibGVJbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVBhZ2luYXRpb24nLCB0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUpO1xuXG50YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUuJGluamVjdCA9IFtdO1xuXG5mdW5jdGlvbiB0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICBzY29wZToge1xuICAgICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgICB9LFxuICAgICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgIGNvbnRyb2xsZXI6IHRhYmxlUGFnaW5hdGlvbkN0cmxcbiAgfTtcblxuICB0YWJsZVBhZ2luYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259ICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSAkc2NvcGUudGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHRhYmxlSW5zdDogJz10YWJsZSdcbiAgICAgIH0sXG4gICAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLWhlYWQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGF0dHIpO1xuICAgICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3NvcnRpbmcgYmVmb3JlIGxvYWQnKTtcbiAgICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSAkc2NvcGUudGFibGVJbnN0LmNvbHVtbnM7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkcyA9IHNvcnRpbmcuc29ydEZpZWxkcztcbiAgICAgICRzY29wZS5zZXRTb3J0aW5nKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZpZWxkID0gc29ydGluZy5nZXRDb2x1bW4oKTtcblxuICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgIF8ud2hlcmUodGhpcy5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgdmFyIGRpcmVjdGlvbjtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBkaXJlY3Rpb24gPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGRpcmVjdGlvbik7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1WYWx1ZSgpKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWxcIixcIjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJzaG93XFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIHRhYmxlLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxkaXYgdGFibGUtcGFnaW5hdGlvbiB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L2Rpdj5cXG48L2dyaWQtdGFibGU+XFxuXFxuPCEtLTxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj4tLT5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9