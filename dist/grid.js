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
                    var attributeName = dataRelations.property(key).schemas().relationField();
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
                            var field = row.own.property('relationships').property(key).schemas().relationField();
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
                    Jsonary.extendSchema({
                        relationField: function () {
                            return this.data.propertyValue('relationField');
                        }
                    });
                    Jsonary.extendSchemaList({
                        relationField: function () {
                            var relationField = null;
                            this.each(function (index, schema) {
                                var value = schema.relationField();
                                if (value != null && (relationField == null || value < relationField)) {
                                    relationField = value;
                                }
                            });
                            return relationField;
                        }
                    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJuZXdEYXRhIiwicHJvcGVydHkiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJzY2hlbWFzIiwidmFsdWUiLCJmaWVsZHMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsInJlbGF0aW9ucyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInJlbGF0aW9uRmllbGQiLCJzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmIiwiX3JlcGxhY2VGcm9tRnVsbCIsInNvdXJjZUVudW0iLCJpdGVtcyIsImVudW0iLCJlbnVtSXRlbSIsInR5cGUiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJpZCIsInJlbGF0aW9uTmFtZSIsImZldGNoQ29sbGVjdGlvbiIsInJlc291cmNlcyIsIm5hbWUiLCJmdWxsU2NoZW1hIiwiY2xvbmUiLCJnZXRUeXBlUHJvcGVydHkiLCJ0bXBPYmoiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiaGVscGVyU3J2IiwicGFyc2VMb2NhdGlvblNlYXJjaCIsInNldExvY2F0aW9uU2VhcmNoIiwic3RyVG9PYmplY3QiLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJrIiwic2VhcmNoUGFyYW1zIiwicG9zIiwiaW5kZXhPZiIsImNoYWluIiwic2xpY2UiLCJjb21wYWN0Iiwib2JqZWN0Iiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJqb2luIiwiZ3JpZFBhZ2luYXRpb24iLCJIZWxwZXIiLCJQYWdpbmF0aW9uIiwicGFnZVBhcmFtIiwiY3VycmVudFBhZ2UiLCJwZXJQYWdlIiwidG90YWxDb3VudCIsImdldFBhZ2VQYXJhbSIsInNldFRvdGFsQ291bnQiLCJnZXRUb3RhbENvdW50Iiwic2V0UGVyUGFnZSIsImdldFBlclBhZ2UiLCJnZXRQYWdlQ291bnQiLCJzZXRDdXJyZW50UGFnZSIsImdldEN1cnJlbnRQYWdlIiwiZ2V0T2Zmc2V0IiwiZ2V0UGFnZVVybCIsInRvdGFsUGFnZXMiLCJNYXRoIiwiY2VpbCIsIm1heCIsInNvcnRpbmdTcnYiLCJTb3J0aW5nIiwic29ydFBhcmFtIiwiRElSRUNUSU9OX0FTQyIsIkRJUkVDVElPTl9ERVNDIiwiZmllbGQiLCJkaXJlY3Rpb24iLCJzb3J0RmllbGRzIiwiZ2V0Q29sdW1uIiwiZ2V0RGlyZWN0aW9uQ29sdW1uIiwic2V0U29ydEZpZWxkcyIsInNldFNvcnRpbmciLCJnZXRVcmwiLCJjdXJyZW50RGlyZWN0aW9uIiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJwYWdpbmF0aW9uIiwic29ydGluZyIsInJvd3MiLCJjb2x1bW5zIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Q29sdW1uc0J5U2NoZW1hIiwicm93c1RvVGFibGVGb3JtYXQiLCJnZXRTb3J0aW5nUGFyYW1CeUZpZWxkIiwiZ2V0U29ydGluZ1BhcmFtVmFsdWUiLCJfZ2V0Um93c0J5RGF0YSIsInJlbCIsImZpZWxkTmFtZSIsInJvdyIsInJvd1Jlc3VsdCIsImZvck93biIsInJlcyIsInRtcFJvdyIsInByb3ZpZGVyIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW50ZXJ2YWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiRW50aXR5IiwiSnNvbmFyeSIsImV4dGVuZFNjaGVtYSIsImV4dGVuZFNjaGVtYUxpc3QiLCJlYWNoIiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxP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QWpCQTtBQUFBLFM7UUNGQTNGLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQW9VLEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7QUFBQSxZQUFBLFVBQUFDLGNBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUFBLDRmQUFBLEVBQUE7QUFBQSxnQkFDQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsZ0NBQUEsRUFBQSxnaEJBQUEsRUFEQTtBQUFBLGdCQUVBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxzQ0FBQSxFQUFBLDJNQUFBLEVBRkE7QUFBQSxnQkFHQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFBQSwwckNBQUEsRUFIQTtBQUFBLGFBQUE7QUFBQSxTQUFBLEUiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcykge1xuXG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgICBzZWxmLmZvcm0gPSBfLnVuaW9uKHNlbGYuZm9ybSwgc2VsZi5fZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pXG5cbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSByZXNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIF9maWVsZHNUb0Zvcm1Gb3JtYXQocmVzb3VyY2UpIHtcbiAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICB2YXIgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgfSk7XG4gICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBmaWVsZHNba2V5XVswXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gc2VsZi5tZXJnZVJlbFNjaGVtYShcbiAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWVsZHM7XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgdmFyIGRvY3VtZW50U2NoZW1hID0gZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFSZWxhdGlvbnMucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoXG4gICAgICAgIGRhdGFBdHRyaWJ1dGVzLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRvY3VtZW50U2NoZW1hXG4gICAgICApWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgdmFyIHNvdXJjZUVudW0gPSB7fTtcblxuICAgICAgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMgJiYgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgIH0gZWxzZSBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtKSB7XG4gICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW1cbiAgICAgIH1cblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZUVudW0sIGZ1bmN0aW9uKGVudW1JdGVtKSB7XG4gICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHJlc291cmNlTGluaywge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGVudW1JdGVtfSk7XG5cbiAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICByZWxhdGlvbk5hbWU6IGtleSxcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBhdHRyaWJ1dGVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHJldHVybiBzb3VyY2VUaXRsZU1hcHM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRpdGxlTWFwIGZvciBmb3JtIGFuZCBsb2FkIGRlcGVuZGVuY3kgcmVzb3VyY2VcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAgICAgaWYgKCF0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdKSB7XG4gICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXS5wdXNoKHtcbiAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpXG4gICAgICAgICAgICAucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgIH0pO1xuXG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZW1wdHkgbW9kZWwgZm9yIGNyZWF0ZSBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFcbiAgICogQHBhcmFtIGZ1bGxTY2hlbWFcbiAgICogQHJldHVybnMgeyp9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgcmVzdWx0ID0gXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMpO1xuICAgIHJlc3VsdC5kYXRhID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcykpO1xuICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXG4gICAgICBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKVxuICAgICk7XG5cbiAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgIHN3aXRjaCAodmFsdWUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSB7fTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSBbXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaCxcbiAgICBzdHJUb09iamVjdDogc3RyVG9PYmplY3RcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICBmdW5jdGlvbiBzdHJUb09iamVjdChvYmosIHBhdGgpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gICAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIGsgPSBhW2ldO1xuICAgICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICAgIG9iaiA9IG9ialtrXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zID49IDApIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgJz8nIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIGFuZCBzcGxpdCBvdXQgZWFjaCBhc3NpZ25tZW50XG4gICAgICBzZWFyY2hQYXJhbXMgPSBfLmNoYWluKHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSlcbiAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oaXRlbSkgeyBpZiAoaXRlbSkgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTsgfSlcbiAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgLy8gVHVybiBba2V5LCB2YWx1ZV0gYXJyYXlzIGludG8gb2JqZWN0IHBhcmFtZXRlcnNcbiAgICAgICAgLm9iamVjdCgpXG4gICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAudmFsdWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VhcmNoUGFyYW1zIHx8IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpIHtcbiAgICB2YXIgc2VhcmNoUGF0aDtcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcbiAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nICsgc2VhcmNoUGF0aCA6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICAvL3RoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFNvcnRpbmcoKSB7XG4gICAgdGhpcy5zb3J0UGFyYW0gPSAnc29ydCc7XG4gIH1cblxuICBTb3J0aW5nLkRJUkVDVElPTl9BU0MgPSAnYXNjJztcbiAgU29ydGluZy5ESVJFQ1RJT05fREVTQyA9ICdkZXNjJztcbiAgU29ydGluZy5maWVsZCA9IHVuZGVmaW5lZDtcbiAgU29ydGluZy5kaXJlY3Rpb24gPSAnJztcbiAgU29ydGluZy5zb3J0RmllbGRzID0gW107XG5cbiAgYW5ndWxhci5leHRlbmQoU29ydGluZy5wcm90b3R5cGUsIHtcbiAgICBnZXRDb2x1bW46IGdldENvbHVtbixcbiAgICBnZXREaXJlY3Rpb25Db2x1bW46IGdldERpcmVjdGlvbkNvbHVtbixcbiAgICBzZXRTb3J0RmllbGRzOiBzZXRTb3J0RmllbGRzLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgZ2V0VXJsOiBnZXRVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFNvcnRpbmc7XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0RGlyZWN0aW9uQ29sdW1uXG4gICAqIEBwYXJhbSBjdXJyZW50RGlyZWN0aW9uXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RGlyZWN0aW9uQ29sdW1uKGN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICBpZiAoIWN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiAnYXNjJztcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnREaXJlY3Rpb24gPT0gJ2FzYycgPyAnZGVzYycgOiAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1uIGZvciBmaWVsZCBpZiBmaWVsZCBoYXZlICcuJyB0aGVuIGdldCBmaXJzdCBwYXJ0XG4gICAqIEZvciBleGFtcGxlOiAndXNlci5uYW1lJyByZXR1cm4gJ3VzZXInXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0Q29sdW1uXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uKCkge1xuICAgIGlmICh0aGlzLmZpZWxkKSB7XG4gICAgICBpZiAodGhpcy5maWVsZC5pbmRleE9mKCcuJykgPj0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWVsZC5zbGljZSgwLCB0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmZpZWxkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0aW5nXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmZpZWxkID0gZmllbGQ7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0RmllbGRzXG4gICAqIEBwYXJhbSBmaWVsZHNcbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRGaWVsZHMoZmllbGRzKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBpZiAoIXRoaXMuZmllbGQpIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnNvcnRQYXJhbSArICdbJyArIHRoaXMuZmllbGQgKyAnXSddID0gdGhpcy5kaXJlY3Rpb247XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgZ2V0U29ydGluZ1BhcmFtVmFsdWU6IGdldFNvcnRpbmdQYXJhbVZhbHVlLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG5cbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpO1xuXG4gICAgICAgIHNlbGYuc29ydGluZy5zZXRTb3J0RmllbGRzKF8ubWFwKHNlbGYuY29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICAgICAgc2VsZi5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgZmllbGQgPSB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpO1xuICAgIHRoaXMuc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pXG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgVGFibGUjZ2V0U29ydGluZ1BhcmFtQnlGaWVsZFxuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZpZWxkO1xuICAgIHZhciByZWwgPSB0aGlzLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoZmllbGQpO1xuXG4gICAgaWYgKHJlbC52YWx1ZSgpKSB7XG4gICAgICB2YXIgZmllbGROYW1lID0gcmVsLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCkubmFtZTtcbiAgICAgIHJlc3VsdCArPSAnLicgKyBmaWVsZE5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdmFsdWUgZm9yIEdFVCBzb3J0aW5nIHBhcmFtXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtVmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuc29ydGluZy5kaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQodGhpcy5zb3J0aW5nLmZpZWxkKSArICdfJyArIHRoaXMuc29ydGluZy5kaXJlY3Rpb25cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgY29sdW1ucyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgXy5mb3JFYWNoKGNvbHVtbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvKnZhciByZWxhdGlvbnNoaXBzID0ge307XG4gICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICB9XG4gICAgIF8uZm9yRWFjaChyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgfSk7Ki9cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93KSB7XG4gICAgICB2YXIgZGF0YSA9IHJvdy5vd247XG4gICAgICB2YXIgcm93UmVzdWx0ID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSByb3cub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgIC8qKiBuYW1lIGFkZGl0aW9uYWwgZmllbGQocmVsYXRpb24gcm93KSAqL1xuICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICB9KTtcblxuICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgcm93UmVzdWx0LmxpbmtzLnB1c2gobGluayk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnSGVscGVyJywgJyRpbnRlcnZhbCcsICdfJ107XG5cbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRFbnRpdHlHZXQoSGVscGVyLCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWw7XG4gICAgdmFyIG1lc3NhZ2VzID0ge1xuICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hKHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWxhdGlvbkZpZWxkJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWFMaXN0KHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHJlbGF0aW9uRmllbGQgPSBudWxsO1xuICAgICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbihpbmRleCwgc2NoZW1hKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzY2hlbWEucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgJiYgKHJlbGF0aW9uRmllbGQgPT0gbnVsbCB8fCB2YWx1ZSA8IHJlbGF0aW9uRmllbGQpKSB7XG4gICAgICAgICAgICAgIHJlbGF0aW9uRmllbGQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25GaWVsZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBKc29uYXJ5IGRhdGEgb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSB7SnNvbmFyeX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSB7fTtcblxuICAgIGFuZ3VsYXIuZXh0ZW5kKEVudGl0eS5wcm90b3R5cGUsIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgbWVyZ2VSZWxTY2hlbWE6IG1lcmdlUmVsU2NoZW1hLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbihqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24oalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLmRhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odXJsKSB7XG5cbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICB9XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZFRhYmxlJywgJ2dyaWRGb3JtJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkVGFibGUsIGdyaWRGb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBncmlkVGFibGUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBncmlkRm9ybSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkRm9ybScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRGb3JtLCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIHZhciBmb3JtSW5zdCA9IG5ldyBncmlkRm9ybSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkdGltZW91dCwgJHNjb3BlKSB7XG4gICAgLyoqIEB0eXBlIHtncmlkVGFibGV9ICovXG4gICAgdmFyIHRhYmxlSW5zdCA9IG5ldyBncmlkVGFibGUoJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG4gICAgJHNjb3BlLnRhYmxlSW5zdCA9IHRhYmxlSW5zdDtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uQmVmb3JlTG9hZERhdGEnKTtcblxuICAgICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uTG9hZERhdGEnKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlUGFnaW5hdGlvbicsIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSk7XG5cbnRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtcGFnaW5hdGlvbi5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IHRhYmxlUGFnaW5hdGlvbkN0cmxcbiAgfTtcblxuICB0YWJsZVBhZ2luYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259ICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSAkc2NvcGUudGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRUaGVhZEN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHIpIHtcbiAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3NvcnRpbmcgYmVmb3JlIGxvYWQnKTtcbiAgICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSAkc2NvcGUudGFibGVJbnN0LmNvbHVtbnM7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkcyA9IHNvcnRpbmcuc29ydEZpZWxkcztcbiAgICAgICRzY29wZS5zZXRTb3J0aW5nKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZpZWxkID0gc29ydGluZy5nZXRDb2x1bW4oKTtcblxuICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgIF8ud2hlcmUodGhpcy5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgdmFyIGRpcmVjdGlvbjtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBkaXJlY3Rpb24gPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGRpcmVjdGlvbik7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1WYWx1ZSgpKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWxcIixcIjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJzaG93XFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIHRhYmxlLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxkaXYgdGFibGUtcGFnaW5hdGlvbiB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L2Rpdj5cXG48L2dyaWQtdGFibGU+XFxuXFxuPCEtLTxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj4tLT5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9