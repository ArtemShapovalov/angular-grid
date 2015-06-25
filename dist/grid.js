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
                    console.log('pagination before load');
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
                $templateCache.put('templates/grid/table.html', '<grid-table>\n    <span ng-repeat="link in links">\n        <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n      </span>\n    <alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>\n\n    <table class="table grid">\n        <thead grid-thead table="tableInst"></thead>\n        <tbody>\n            <tr ng-repeat="row in rows">\n                <td ng-repeat="column in columns">\n                    <span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>\n                    <span ng-if="column.attributeName == \'links\'">\n                        <span ng-repeat="link in row.links">\n                            <a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a>\n                        </span>\n                    </span>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n    <div table-pagination table="tableInst"></div>\n</grid-table>\n\n<!--<pagination ng-if="rows" direction-links="false" boundary-links="true" items-per-page="itemsPerPage" total-items="totalItems" ng-model="currentPage" ng-change="pageChanged(currentPage)"></pagination>-->');
            }
        ]);
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJuZXdEYXRhIiwicHJvcGVydHkiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJzY2hlbWFzIiwidmFsdWUiLCJmaWVsZHMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsInJlbGF0aW9ucyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJfcmVwbGFjZUZyb21GdWxsIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiZmV0Y2hDb2xsZWN0aW9uIiwicmVzb3VyY2VzIiwibmFtZSIsImZ1bGxTY2hlbWEiLCJjbG9uZSIsImdldFR5cGVQcm9wZXJ0eSIsInRtcE9iaiIsInRpdGxlIiwibGluayIsIm9uQ2xpY2siLCJoZWxwZXJTcnYiLCJwYXJzZUxvY2F0aW9uU2VhcmNoIiwic2V0TG9jYXRpb25TZWFyY2giLCJzdHJUb09iamVjdCIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImxlbmd0aCIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJpbmRleE9mIiwiY2hhaW4iLCJzbGljZSIsImNvbXBhY3QiLCJvYmplY3QiLCJzZWFyY2hQYXRoIiwiT2JqZWN0Iiwia2V5cyIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJncmlkUGFnaW5hdGlvbiIsIkhlbHBlciIsIlBhZ2luYXRpb24iLCJwYWdlUGFyYW0iLCJjdXJyZW50UGFnZSIsInBlclBhZ2UiLCJ0b3RhbENvdW50IiwiZ2V0UGFnZVBhcmFtIiwic2V0VG90YWxDb3VudCIsImdldFRvdGFsQ291bnQiLCJzZXRQZXJQYWdlIiwiZ2V0UGVyUGFnZSIsImdldFBhZ2VDb3VudCIsInNldEN1cnJlbnRQYWdlIiwiZ2V0Q3VycmVudFBhZ2UiLCJnZXRPZmZzZXQiLCJnZXRQYWdlVXJsIiwidG90YWxQYWdlcyIsIk1hdGgiLCJjZWlsIiwibWF4Iiwic29ydGluZ1NydiIsIlNvcnRpbmciLCJzb3J0UGFyYW0iLCJESVJFQ1RJT05fQVNDIiwiRElSRUNUSU9OX0RFU0MiLCJmaWVsZCIsImRpcmVjdGlvbiIsInNvcnRGaWVsZHMiLCJnZXRDb2x1bW4iLCJnZXREaXJlY3Rpb25Db2x1bW4iLCJzZXRTb3J0RmllbGRzIiwic2V0U29ydGluZyIsImdldFVybCIsImN1cnJlbnREaXJlY3Rpb24iLCJncmlkVGFibGUiLCJUYWJsZSIsInBhZ2luYXRpb24iLCJzb3J0aW5nIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJfZ2V0Um93c0J5RGF0YSIsInJlbCIsImZpZWxkTmFtZSIsInJvdyIsInJvd1Jlc3VsdCIsImZvck93biIsInJlcyIsInRtcFJvdyIsInByb3ZpZGVyIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW50ZXJ2YWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiRW50aXR5Iiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJKc29uYXJ5IiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJhZGRTY2hlbWEiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJzY2hlbWFGdWxsIiwiaGF5c3RhY2siLCJoYXNPd25Qcm9wZXJ0eSIsIiRyZWYiLCJzdWJzdHJpbmciLCJyZWxJdGVtIiwicmVsS2V5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsImhyZWYiLCIkYnJvYWRjYXN0Iiwic2NvcGVGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwidGFibGUiLCJoaWRlRm9ybSIsImdyaWRBY3Rpb25Hb1RvIiwiJGxvY2F0aW9uIiwidGVtcGxhdGVMaW5rIiwiZGVmaW5pdGlvbiIsInJlc3VsdExpbmsiLCJtYXRjaCIsInAxIiwic3ViamVjdERhdGEiLCJncmlkQWN0aW9ucyIsImFjdGlvbnMiLCJncmlkQWN0aW9uc0dldCIsIkFjdGlvbkdvVG8iLCJBY3Rpb25EZWxldGUiLCJBY3Rpb25VcGRhdGUiLCJBY3Rpb25DcmVhdGUiLCJnb1RvVXBkYXRlIiwiZ29Ub0NyZWF0ZSIsImdvVG9MaXN0IiwicmVhZCIsImRlbGV0ZSIsInVwZGF0ZSIsImFjdGlvbiIsImJpbmQiLCJncmlkQWN0aW9uVXBkYXRlIiwiYWN0aW9uVXBkYXRlU3VjY2VzcyIsImFjdGlvblVwZGF0ZUVycm9yIiwiZGlyZWN0aXZlIiwiZ3JpZEZvcm1EaXJlY3RpdmUiLCJyZXN0cmljdCIsImNvbnRyb2xsZXIiLCJncmlkRm9ybURpcmVjdGl2ZUN0cmwiLCIkc2NvcGUiLCJzZXRGb3JtU2NvcGUiLCJmb3JtSW5zdCIsImdyaWRNb2RlbCIsIiRkaWdlc3QiLCJlZGl0IiwiJGV2ZW50IiwiZ28iLCJjbG9zZUFsZXJ0Iiwic3BsaWNlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlIiwiZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCIsInRhYmxlSW5zdCIsInRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSIsInJlcXVpcmUiLCJ0ZW1wbGF0ZVVybCIsInRhYmxlUGFnaW5hdGlvbkN0cmwiLCIkb24iLCJjb25zb2xlIiwibG9nIiwic2VhcmNoIiwicGFnZSIsInNob3ciLCJzZXRQYWdpbmF0aW9uIiwidG90YWxJdGVtcyIsIml0ZW1zUGVyUGFnZSIsInBhZ2VDaGFuZ2VkIiwicGFnZU5vIiwiZ3JpZFRoZWFkRGlyZWN0aXZlIiwiZ3JpZFRoZWFkQ3RybCIsImVsZW1lbnQiLCJhdHRyIiwic2V0U29ydGluZ0J5U2VhcmNoIiwid2hlcmUiLCJzb3J0QnkiLCJjb2x1bW4iLCJldmVudCIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7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QUEsQ0FBQXhDLE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUEyQyxjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUEzQyxNQUFBLENBQUFHLFNBQUEsQ0FBQXRQLE1BQUEsQ0FBQXdELElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBMUYsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBZ1UsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLHlyQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSlcblxuICAgIH1cblxuICB9XG5cblxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSByZXNvdXJjZVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIF9maWVsZHNUb0Zvcm1Gb3JtYXQocmVzb3VyY2UpIHtcbiAgICB2YXIgZGF0YSA9IHJlc291cmNlLm93bjtcbiAgICB2YXIgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2gocmVzb3VyY2UucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgfSk7XG4gICAgICAvKiogY2hlY2sgaWYgZGF0YSBhcyBhcnJheSB0aGVuIHJldHVybiBzdHJpbmcgZWxzZSBhcnJheSAqL1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSkpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBmaWVsZHNba2V5XVswXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gc2VsZi5tZXJnZVJlbFNjaGVtYShcbiAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWVsZHM7XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgdmFyIGRhdGFSZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgdmFyIGRhdGFBdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuXG4gICAgdmFyIHJlbGF0aW9ucyA9IGRhdGFSZWxhdGlvbnMudmFsdWUoKTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICB2YXIgZG9jdW1lbnRTY2hlbWEgPSBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgIHZhciByZXNvdXJjZUxpbmsgPSBpdGVtLmxpbmtzLnNlbGY7XG4gICAgICAvKiogZ2V0IG5hbWUgZnJvbSBzY2hlbWEgKi9cbiAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmID0gc2VsZi5fcmVwbGFjZUZyb21GdWxsKGRhdGFBdHRyaWJ1dGVzLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIGRvY3VtZW50U2NoZW1hKVsncHJvcGVydGllcyddW2tleV07XG5cbiAgICAgIHZhciBzb3VyY2VFbnVtID0ge307XG5cbiAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcy5lbnVtXG4gICAgICB9IGVsc2UgaWYgKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bSkge1xuICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICB9XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbiAoZW51bUl0ZW0pIHtcbiAgICAgICAgdmFyIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVzb3VyY2VMaW5rLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IGF0dHJpYnV0ZU5hbWVcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdXJjZVRpdGxlTWFwcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBzZWxmLl9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSk7XG5cbiAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihfLm1hcChzb3VyY2VUaXRsZU1hcHMsICd1cmwnKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VUaXRsZU1hcHMsIGZ1bmN0aW9uIChpdGVtKSB7XG5cbiAgICAgICAgaWYgKCF0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdKSB7XG4gICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXS5wdXNoKHtcbiAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hXG4gICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgIHJlc3VsdCA9IF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzKTtcbiAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gZ2V0VHlwZVByb3BlcnR5KF8uY2xvbmUoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXMpKTtcblxuICAgIGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0eShvYmopIHtcbiAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGlmICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaCxcbiAgICBzdHJUb09iamVjdDogc3RyVG9PYmplY3RcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICBmdW5jdGlvbiBzdHJUb09iamVjdChvYmosIHBhdGgpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gICAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIGsgPSBhW2ldO1xuICAgICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICAgIG9iaiA9IG9ialtrXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zPj0wKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbiggdXJsLnNsaWNlKHVybC5pbmRleE9mKCc/JykgKyAxKS5zcGxpdCgnJicpIClcbiAgICAgICAgICAvLyBTcGxpdCBlYWNoIGFycmF5IGl0ZW0gaW50byBba2V5LCB2YWx1ZV0gaWdub3JlIGVtcHR5IHN0cmluZyBpZiBzZWFyY2ggaXMgZW1wdHlcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgICAgLmNvbXBhY3QoKVxuICAgICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgICAgLm9iamVjdCgpXG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY2hhaW4gb3BlcmF0aW9uXG4gICAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3M+PTApIHtcbiAgICAgIHJlc3VsdCA9IHVybC5zbGljZSgwLCBwb3MpO1xuICAgIH1cblxuICAgIHNlYXJjaFBhdGggPSBPYmplY3Qua2V5cyhzZWFyY2hQYXJhbXMpLm1hcChmdW5jdGlvbihrKSB7XG4gICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChzZWFyY2hQYXJhbXNba10pXG4gICAgfSkuam9pbignJicpO1xuXG4gICAgc2VhcmNoUGF0aCA9IHNlYXJjaFBhdGggPyAnPycrc2VhcmNoUGF0aDogJyc7XG5cbiAgICByZXR1cm4gcmVzdWx0ICsgc2VhcmNoUGF0aDtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFBhZ2luYXRpb24nLCBncmlkUGFnaW5hdGlvbik7XG5ncmlkUGFnaW5hdGlvbi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFBhZ2luYXRpb24oSGVscGVyLCBfKSB7XG5cbiAgZnVuY3Rpb24gUGFnaW5hdGlvbigpIHtcbiAgICAvKiogTmFtZSBvZiB0aGUgcGFyYW1ldGVyIHN0b3JpbmcgdGhlIGN1cnJlbnQgcGFnZSBpbmRleCAqL1xuICAgIHRoaXMucGFnZVBhcmFtID0gJ3BhZ2UnO1xuICAgIC8qKiBUaGUgemVyby1iYXNlZCBjdXJyZW50IHBhZ2UgbnVtYmVyICovXG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IDE7XG4gICAgLyoqIE51bWJlciBvZiBwYWdlcyAqL1xuICAgIC8vdGhpcy5wYWdlQ291bnQgPSAwO1xuICAgIC8qKiBUaGUgbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlICovXG4gICAgdGhpcy5wZXJQYWdlID0gMTtcbiAgICAvKiogVG90YWwgbnVtYmVyIG9mIGl0ZW1zICovXG4gICAgdGhpcy50b3RhbENvdW50ID0gMjtcbiAgfVxuXG4gIGFuZ3VsYXIuZXh0ZW5kKFBhZ2luYXRpb24ucHJvdG90eXBlLCB7XG4gICAgZ2V0UGFnZVBhcmFtOiBnZXRQYWdlUGFyYW0sXG4gICAgc2V0VG90YWxDb3VudDogc2V0VG90YWxDb3VudCxcbiAgICBnZXRUb3RhbENvdW50OiBnZXRUb3RhbENvdW50LFxuICAgIHNldFBlclBhZ2U6IHNldFBlclBhZ2UsXG4gICAgZ2V0UGVyUGFnZTogZ2V0UGVyUGFnZSxcbiAgICBnZXRQYWdlQ291bnQ6IGdldFBhZ2VDb3VudCxcbiAgICBzZXRDdXJyZW50UGFnZTogc2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0Q3VycmVudFBhZ2U6IGdldEN1cnJlbnRQYWdlLFxuICAgIGdldE9mZnNldDogZ2V0T2Zmc2V0LFxuICAgIGdldFBhZ2VVcmw6IGdldFBhZ2VVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFBhZ2luYXRpb247XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZVBhcmFtKCkge1xuICAgIHJldHVybiB0aGlzLnBhZ2VQYXJhbTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFRvdGFsQ291bnQodG90YWxDb3VudCkge1xuICAgIHRoaXMudG90YWxDb3VudCA9IHRvdGFsQ291bnQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUb3RhbENvdW50KCkge1xuICAgIHJldHVybiB0aGlzLnRvdGFsQ291bnQ7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRQZXJQYWdlKHBlclBhZ2UpIHtcbiAgICB0aGlzLnBlclBhZ2UgPSBwZXJQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGVyUGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5wZXJQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZUNvdW50KCkge1xuICAgIHZhciB0b3RhbFBhZ2VzID0gdGhpcy5wZXJQYWdlIDwgMSA/IDEgOiBNYXRoLmNlaWwodGhpcy50b3RhbENvdW50IC8gdGhpcy5wZXJQYWdlKTtcbiAgICByZXR1cm4gTWF0aC5tYXgodG90YWxQYWdlcyB8fCAwLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldEN1cnJlbnRQYWdlKGN1cnJlbnRQYWdlKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IGN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPZmZzZXQoKSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHJlc3VsdCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFBhZ2UgfHwgMCwgMSkgKiB0aGlzLnBlclBhZ2UgLSB0aGlzLnBlclBhZ2U7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZVVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tvZmZzZXRdJ10gPSB0aGlzLmdldE9mZnNldCgpO1xuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbbGltaXRdJ10gPSB0aGlzLmdldFBlclBhZ2UoKTtcblxuICAgIHJlc3VsdCA9IEhlbHBlci5zZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cblxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFNvcnRpbmcoKSB7XG4gICAgdGhpcy5zb3J0UGFyYW0gPSAnc29ydCc7XG4gIH1cblxuICBTb3J0aW5nLkRJUkVDVElPTl9BU0MgPSAnYXNjJztcbiAgU29ydGluZy5ESVJFQ1RJT05fREVTQyA9ICdkZXNjJztcbiAgU29ydGluZy5maWVsZCA9IHVuZGVmaW5lZDtcbiAgU29ydGluZy5kaXJlY3Rpb24gPSAnJztcbiAgU29ydGluZy5zb3J0RmllbGRzID0gW107XG5cbiAgYW5ndWxhci5leHRlbmQoU29ydGluZy5wcm90b3R5cGUsIHtcbiAgICBnZXRDb2x1bW46IGdldENvbHVtbixcbiAgICBnZXREaXJlY3Rpb25Db2x1bW46IGdldERpcmVjdGlvbkNvbHVtbixcbiAgICBzZXRTb3J0RmllbGRzOiBzZXRTb3J0RmllbGRzLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgZ2V0VXJsOiBnZXRVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFNvcnRpbmc7XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0RGlyZWN0aW9uQ29sdW1uXG4gICAqIEBwYXJhbSBjdXJyZW50RGlyZWN0aW9uXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RGlyZWN0aW9uQ29sdW1uKGN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICBpZiAoIWN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiAnYXNjJztcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnREaXJlY3Rpb24gPT0gJ2FzYycgPyAnZGVzYycgOiAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1uIGZvciBmaWVsZCBpZiBmaWVsZCBoYXZlICcuJyB0aGVuIGdldCBmaXJzdCBwYXJ0XG4gICAqIEZvciBleGFtcGxlOiAndXNlci5uYW1lJyByZXR1cm4gJ3VzZXInXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0Q29sdW1uXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uKCkge1xuICAgIGlmICh0aGlzLmZpZWxkKSB7XG4gICAgICBpZiAodGhpcy5maWVsZC5pbmRleE9mKCcuJyk+PTApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldFVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgaWYgKCF0aGlzLmZpZWxkKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5zb3J0UGFyYW0gKyAnWycrIHRoaXMuZmllbGQgKyddJ10gPSB0aGlzLmRpcmVjdGlvbjtcblxuICAgIHJlc3VsdCA9IEhlbHBlci5zZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cblxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBfZ2V0Um93c0J5RGF0YTogX2dldFJvd3NCeURhdGFcbiAgfSk7XG5cbiAgcmV0dXJuIFRhYmxlO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvd3M6IHNlbGYucm93cyxcbiAgICAgIGNvbHVtbnM6IHNlbGYuY29sdW1ucyxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGFibGVJbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5wYWdpbmF0aW9uLnNldFRvdGFsQ291bnQoZGF0YS5wcm9wZXJ0eSgnbWV0YScpLnByb3BlcnR5VmFsdWUoJ3RvdGFsJykpO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgdmFyIGZpZWxkTmFtZSA9IHJlbC5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLm5hbWU7XG4gICAgICByZXN1bHQgKz0gJy4nK2ZpZWxkTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFXaXRob3V0UmVmXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgIH1cbiAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICB9KTsqL1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgIHZhciByb3dSZXN1bHQgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJ0hlbHBlcicsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KEhlbHBlciwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgYW5ndWxhci5leHRlbmQoRW50aXR5LnByb3RvdHlwZSwge1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgICB9LFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIEVudGl0eTtcblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdXJsIGJ5IHBhcmFtcyBmb3IgbG9hZCByZXNvdXJjZVxuICAgICAqXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRSZXNvdXJjZVVybCh1cmwsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgICAgaWYgKHBhcmFtcy5yZXNvdXJjZSkge1xuICAgICAgICByZXN1bHQgPSB1cmwgKyAnLycgKyBwYXJhbXMucmVzb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSkge1xuICAgICAgICBpZiAocGFyYW1zLnR5cGUgPT09ICd1cGRhdGUnIHx8IHBhcmFtcy50eXBlID09PSAncmVhZCcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvc2NoZW1hIy9kZWZpbml0aW9ucy9jcmVhdGUnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uICh1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24gKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICB9XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NDcmVhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWRUYWJsZScsICdncmlkRm9ybSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkRlbGV0ZSgkaHR0cCwgZ3JpZFRhYmxlLCBncmlkRm9ybSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAob2JqIGluc3RhbmNlb2YgZ3JpZFRhYmxlKSB7XG4gICAgICAgIG9iai5nZXRUYWJsZUluZm8oZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpe1xuICAgICAgcmV0dXJuIGxpbmsuc3ViamVjdERhdGEucHJvcGVydHlWYWx1ZShwMSk7XG4gICAgfSk7XG5cbiAgICAkbG9jYXRpb24udXJsKHJlc3VsdExpbmspO1xuICB9O1xufSIsIi8qIEdyaWQgbGlua3MgYWN0aW9ucyAqL1xuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1hY3Rpb25zJywgZ3JpZEFjdGlvbnMpO1xuZ3JpZEFjdGlvbnMuJGluamVjdCA9IFtdO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbnMoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgIGFjdGlvbnM6IHt9LFxuICAgICRnZXQ6IGdyaWRBY3Rpb25zR2V0XG4gIH07XG5cbiAgZ3JpZEFjdGlvbnNHZXQuJGluamVjdCA9IFsnZ3JpZC1hY3Rpb24tZ29UbycsICdncmlkLWFjdGlvbi1kZWxldGUnLCAnZ3JpZC1hY3Rpb24tdXBkYXRlJywgJ2dyaWQtYWN0aW9uLWNyZWF0ZSddO1xuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEFjdGlvbnNHZXQoQWN0aW9uR29UbywgQWN0aW9uRGVsZXRlLCBBY3Rpb25VcGRhdGUsIEFjdGlvbkNyZWF0ZSkge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHRoaXMuYWN0aW9ucyA9IHtcbiAgICAgIGdvVG9VcGRhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvQ3JlYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0xpc3Q6IEFjdGlvbkdvVG8sXG4gICAgICByZWFkOiBBY3Rpb25Hb1RvLFxuICAgICAgZGVsZXRlOiBBY3Rpb25EZWxldGUsXG4gICAgICB1cGRhdGU6IEFjdGlvblVwZGF0ZSxcbiAgICAgIGNyZWF0ZTogQWN0aW9uQ3JlYXRlXG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0aW9uOiBmdW5jdGlvbiAob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkRm9ybScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRGb3JtLCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIHZhciBmb3JtSW5zdCA9IG5ldyBncmlkRm9ybSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZURpcmVjdGl2ZSk7XG5cbmdyaWRUYWJsZURpcmVjdGl2ZS4kaW5qZWN0ID0gWydncmlkVGFibGUnLCAnZ3JpZC1hY3Rpb25zJ107XG5cbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkVGFibGUsIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckc2NvcGUnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHRpbWVvdXQsICRzY29wZSkge1xuICAgIC8qKiBAdHlwZSB7Z3JpZFRhYmxlfSAqL1xuICAgIHZhciB0YWJsZUluc3QgPSBuZXcgZ3JpZFRhYmxlKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuICAgICRzY29wZS50YWJsZUluc3QgPSB0YWJsZUluc3Q7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uQmVmb3JlTG9hZERhdGEnKTtcblxuICAgICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uTG9hZERhdGEnKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlUGFnaW5hdGlvbicsIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSk7XG5cbnRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHRhYmxlSW5zdDogJz10YWJsZSdcbiAgICAgIH0sXG4gICAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdwYWdpbmF0aW9uIGJlZm9yZSBsb2FkJyk7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgc2NvcGU6IHtcbiAgICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgICAgfSxcbiAgICAgIHJlcXVpcmU6ICdeZ3JpZFRhYmxlJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGhlYWRDdHJsLFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uLCBldmVudCkge1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcblxuICAgICAgJHNjb3BlLnRhYmxlSW5zdC5zZXRTb3J0aW5nKGNvbHVtbi5hdHRyaWJ1dGVOYW1lLCBjb2x1bW4uc29ydGluZyk7XG5cbiAgICAgIHZhciBmaWVsZCA9ICRzY29wZS50YWJsZUluc3QuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChjb2x1bW4uYXR0cmlidXRlTmFtZSk7XG5cbiAgICAgIGlmIChjb2x1bW4uc29ydGluZykge1xuICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgZmllbGQgKydfJysgY29sdW1uLnNvcnRpbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCgnc29ydCcsIG51bGwpO1xuICAgICAgfVxuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgZ3JpZC10aGVhZCB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L3RoZWFkPlxcbiAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciBuZy1yZXBlYXQ9XFxcInJvdyBpbiByb3dzXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1xcXCI+e3tyb3dbY29sdW1uLmF0dHJpYnV0ZU5hbWVdfX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgPT0gXFwnbGlua3NcXCdcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiByb3cubGlua3NcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZWRpdChsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbiAgICA8ZGl2IHRhYmxlLXBhZ2luYXRpb24gdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC9kaXY+XFxuPC9ncmlkLXRhYmxlPlxcblxcbjwhLS08cGFnaW5hdGlvbiBuZy1pZj1cXFwicm93c1xcXCIgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCIgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiIGl0ZW1zLXBlci1wYWdlPVxcXCJpdGVtc1BlclBhZ2VcXFwiIHRvdGFsLWl0ZW1zPVxcXCJ0b3RhbEl0ZW1zXFxcIiBuZy1tb2RlbD1cXFwiY3VycmVudFBhZ2VcXFwiIG5nLWNoYW5nZT1cXFwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXFxcIj48L3BhZ2luYXRpb24+LS0+XCIpO31dKTsiXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==