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
                    self.type = self.TYPE_FORM;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10aGVhZC5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJmYWN0b3J5IiwibG9kYXNoIiwiZ3JpZEZvcm0iLCIkaW5qZWN0IiwiZ3JpZEVudGl0eSIsIiR0aW1lb3V0IiwiXyIsIkZvcm0iLCJtb2RlbCIsInNldE1vZGVsIiwiZm9ybSIsInNjaGVtYSIsImxpbmtzIiwicHJvdG90eXBlIiwiZXh0ZW5kIiwiZ2V0Rm9ybUluZm8iLCJnZXRDb25maWciLCJfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9maWVsZHNUb0Zvcm1Gb3JtYXQiLCJfZ2V0RW1wdHlEYXRhIiwiX2dldEZvcm1CdXR0b25CeVNjaGVtYSIsInNlbGYiLCJjYWxsYmFjayIsImdldE1vZGVsIiwidXJsIiwiZ2V0UmVzb3VyY2VVcmwiLCJwYXJhbXMiLCJmZXRjaERhdGEiLCJmZXRjaERhdGFTdWNjZXNzIiwiZGF0YSIsIm5ld0RhdGEiLCJwcm9wZXJ0eSIsInNjaGVtYVdpdGhvdXRSZWYiLCJtZXJnZVJlbFNjaGVtYSIsInNjaGVtYXMiLCJ2YWx1ZSIsInR5cGUiLCJUWVBFX0ZPUk0iLCJmaWVsZHMiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwiZm9yRWFjaCIsInJlbGF0aW9uc2hpcHMiLCJyZWxhdGlvbiIsImtleSIsIm1hcCIsInJlbGF0aW9uSXRlbSIsInByb3BlcnR5VmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHQiLCJ0aXRsZU1hcHMiLCJhdHRyaWJ1dGVzIiwiZG9jdW1lbnQiLCJyYXciLCJwcm9wZXJ0aWVzIiwib2JqIiwidGl0bGVNYXAiLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwibWFwVmFsdWVzIiwibiIsIml0ZW0iLCJpbmRleCIsInNvdXJjZVRpdGxlTWFwcyIsImRhdGFSZWxhdGlvbnMiLCJkYXRhQXR0cmlidXRlcyIsInJlbGF0aW9ucyIsImRvY3VtZW50U2NoZW1hIiwicmVzb3VyY2VMaW5rIiwiYXR0cmlidXRlTmFtZSIsInNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYiLCJfcmVwbGFjZUZyb21GdWxsIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiaWQiLCJyZWxhdGlvbk5hbWUiLCJmZXRjaENvbGxlY3Rpb24iLCJyZXNvdXJjZXMiLCJuYW1lIiwiZnVsbFNjaGVtYSIsImNsb25lIiwiZ2V0VHlwZVByb3BlcnR5IiwidG1wT2JqIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInN0clRvT2JqZWN0IiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibGVuZ3RoIiwiayIsInNlYXJjaFBhcmFtcyIsInBvcyIsImluZGV4T2YiLCJjaGFpbiIsInNsaWNlIiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0IiwiZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCIsIl9nZXRSb3dzQnlEYXRhIiwiVFlQRV9UQUJMRSIsInJlbCIsImZpZWxkTmFtZSIsInJvdyIsInJvd1Jlc3VsdCIsImZvck93biIsInJlcyIsInRtcFJvdyIsInByb3ZpZGVyIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW50ZXJ2YWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiRW50aXR5Iiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0Iiwic2VhcmNoIiwicGFnZSIsInNldFNvcnRpbmdCeVNlYXJjaCIsInNldFBhZ2luYXRpb24iLCJ0b3RhbEl0ZW1zIiwiaXRlbXNQZXJQYWdlIiwicGFnZUNoYW5nZWQiLCJwYWdlTm8iLCJsYXN0SW5kZXhPZiIsImdyaWRUaGVhZERpcmVjdGl2ZSIsInJlcXVpcmUiLCJ0ZW1wbGF0ZVVybCIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsIiRvbiIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwiZXZlbnQiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFB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LEVBQ0FtRCxTQUFBLEVBQUEsWUFEQSxFQUhBO0FBQUEsZ0JBTUFMLFVBQUEsRUFBQXFDLG9CQU5BO0FBQUEsZ0JBT0FuTixJQUFBLEVBQUEsVUFBQWdJLEtBQUEsRUFBQW9GLEVBQUEsRUFBQVQsSUFBQSxFQUFBVSxJQUFBLEVBQUE7QUFBQSxpQkFQQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFlBYUFGLG9CQUFBLENBQUFuVCxPQUFBLEdBQUEsQ0FBQSxRQUFBLENBQUEsQ0FiQTtBQUFBLFlBZUEsT0FBQTJRLFNBQUEsQ0FmQTtBQUFBLFlBaUJBLFNBQUF3QyxvQkFBQSxDQUFBbkMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0FBLE1BQUEsQ0FBQXNDLGNBQUEsR0FBQSxZQUFBO0FBQUEsb0JBQ0EsSUFBQXRDLE1BQUEsQ0FBQUcsU0FBQSxDQUFBelAsTUFBQSxDQUFBVSxJQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBLDBCQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLG9CQUlBLE9BQUEsMkJBQUEsQ0FKQTtBQUFBLGlCQUFBLENBREE7QUFBQSxhQWpCQTtBQUFBLFM7UUNGQTVDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQThULEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7QUFBQSxZQUFBLFVBQUFDLGNBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUFBLDRmQUFBLEVBQUE7QUFBQSxnQkFDQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsZ0NBQUEsRUFBQSxnaEJBQUEsRUFEQTtBQUFBLGdCQUVBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDRuQ0FBQSxFQUZBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuXG4gICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcykge1xuXG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChmaWVsZHMpO1xuXG4gICAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgICBzZWxmLmZvcm0gPSBfLnVuaW9uKHNlbGYuZm9ybSwgc2VsZi5fZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pXG5cbiAgICB9XG5cbiAgfVxuXG5cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pO1xuICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICBpZiAodGl0bGVNYXBzW2tleV0pIHtcbiAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKG9iailcbiAgICAgIH0pO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmllbGRzO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpO1xuICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhLnByb3BlcnR5KCdkYXRhJykpKTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG5cbiAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIG93bjogZmllbGRzLFxuICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1swXSwgZnVuY3Rpb24obikge1xuICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhQXR0cmlidXRlcy52YWx1ZSgpO1xuXG4gICAgdmFyIGRvY3VtZW50U2NoZW1hID0gZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFSZWxhdGlvbnMucHJvcGVydHkoa2V5KS5zY2hlbWFzKClbMF0uZGF0YS5wcm9wZXJ0eVZhbHVlKCduYW1lJyk7XG4gICAgICB2YXIgc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiA9IHNlbGYuX3JlcGxhY2VGcm9tRnVsbChkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBkb2N1bWVudFNjaGVtYSlbJ3Byb3BlcnRpZXMnXVtrZXldO1xuXG4gICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICBpZiAoc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5pdGVtcyAmJiBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bVxuICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgc291cmNlRW51bSA9IHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuZW51bVxuICAgICAgfVxuXG4gICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHJlc291cmNlTGluaywge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGVudW1JdGVtfSk7XG5cbiAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICByZWxhdGlvbk5hbWU6IGtleSxcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBhdHRyaWJ1dGVOYW1lXG4gICAgICAgIH0pXG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHJldHVybiBzb3VyY2VUaXRsZU1hcHM7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRpdGxlTWFwIGZvciBmb3JtIGFuZCBsb2FkIGRlcGVuZGVuY3kgcmVzb3VyY2VcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEpO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbiAoaXRlbSkge1xuXG4gICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVxuICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgcmVzdWx0LmRhdGEgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzKSk7XG4gICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSk7XG5cbiAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICB2YXIgdG1wT2JqID0gb2JqO1xuICAgICAgXy5mb3JFYWNoKHRtcE9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgIHN3aXRjaCh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcz49MCkge1xuICAgICAgLy8gUmVtb3ZlIHRoZSAnPycgYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgYW5kIHNwbGl0IG91dCBlYWNoIGFzc2lnbm1lbnRcbiAgICAgIHNlYXJjaFBhcmFtcyA9IF8uY2hhaW4oIHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSApXG4gICAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgICAgLm1hcChmdW5jdGlvbihpdGVtKSB7IGlmIChpdGVtKSByZXR1cm4gaXRlbS5zcGxpdCgnPScpOyB9KVxuICAgICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgICAvLyBUdXJuIFtrZXksIHZhbHVlXSBhcnJheXMgaW50byBvYmplY3QgcGFyYW1ldGVyc1xuICAgICAgICAgIC5vYmplY3QoKVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAgIC52YWx1ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWFyY2hQYXJhbXMgfHwge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcykge1xuICAgIHZhciBzZWFyY2hQYXRoO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICBpZiAocG9zPj0wKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nK3NlYXJjaFBhdGg6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICAvL3RoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ1NvcnRpbmcnLCBzb3J0aW5nU3J2KTtcbnNvcnRpbmdTcnYuJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIHNvcnRpbmdTcnYoSGVscGVyLCBfKSB7XG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpPj0wKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkLnNsaWNlKDAsIHRoaXMuZmllbGQuaW5kZXhPZignLicpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZmllbGQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRpbmdcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZmllbGQgPSBmaWVsZDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRGaWVsZHNcbiAgICogQHBhcmFtIGZpZWxkc1xuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydEZpZWxkcyhmaWVsZHMpIHtcbiAgICB0aGlzLnNvcnRGaWVsZHMgPSBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXRVcmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIGlmICghdGhpcy5maWVsZCkge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMuc29ydFBhcmFtICsgJ1snKyB0aGlzLmZpZWxkICsnXSddID0gdGhpcy5kaXJlY3Rpb247XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG5cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZSk7XG5ncmlkVGFibGUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFBhZ2luYXRpb24nLCAnU29ydGluZycsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgZ3JpZFBhZ2luYXRpb24sIFNvcnRpbmcsICR0aW1lb3V0LCBfKSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFRhYmxlKG1vZGVsKSB7XG5cbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdGhpcy5wYWdpbmF0aW9uID0gbmV3IGdyaWRQYWdpbmF0aW9uKCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge1NvcnRpbmd9XG4gICAgICovXG4gICAgdGhpcy5zb3J0aW5nID0gbmV3IFNvcnRpbmcoKTtcbiAgICB0aGlzLnJvd3MgPSBbXTtcbiAgICB0aGlzLmNvbHVtbnMgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBUYWJsZS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFRhYmxlLnByb3RvdHlwZSwge1xuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpLFxuICAgICAgdXJsO1xuXG4gICAgLyoqIGFkZCBwYWdlIHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYucGFnaW5hdGlvbi5nZXRQYWdlVXJsKHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpKTtcbiAgICAvKiogYWRkIHNvcnQgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5zb3J0aW5nLmdldFVybCh1cmwpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYucGFnaW5hdGlvbi5zZXRUb3RhbENvdW50KGRhdGEucHJvcGVydHkoJ21ldGEnKS5wcm9wZXJ0eVZhbHVlKCd0b3RhbCcpKTtcblxuICAgICAgc2VsZi50eXBlID0gc2VsZi5UWVBFX1RBQkxFO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgdmFyIGZpZWxkTmFtZSA9IHJlbC5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLm5hbWU7XG4gICAgICByZXN1bHQgKz0gJy4nK2ZpZWxkTmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFXaXRob3V0UmVmXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICBfLmZvckVhY2goY29sdW1ucywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgaWYgKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcykge1xuICAgICByZWxhdGlvbnNoaXBzID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzLnByb3BlcnRpZXM7XG4gICAgIH1cbiAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICB9KTsqL1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93c1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiByb3dzVG9UYWJsZUZvcm1hdChyb3dzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHZhciBkYXRhID0gcm93Lm93bjtcbiAgICAgIHZhciByb3dSZXN1bHQgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59XG5cblxuXG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJ0hlbHBlcicsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KEhlbHBlciwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsLFxuICAgICAgICBtZXNzYWdlcyA9IHtcbiAgICAgICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICAgICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgYW5ndWxhci5leHRlbmQoRW50aXR5LnByb3RvdHlwZSwge1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgICB9LFxuICAgICAgVFlQRV9GT1JNOiAnZm9ybScsXG4gICAgICBUWVBFX1RBQkxFOiAndGFibGUnLFxuICAgICAgdHlwZTogJycsXG4gICAgICBjb25maWc6IHt9LFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gICAgICBmZXRjaERhdGE6IGZldGNoRGF0YSxcbiAgICAgIGZldGNoQ29sbGVjdGlvbjogZmV0Y2hDb2xsZWN0aW9uLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFJlc291cmNlVXJsOiBnZXRSZXNvdXJjZVVybCxcbiAgICAgIG1lcmdlUmVsU2NoZW1hOiBtZXJnZVJlbFNjaGVtYSxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfSk7XG5cbiAgICByZXR1cm4gRW50aXR5O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1cmwgYnkgcGFyYW1zIGZvciBsb2FkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgaWYgKG1vZGVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZXQgbW9kZWwgYmVmb3JlIGNhbGwgZmV0Y2ggZGF0YScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uIChqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uICh1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24gKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICB9XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NDcmVhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmoudHlwZSA9PT0gb2JqLlRZUEVfVEFCTEUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAob2JqLnR5cGUgPT09IG9iai5UWVBFX0ZPUk0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWdvVG8nLCBncmlkQWN0aW9uR29Ubyk7XG5ncmlkQWN0aW9uR29Uby4kaW5qZWN0ID0gWyckbG9jYXRpb24nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25Hb1RvKCRsb2NhdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSl7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uIChvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0ob2JqLCBsaW5rLCBzY29wZSk7XG4gICAgICB9LmJpbmQodGhpcylcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi11cGRhdGUnLCBncmlkQWN0aW9uVXBkYXRlKTtcbmdyaWRBY3Rpb25VcGRhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25VcGRhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uICBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkVGFibGUsIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRUYWJsZX1cbiAgICAgKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSB0YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS50YWJsZUluc3QgPSB0YWJsZUluc3Q7XG5cbiAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICBzZXRTb3J0aW5nQnlTZWFyY2goJGxvY2F0aW9uLnNlYXJjaCgpKTtcblxuICAgIHRhYmxlSW5zdC5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG5cbiAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICRzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuXG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24odGFibGVJbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9IHRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgc2NvcGU6IHtcbiAgICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgICAgfSxcbiAgICAgIHJlcXVpcmU6ICdeZ3JpZFRhYmxlJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGhlYWRDdHJsLFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uLCBldmVudCkge1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcblxuICAgICAgJHNjb3BlLnRhYmxlSW5zdC5zZXRTb3J0aW5nKGNvbHVtbi5hdHRyaWJ1dGVOYW1lLCBjb2x1bW4uc29ydGluZyk7XG5cbiAgICAgIHZhciBmaWVsZCA9ICRzY29wZS50YWJsZUluc3QuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChjb2x1bW4uYXR0cmlidXRlTmFtZSk7XG5cbiAgICAgIGlmIChjb2x1bW4uc29ydGluZykge1xuICAgICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgZmllbGQgKydfJysgY29sdW1uLnNvcnRpbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCgnc29ydCcsIG51bGwpO1xuICAgICAgfVxuXG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIGdyaWQtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2dyaWQtdGFibGU+XFxuPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=