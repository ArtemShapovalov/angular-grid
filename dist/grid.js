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
                _convertExtendSchema: _convertExtendSchema,
                _getExtendEnumSchema: _getExtendEnumSchema,
                _getEnumValues: _getEnumValues,
                _getTitleMapsForRelations: _getTitleMapsForRelations,
                _createTitleMap: _createTitleMap,
                _getFormConfig: _getFormConfig,
                _fieldsToFormFormat: _fieldsToFormFormat,
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
   * Get all needed data for rendering CRUD
   *
   * @name Form#getFormInfo
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
                function fetchDataSuccess(data) {
                    self._getFormConfig(data, callbackFormConfig);
                    function callbackFormConfig(config) {
                        self.links = data.links();
                        self.model = self._fieldsToFormFormat(data);
                        self.form = config;
                        self.schema = data.attributesData().schemas()[0].data.value();
                        _.forEach(self.schema.properties, function (value, key) {
                            self.schema.properties[key] = self._convertExtendSchema(data, key);
                        });
                        /** add button to config form */
                        self.form = _.union(self.form, self._getFormButtonBySchema(data.property('data').links()));
                        if (callback !== undefined) {
                            callback(self.getConfig());
                        }
                    }
                }
            }
            /**
   * Convert Jsonary Data to result model for rendering form
   *
   * @param data
   * @returns {*}
   */
            function _fieldsToFormFormat(data) {
                var fields = data.attributesData().value();
                data.relationshipsData().properties(function (key, relation) {
                    if (relation.property('data').schemas().basicTypes().indexOf('array') >= 0) {
                        fields[key] = _.map(relation.propertyValue('data'), 'id');
                    } else {
                        fields[key] = relation.propertyValue('data').id;
                    }
                });
                return fields;
            }
            /**
   * Generate form config for Angular schema form
   *
   * @param data
   * @param callback
   * @private
   */
            function _getFormConfig(data, callback) {
                var self = this;
                var result = [];
                self._createTitleMap(data.property('data'), function (titleMaps) {
                    var attributes = data.schemas().propertySchemas('data').getFull().propertySchemas('attributes').definedProperties();
                    _.forEach(attributes, function (key) {
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
            /**
   * Get enum values for schema with allOf
   *
   * @name Form#_getEnumValues
   * @param data
   * @returns {[]}
   * @private
   */
            function _getEnumValues(data) {
                var enumValues = [];
                data.property('data').items(function (index, value) {
                    enumValues.push(value.propertyValue('id'));
                });
                return enumValues;
            }
            /**
   * Generate titleMap for relation resource
   *
   * @param data
   * @param callback
   * @private
   */
            function _getTitleMapsForRelations(data, callback) {
                var self = this;
                var sourceTitleMaps = [];
                var resources = [];
                data.property('relationships').properties(function (propertyName, propertyData) {
                    if (!_.isEmpty(propertyData.links('relation'))) {
                        resources.push({
                            url: propertyData.links('relation')[0].href,
                            data: propertyData
                        });
                    }
                });
                self.fetchCollection(_.map(resources, 'url'), function (loadResources) {
                    _.forEach(resources, function (enums) {
                        var propertyData = enums.data;
                        var attributeData = data.property('attributes').property(propertyData.parentKey());
                        var sourceEnum = self._getEnumValues(loadResources[enums.url].data);
                        var attributeSchemas = data.property('attributes').schemas().propertySchemas(propertyData.parentKey());
                        attributeData.addSchema(self._getExtendEnumSchema(attributeSchemas, sourceEnum));
                        _.forEach(sourceEnum, function (enumItem) {
                            var url = self.getResourceUrl(propertyData.links('relation')[0].href, {
                                type: self.default.actionGetResource,
                                id: enumItem
                            });
                            sourceTitleMaps.push({
                                url: url,
                                enumItem: enumItem,
                                relationName: propertyData.parentKey(),
                                attributeName: propertyData.schemas().relationField()
                            });
                        });
                    });
                    callback(sourceTitleMaps);
                });
            }
            /**
   * Convert extended schema to simple schema. For example if schema has property allOf
   * then will be replaced on schema which  merge all items allOf else return schema without changed
   *
   * @param data
   * @param key Attribute or relationships key
   * @returns {*}
   */
            function _convertExtendSchema(data, key) {
                var schemas = data.property('data').property('attributes').schemas().propertySchemas(key).getFull();
                var schemasEnum = data.property('data').property('attributes').property(key).schemas().getFull();
                if (schemas[0].andSchemas().length) {
                    var replaceAllOfSchema = schemas[0].data.value();
                    delete replaceAllOfSchema.allOf;
                    angular.forEach(schemas[0].andSchemas(), function (andSchema) {
                        replaceAllOfSchema = angular.extend(andSchema.data.value(), replaceAllOfSchema);
                    });
                    return replaceAllOfSchema;
                }
                return _.merge({}, schemas[0].data.value(), schemasEnum[0].data.value());
            }
            /**
   * Create SubSchema with dynamic load enums fields
   *
   * @name Form#_getExtendEnumSchema
   * @param schemaList
   * @param sourceEnum
   * @returns {*}
   * @private
   */
            function _getExtendEnumSchema(schemaList, sourceEnum) {
                var mergeObj;
                var result;
                if (schemaList.basicTypes().toString() == 'array') {
                    mergeObj = { items: { enum: sourceEnum } };
                } else {
                    mergeObj = { enum: sourceEnum };
                }
                result = Jsonary.createSchema(_.merge({}, schemaList[0].data.value(), mergeObj));
                return result;
            }
            /**
   * Create titleMap for form and load dependency resource
   *
   * @param data
   * @param callback
   * @private
   */
            function _createTitleMap(data, callback) {
                var self = this;
                self._getTitleMapsForRelations(data, function (sourceTitleMaps) {
                    self.fetchCollection(_.map(sourceTitleMaps, 'url'), function (resources) {
                        var titleMaps = {};
                        _.forEach(sourceTitleMaps, function (item) {
                            if (!titleMaps[item.relationName]) {
                                titleMaps[item.relationName] = [];
                            }
                            titleMaps[item.relationName].push({
                                value: item.enumItem,
                                name: resources[item.url].data.property('data').property('attributes').propertyValue(item.attributeName) || item.enumItem
                            });
                        });
                        callback(titleMaps);
                    });
                });
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
                        if (item) {
                            return item.split('=');
                        }
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
            /**
   * Get url with set page params (offset, limit)
   *
   * @param url
   * @returns {*}
   */
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
   * Sorting table class
   *
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
   * Get url with set param sorting
   *
   * @name Sorting#getUrl
   * @param url
   * @returns {string}
   */
            function getUrl(url) {
                var self = this;
                var searchParams;
                if (!this.field) {
                    return url;
                }
                searchParams = Helper.parseLocationSearch(url);
                searchParams[self.sortParam + '[' + self.field + ']'] = self.direction;
                return Helper.setLocationSearch(url, searchParams);
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
                getColumns: getColumns,
                getColumnsBySchema: getColumnsBySchema,
                rowsToTableFormat: rowsToTableFormat,
                rowToTableFormat: rowToTableFormat,
                getSortingParamByField: getSortingParamByField,
                getSortingParamValue: getSortingParamValue,
                setSorting: setSorting,
                _getRowsByData: _getRowsByData,
                _getLinks: _getLinks
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
                    self.pagination.setTotalCount(data.property('meta').propertyValue('total'));
                    self._getRowsByData(data, function (rows) {
                        self.rows = self.rowsToTableFormat(rows);
                        self.links = data.links();
                        self.columns = self.getColumns(data);
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
                var rel = this.data.property('data').item(0).property('relationships').property(field).schemas().relationField();
                if (rel) {
                    result += '.' + rel;
                }
                return result;
            }
            /**
   * Get value for sorting GET param
   *
   * @returns {*}
   */
            function getSortingParamValue() {
                if (this.sorting.direction) {
                    return this.getSortingParamByField(this.sorting.field) + '_' + this.sorting.direction;
                }
                return null;
            }
            /**
   * Get Columns info by schema and set sortable fields
   *
   * @name Table#getColumnsBySchema
   * @param data
   * @returns {Array}
   */
            function getColumns(data) {
                var self = this;
                var attributes = data.property('data').item(0).property('attributes');
                var relationships = data.property('data').item(0).property('relationships');
                var allColumns = _.union(self.getColumnsBySchema(attributes), self.getColumnsBySchema(relationships));
                self.sorting.setSortFields(_.map(allColumns, 'attributeName'));
                allColumns.push({
                    title: 'Actions',
                    type: 'string',
                    attributeName: 'links'
                });
                return allColumns;
            }
            /**
   * Get columns and attach attributeName in column for rendering
   *
   * @param columns
   * @returns {Array}
   */
            function getColumnsBySchema(columns) {
                var result = [];
                columns.properties(function (key, property) {
                    var value = property.schemas()[0].data.value();
                    value.attributeName = key;
                    result.push(value);
                });
                return result;
            }
            /**
   * Convert array Jsonary Data to result array for rendering table
   *
   * @name Table#rowsToTableFormat
   * @param rows
   * @returns {Array}
   */
            function rowsToTableFormat(rows) {
                var self = this;
                var result = [];
                _.forEach(rows, function (row) {
                    result.push(self.rowToTableFormat(row));
                });
                return result;
            }
            /**
   * Convert Jsonary data to render view data in table
   *
   * @param row Consists of own and relationships data
   * @returns {*}
   */
            function rowToTableFormat(row) {
                var self = this;
                var rowResult = row.own.property('attributes').value();
                _.forEach(row.relationships, function (relation, key) {
                    rowResult[key] = _.map(relation, function (relationItem) {
                        var field = row.own.schemas().propertySchemas('relationships').propertySchemas(key).relationField();
                        if (field) {
                            return relationItem.property('data').property('attributes').propertyValue(field);
                        }
                        return relationItem.property('data').propertyValue('id');
                    }).join(', ');
                });
                rowResult.links = self._getLinks(row.own);
                return rowResult;
            }
            /**
   * Get links for current data
   *
   * @param data
   * @returns {Array}
   * @private
   */
            function _getLinks(data) {
                var result = [];
                _.forOwn(data.links(), function (link) {
                    result.push(link);
                });
                return result;
            }
            /**
   * Get array rows by Jsonary Data
   *
   * @name Table#_getRowsByData
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
                '$interval',
                '_'
            ];
            return provider;
            function gridEntityGet($interval, _) {
                var model;
                var messages = {
                    successDeleted: 'Successfully delete',
                    successCreated: 'Successfully create',
                    successUpdated: 'Successfully update',
                    serverError: 'Oops! server error'
                };
                /**
     * Base class with functionality handling resources
     *
     * @class
     * @constructor
     */
                function Entity() {
                    Jsonary.extendData({
                        relationships: function () {
                            return this.propertyValue('relationships');
                        },
                        attributes: function () {
                            return this.propertyValue('attributes');
                        },
                        relationshipsData: function () {
                            return this.property('data').property('relationships');
                        },
                        attributesData: function () {
                            return this.property('data').property('attributes');
                        }
                    });
                    Jsonary.extendSchema({
                        relationField: function () {
                            return this.data.propertyValue('relationField');
                        }
                    });
                    Jsonary.extendSchemaList({
                        relationField: function () {
                            var relationField = null;
                            this.getFull().each(function (index, schema) {
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
                    _getEmptyData: _getEmptyData,
                    _getEmptyDataRelations: _getEmptyDataRelations,
                    _getRelationResource: _getRelationResource,
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
                    var self = this;
                    Jsonary.getSchema(url, function (jSchema) {
                        var schema = jSchema.data.document.raw.value();
                        var data = Jsonary.create(self._getEmptyData(jSchema));
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
     * @returns {*}
     * @private
     */
                function _getEmptyData(schema) {
                    var self = this;
                    var result;
                    result = schema.createValue();
                    result.data.attributes = {};
                    var schemaAttributes = schema.propertySchemas('data').getFull().propertySchemas('attributes');
                    _.forEach(schemaAttributes.definedProperties(), function (propertyName) {
                        result.data.attributes[propertyName] = schemaAttributes.propertySchemas(propertyName).createValue() !== undefined ? schemaAttributes.propertySchemas(propertyName).createValue() : schemaAttributes.propertySchemas(propertyName)[0].defaultValue();
                    });
                    result.data.relationships = self._getEmptyDataRelations(schema);
                    return result;
                }
                /**
     * Create empty value relationships resource for model
     *
     * @name Entity#_getEmptyDataRelations
     * @param schema
     * @returns {{}}
     * @private
     */
                function _getEmptyDataRelations(schema) {
                    var relation = {};
                    var dataSchema = schema.propertySchemas('data').getFull();
                    var attributesSchema = dataSchema.propertySchemas('attributes');
                    var relationsSchema = dataSchema.propertySchemas('relationships');
                    _.forEach(relationsSchema.definedProperties(), function (relationName) {
                        var attributeSchema = attributesSchema.propertySchemas(relationName).getFull();
                        relation[relationName] = {};
                        relation[relationName].links = {};
                        if (attributeSchema.basicTypes().toString() == 'array') {
                            relation[relationName].data = [];
                        } else {
                            relation[relationName].data = {};
                        }
                    });
                    return relation;
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
     * @name Entity#fetchCollection
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
     * @name Entity#_getRelationLink
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
                        if (!_.isEmpty(relItem.links) && !_.isEmpty(relItem.data)) {
                            resource = [{
                                    url: self.getResourceUrl(relItem.links.self, {
                                        type: self.default.actionGetResource,
                                        id: relItem.data.id
                                    })
                                }];
                        } else {
                            resource = [];
                        }
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
                            result[kRow] = result[kRow] || {};
                            _.forEach(row, function (rel, kRel) {
                                result[kRow][kRel] = result[kRow][kRel] || [];
                                _.forEach(rel, function (relItem, kRelItem) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2NvbnZlcnRFeHRlbmRTY2hlbWEiLCJfZ2V0RXh0ZW5kRW51bVNjaGVtYSIsIl9nZXRFbnVtVmFsdWVzIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2ZpZWxkc1RvRm9ybUZvcm1hdCIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJhdHRyaWJ1dGVzRGF0YSIsInNjaGVtYXMiLCJ2YWx1ZSIsImZvckVhY2giLCJwcm9wZXJ0aWVzIiwia2V5IiwidW5pb24iLCJwcm9wZXJ0eSIsInVuZGVmaW5lZCIsImZpZWxkcyIsInJlbGF0aW9uc2hpcHNEYXRhIiwicmVsYXRpb24iLCJiYXNpY1R5cGVzIiwiaW5kZXhPZiIsIm1hcCIsInByb3BlcnR5VmFsdWUiLCJpZCIsInJlc3VsdCIsInRpdGxlTWFwcyIsImF0dHJpYnV0ZXMiLCJwcm9wZXJ0eVNjaGVtYXMiLCJnZXRGdWxsIiwiZGVmaW5lZFByb3BlcnRpZXMiLCJvYmoiLCJ0aXRsZU1hcCIsImVudW1WYWx1ZXMiLCJpdGVtcyIsImluZGV4Iiwic291cmNlVGl0bGVNYXBzIiwicmVzb3VyY2VzIiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlEYXRhIiwiaXNFbXB0eSIsImhyZWYiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwiZW51bXMiLCJhdHRyaWJ1dGVEYXRhIiwicGFyZW50S2V5Iiwic291cmNlRW51bSIsImF0dHJpYnV0ZVNjaGVtYXMiLCJhZGRTY2hlbWEiLCJlbnVtSXRlbSIsInR5cGUiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJyZWxhdGlvbk5hbWUiLCJhdHRyaWJ1dGVOYW1lIiwicmVsYXRpb25GaWVsZCIsInNjaGVtYXNFbnVtIiwiYW5kU2NoZW1hcyIsImxlbmd0aCIsInJlcGxhY2VBbGxPZlNjaGVtYSIsImFsbE9mIiwiYW5kU2NoZW1hIiwibWVyZ2UiLCJzY2hlbWFMaXN0IiwibWVyZ2VPYmoiLCJ0b1N0cmluZyIsImVudW0iLCJKc29uYXJ5IiwiY3JlYXRlU2NoZW1hIiwiaXRlbSIsIm5hbWUiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiaGVscGVyU3J2IiwicGFyc2VMb2NhdGlvblNlYXJjaCIsInNldExvY2F0aW9uU2VhcmNoIiwic3RyVG9PYmplY3QiLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJuIiwiayIsInNlYXJjaFBhcmFtcyIsInBvcyIsImNoYWluIiwic2xpY2UiLCJjb21wYWN0Iiwib2JqZWN0Iiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJqb2luIiwiZ3JpZFBhZ2luYXRpb24iLCJIZWxwZXIiLCJQYWdpbmF0aW9uIiwicGFnZVBhcmFtIiwiY3VycmVudFBhZ2UiLCJwZXJQYWdlIiwidG90YWxDb3VudCIsImdldFBhZ2VQYXJhbSIsInNldFRvdGFsQ291bnQiLCJnZXRUb3RhbENvdW50Iiwic2V0UGVyUGFnZSIsImdldFBlclBhZ2UiLCJnZXRQYWdlQ291bnQiLCJzZXRDdXJyZW50UGFnZSIsImdldEN1cnJlbnRQYWdlIiwiZ2V0T2Zmc2V0IiwiZ2V0UGFnZVVybCIsInRvdGFsUGFnZXMiLCJNYXRoIiwiY2VpbCIsIm1heCIsInNvcnRpbmdTcnYiLCJTb3J0aW5nIiwic29ydFBhcmFtIiwiRElSRUNUSU9OX0FTQyIsIkRJUkVDVElPTl9ERVNDIiwiZmllbGQiLCJkaXJlY3Rpb24iLCJzb3J0RmllbGRzIiwiZ2V0Q29sdW1uIiwiZ2V0RGlyZWN0aW9uQ29sdW1uIiwic2V0U29ydEZpZWxkcyIsInNldFNvcnRpbmciLCJnZXRVcmwiLCJjdXJyZW50RGlyZWN0aW9uIiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJwYWdpbmF0aW9uIiwic29ydGluZyIsInJvd3MiLCJjb2x1bW5zIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Q29sdW1ucyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0Iiwicm93VG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJnZXRTb3J0aW5nUGFyYW1WYWx1ZSIsIl9nZXRSb3dzQnlEYXRhIiwiX2dldExpbmtzIiwicmVsIiwicmVsYXRpb25zaGlwcyIsImFsbENvbHVtbnMiLCJyb3ciLCJyb3dSZXN1bHQiLCJvd24iLCJyZWxhdGlvbkl0ZW0iLCJmb3JPd24iLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwicmVzIiwidG1wUm93IiwibWFwVmFsdWVzIiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJleHRlbmREYXRhIiwiZXh0ZW5kU2NoZW1hIiwiZXh0ZW5kU2NoZW1hTGlzdCIsImVhY2giLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsIl9nZXRFbXB0eURhdGEiLCJfZ2V0RW1wdHlEYXRhUmVsYXRpb25zIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwicmVzb3VyY2UiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiY3JlYXRlVmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVzIiwiZGVmYXVsdFZhbHVlIiwiZGF0YVNjaGVtYSIsImF0dHJpYnV0ZXNTY2hlbWEiLCJyZWxhdGlvbnNTY2hlbWEiLCJhdHRyaWJ1dGVTY2hlbWEiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJyZWxhdGlvbnMiLCJyZWxJdGVtIiwicmVsS2V5IiwiQXJyYXkiLCJpc0FycmF5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUE7QUFBQSxZQUNBSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxjQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxjQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUFDLE9BQUEsR0FBQUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBRixJQUFBLENBQUEsQztRQUVBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxHQUFBLEVBQUEsWUFBQTtBQUFBLFlBQ0EsT0FBQUMsTUFBQSxDQURBO0FBQUEsU0FBQSxFO1FDbkJBTixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxVQUFBLEVBQUFFLFFBQUEsRTtRQUNBQSxRQUFBLENBQUFDLE9BQUEsR0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFlBQUEsVUFBQTtBQUFBLFlBQUEsR0FBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUFELFFB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QkFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxPQUFBLDJCQUFBLENBSkE7QUFBQSxpQkFBQSxDQURBO0FBQUEsYUFqQkE7QUFBQSxTO1FDRkFwRixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUF5VixHQUFBLENBQUE7QUFBQSxZQUFBLGdCQUFBO0FBQUEsWUFBQSxVQUFBQyxjQUFBLEVBQUE7QUFBQSxnQkFBQUEsY0FBQSxDQUFBQyxHQUFBLENBQUEsMEJBQUEsRUFBQSw0ZkFBQSxFQUFBO0FBQUEsZ0JBQ0FELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLGdDQUFBLEVBQUEsZ2hCQUFBLEVBREE7QUFBQSxnQkFFQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsc0NBQUEsRUFBQSwyTUFBQSxFQUZBO0FBQUEsZ0JBR0FELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDJCQUFBLEVBQUEsMHJDQUFBLEVBSEE7QUFBQSxhQUFBO0FBQUEsU0FBQSxFIiwiZmlsZSI6ImdyaWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIFZtc0dyaWQgdjAuMS4xIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQpXG4gKiBDb3B5cmlnaHQgMjAxNSBWZXJ0YU1lZGlhLCBJbmMuXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZC9tYXN0ZXIvTElDRU5TRSlcbiAqL1xuXG52YXIgZGVwcyA9IFtdO1xudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3NjaGVtYUZvcm0nKTtcbiAgZGVwcy5wdXNoKCdzY2hlbWFGb3JtJyk7XG59IGNhdGNoIChlKSB7fVxuXG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgndWkuYm9vdHN0cmFwJyk7XG4gIGRlcHMucHVzaCgndWkuYm9vdHN0cmFwJyk7XG59IGNhdGNoIChlKSB7fVxuXG52YXIgdm1zR3JpZCA9IGFuZ3VsYXIubW9kdWxlKCdncmlkJywgZGVwcyk7XG5cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnXycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbG9kYXNoO1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRGb3JtJywgZ3JpZEZvcm0pO1xuZ3JpZEZvcm0uJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnJHRpbWVvdXQnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZEZvcm0oZ3JpZEVudGl0eSwgJHRpbWVvdXQsIF8pIHtcblxuICBmdW5jdGlvbiBGb3JtKG1vZGVsKSB7XG4gICAgdGhpcy5zZXRNb2RlbChtb2RlbCk7XG5cbiAgICB0aGlzLmZvcm0gPSBbXTtcbiAgICB0aGlzLm1vZGVsID0ge307XG4gICAgdGhpcy5zY2hlbWEgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBGb3JtLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoRm9ybS5wcm90b3R5cGUsIHtcbiAgICBnZXRGb3JtSW5mbzogZ2V0Rm9ybUluZm8sXG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgX2NvbnZlcnRFeHRlbmRTY2hlbWE6IF9jb252ZXJ0RXh0ZW5kU2NoZW1hLFxuICAgIF9nZXRFeHRlbmRFbnVtU2NoZW1hOiBfZ2V0RXh0ZW5kRW51bVNjaGVtYSxcbiAgICBfZ2V0RW51bVZhbHVlczogX2dldEVudW1WYWx1ZXMsXG4gICAgX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9uczogX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hOiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hXG4gIH0pO1xuXG4gIHJldHVybiBGb3JtO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZvcm06IHNlbGYuZm9ybSxcbiAgICAgIG1vZGVsOiBzZWxmLm1vZGVsLFxuICAgICAgc2NoZW1hOiBzZWxmLnNjaGVtYSxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgbmVlZGVkIGRhdGEgZm9yIHJlbmRlcmluZyBDUlVEXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jZ2V0Rm9ybUluZm9cbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhKSB7XG5cbiAgICAgIHNlbGYuX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2tGb3JtQ29uZmlnKTtcblxuICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuXG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYubW9kZWwgPSBzZWxmLl9maWVsZHNUb0Zvcm1Gb3JtYXQoZGF0YSk7XG4gICAgICAgIHNlbGYuZm9ybSA9IGNvbmZpZztcblxuICAgICAgICBzZWxmLnNjaGVtYSA9IGRhdGEuYXR0cmlidXRlc0RhdGEoKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgICBfLmZvckVhY2goc2VsZi5zY2hlbWEucHJvcGVydGllcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgIHNlbGYuc2NoZW1hLnByb3BlcnRpZXNba2V5XSA9IHNlbGYuX2NvbnZlcnRFeHRlbmRTY2hlbWEoZGF0YSwga2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqIGFkZCBidXR0b24gdG8gY29uZmlnIGZvcm0gKi9cbiAgICAgICAgc2VsZi5mb3JtID0gXy51bmlvbihzZWxmLmZvcm0sIHNlbGYuX2dldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KGRhdGEpIHtcbiAgICB2YXIgZmllbGRzID0gZGF0YS5hdHRyaWJ1dGVzRGF0YSgpLnZhbHVlKCk7XG5cbiAgICBkYXRhLnJlbGF0aW9uc2hpcHNEYXRhKCkucHJvcGVydGllcyhmdW5jdGlvbihrZXksIHJlbGF0aW9uKSB7XG5cbiAgICAgIGlmIChyZWxhdGlvbi5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKS5iYXNpY1R5cGVzKCkuaW5kZXhPZignYXJyYXknKSA+PSAwKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24ucHJvcGVydHlWYWx1ZSgnZGF0YScpLCAnaWQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gcmVsYXRpb24ucHJvcGVydHlWYWx1ZSgnZGF0YScpLmlkO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnNjaGVtYXMoKVxuICAgICAgICAucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpXG4gICAgICAgIC5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKS5kZWZpbmVkUHJvcGVydGllcygpO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZW51bSB2YWx1ZXMgZm9yIHNjaGVtYSB3aXRoIGFsbE9mXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jX2dldEVudW1WYWx1ZXNcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMge1tdfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVudW1WYWx1ZXMoZGF0YSkge1xuICAgIHZhciBlbnVtVmFsdWVzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICBlbnVtVmFsdWVzLnB1c2godmFsdWUucHJvcGVydHlWYWx1ZSgnaWQnKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZW51bVZhbHVlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0aXRsZU1hcCBmb3IgcmVsYXRpb24gcmVzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcbiAgICB2YXIgcmVzb3VyY2VzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydGllcyhmdW5jdGlvbihwcm9wZXJ0eU5hbWUsIHByb3BlcnR5RGF0YSkge1xuXG4gICAgICBpZiAoIV8uaXNFbXB0eShwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJykpKSB7XG4gICAgICAgIHJlc291cmNlcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLFxuICAgICAgICAgIGRhdGE6IHByb3BlcnR5RGF0YVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAocmVzb3VyY2VzLCAndXJsJyksIGZ1bmN0aW9uKGxvYWRSZXNvdXJjZXMpIHtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlcywgZnVuY3Rpb24oZW51bXMpIHtcblxuICAgICAgICB2YXIgcHJvcGVydHlEYXRhID0gZW51bXMuZGF0YTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZURhdGEgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHkocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHNlbGYuX2dldEVudW1WYWx1ZXMobG9hZFJlc291cmNlc1tlbnVtcy51cmxdLmRhdGEpO1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVTY2hlbWFzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKTtcbiAgICAgICAgYXR0cmlidXRlRGF0YS5hZGRTY2hlbWEoc2VsZi5fZ2V0RXh0ZW5kRW51bVNjaGVtYShhdHRyaWJ1dGVTY2hlbWFzLCBzb3VyY2VFbnVtKSk7XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZUVudW0sIGZ1bmN0aW9uKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpWzBdLmhyZWYsIHtcbiAgICAgICAgICAgICAgdHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLFxuICAgICAgICAgICAgICBpZDogZW51bUl0ZW1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuXG4gICAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgICByZWxhdGlvbk5hbWU6IHByb3BlcnR5RGF0YS5wYXJlbnRLZXkoKSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IHByb3BlcnR5RGF0YS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2soc291cmNlVGl0bGVNYXBzKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgZXh0ZW5kZWQgc2NoZW1hIHRvIHNpbXBsZSBzY2hlbWEuIEZvciBleGFtcGxlIGlmIHNjaGVtYSBoYXMgcHJvcGVydHkgYWxsT2ZcbiAgICogdGhlbiB3aWxsIGJlIHJlcGxhY2VkIG9uIHNjaGVtYSB3aGljaCAgbWVyZ2UgYWxsIGl0ZW1zIGFsbE9mIGVsc2UgcmV0dXJuIHNjaGVtYSB3aXRob3V0IGNoYW5nZWRcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGtleSBBdHRyaWJ1dGUgb3IgcmVsYXRpb25zaGlwcyBrZXlcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfY29udmVydEV4dGVuZFNjaGVtYShkYXRhLCBrZXkpIHtcbiAgICB2YXIgc2NoZW1hcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMoa2V5KS5nZXRGdWxsKCk7XG4gICAgdmFyIHNjaGVtYXNFbnVtID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkuZ2V0RnVsbCgpO1xuXG4gICAgaWYgKHNjaGVtYXNbMF0uYW5kU2NoZW1hcygpLmxlbmd0aCkge1xuICAgICAgdmFyIHJlcGxhY2VBbGxPZlNjaGVtYSA9IHNjaGVtYXNbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgZGVsZXRlIHJlcGxhY2VBbGxPZlNjaGVtYS5hbGxPZjtcblxuICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYXNbMF0uYW5kU2NoZW1hcygpLCBmdW5jdGlvbihhbmRTY2hlbWEpIHtcbiAgICAgICAgcmVwbGFjZUFsbE9mU2NoZW1hID0gYW5ndWxhci5leHRlbmQoYW5kU2NoZW1hLmRhdGEudmFsdWUoKSwgcmVwbGFjZUFsbE9mU2NoZW1hKVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVwbGFjZUFsbE9mU2NoZW1hO1xuICAgIH1cblxuICAgIHJldHVybiBfLm1lcmdlKHt9LCBzY2hlbWFzWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hc0VudW1bMF0uZGF0YS52YWx1ZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgU3ViU2NoZW1hIHdpdGggZHluYW1pYyBsb2FkIGVudW1zIGZpZWxkc1xuICAgKlxuICAgKiBAbmFtZSBGb3JtI19nZXRFeHRlbmRFbnVtU2NoZW1hXG4gICAqIEBwYXJhbSBzY2hlbWFMaXN0XG4gICAqIEBwYXJhbSBzb3VyY2VFbnVtXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEV4dGVuZEVudW1TY2hlbWEoc2NoZW1hTGlzdCwgc291cmNlRW51bSkge1xuICAgIHZhciBtZXJnZU9iajtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgaWYgKHNjaGVtYUxpc3QuYmFzaWNUeXBlcygpLnRvU3RyaW5nKCkgPT0gJ2FycmF5Jykge1xuICAgICAgbWVyZ2VPYmogPSB7XG4gICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgZW51bTogc291cmNlRW51bVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lcmdlT2JqID0ge2VudW06IHNvdXJjZUVudW19XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gSnNvbmFyeS5jcmVhdGVTY2hlbWEoXG4gICAgICBfLm1lcmdlKHt9LCBzY2hlbWFMaXN0WzBdLmRhdGEudmFsdWUoKSwgbWVyZ2VPYmopXG4gICAgKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRpdGxlTWFwIGZvciBmb3JtIGFuZCBsb2FkIGRlcGVuZGVuY3kgcmVzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY3JlYXRlVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMoZGF0YSwgZnVuY3Rpb24oc291cmNlVGl0bGVNYXBzKSB7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHRpdGxlTWFwcyA9IHt9O1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VUaXRsZU1hcHMsIGZ1bmN0aW9uKGl0ZW0pIHtcblxuICAgICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJylcbiAgICAgICAgICAgICAgLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaCxcbiAgICBzdHJUb09iamVjdDogc3RyVG9PYmplY3RcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICBmdW5jdGlvbiBzdHJUb09iamVjdChvYmosIHBhdGgpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gICAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIGsgPSBhW2ldO1xuICAgICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICAgIG9iaiA9IG9ialtrXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zID49IDApIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgJz8nIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIGFuZCBzcGxpdCBvdXQgZWFjaCBhc3NpZ25tZW50XG4gICAgICBzZWFyY2hQYXJhbXMgPSBfLmNoYWluKHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSlcbiAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5zcGxpdCgnPScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgLy8gVHVybiBba2V5LCB2YWx1ZV0gYXJyYXlzIGludG8gb2JqZWN0IHBhcmFtZXRlcnNcbiAgICAgICAgLm9iamVjdCgpXG4gICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAudmFsdWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VhcmNoUGFyYW1zIHx8IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpIHtcbiAgICB2YXIgc2VhcmNoUGF0aDtcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcbiAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nICsgc2VhcmNoUGF0aCA6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICAvL3RoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdXJsIHdpdGggc2V0IHBhZ2UgcGFyYW1zIChvZmZzZXQsIGxpbWl0KVxuICAgKlxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0UGFnZVVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tvZmZzZXRdJ10gPSB0aGlzLmdldE9mZnNldCgpO1xuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbbGltaXRdJ10gPSB0aGlzLmdldFBlclBhZ2UoKTtcblxuICAgIHJlc3VsdCA9IEhlbHBlci5zZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdTb3J0aW5nJywgc29ydGluZ1Nydik7XG5zb3J0aW5nU3J2LiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBzb3J0aW5nU3J2KEhlbHBlciwgXykge1xuICAvKipcbiAgICogU29ydGluZyB0YWJsZSBjbGFzc1xuICAgKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpID49IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdXJsIHdpdGggc2V0IHBhcmFtIHNvcnRpbmdcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRVcmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VXJsKHVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgaWYgKCF0aGlzLmZpZWxkKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG4gICAgc2VhcmNoUGFyYW1zW3NlbGYuc29ydFBhcmFtICsgJ1snICsgc2VsZi5maWVsZCArICddJ10gPSBzZWxmLmRpcmVjdGlvbjtcblxuICAgIHJldHVybiBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuICB9XG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRQYWdpbmF0aW9uJywgJ1NvcnRpbmcnLCAnJHRpbWVvdXQnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFRhYmxlKGdyaWRFbnRpdHksIGdyaWRQYWdpbmF0aW9uLCBTb3J0aW5nLCAkdGltZW91dCwgXykge1xuXG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBUYWJsZShtb2RlbCkge1xuXG4gICAgdGhpcy5zZXRNb2RlbChtb2RlbCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRQYWdpbmF0aW9ufVxuICAgICAqL1xuICAgIHRoaXMucGFnaW5hdGlvbiA9IG5ldyBncmlkUGFnaW5hdGlvbigpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtTb3J0aW5nfVxuICAgICAqL1xuICAgIHRoaXMuc29ydGluZyA9IG5ldyBTb3J0aW5nKCk7XG4gICAgdGhpcy5yb3dzID0gW107XG4gICAgdGhpcy5jb2x1bW5zID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgVGFibGUucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChUYWJsZS5wcm90b3R5cGUsIHtcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBnZXRUYWJsZUluZm86IGdldFRhYmxlSW5mbyxcbiAgICBnZXRDb2x1bW5zOiBnZXRDb2x1bW5zLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICByb3dUb1RhYmxlRm9ybWF0OiByb3dUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgZ2V0U29ydGluZ1BhcmFtVmFsdWU6IGdldFNvcnRpbmdQYXJhbVZhbHVlLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhLFxuICAgIF9nZXRMaW5rczogX2dldExpbmtzXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgIHNlbGYucGFnaW5hdGlvbi5zZXRUb3RhbENvdW50KGRhdGEucHJvcGVydHkoJ21ldGEnKS5wcm9wZXJ0eVZhbHVlKCd0b3RhbCcpKTtcbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1ucyhkYXRhKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgZmllbGQgPSB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpO1xuICAgIHRoaXMuc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pXG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgVGFibGUjZ2V0U29ydGluZ1BhcmFtQnlGaWVsZFxuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZpZWxkO1xuICAgIHZhciByZWwgPSB0aGlzLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoZmllbGQpLnNjaGVtYXMoKS5yZWxhdGlvbkZpZWxkKCk7XG5cbiAgICBpZiAocmVsKSB7XG4gICAgICByZXN1bHQgKz0gJy4nICsgcmVsO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHZhbHVlIGZvciBzb3J0aW5nIEdFVCBwYXJhbVxuICAgKlxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvcnRpbmdQYXJhbVZhbHVlKCkge1xuICAgIGlmICh0aGlzLnNvcnRpbmcuZGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKHRoaXMuc29ydGluZy5maWVsZCkgKyAnXycgKyB0aGlzLnNvcnRpbmcuZGlyZWN0aW9uXG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICAvKipcbiAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWEgYW5kIHNldCBzb3J0YWJsZSBmaWVsZHNcbiAgICpcbiAgICogQG5hbWUgVGFibGUjZ2V0Q29sdW1uc0J5U2NoZW1hXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnMoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgdmFyIHJlbGF0aW9uc2hpcHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuXG4gICAgdmFyIGFsbENvbHVtbnMgPSBfLnVuaW9uKHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKGF0dHJpYnV0ZXMpLCBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShyZWxhdGlvbnNoaXBzKSk7XG5cbiAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChhbGxDb2x1bW5zLCAnYXR0cmlidXRlTmFtZScpKTtcblxuICAgIGFsbENvbHVtbnMucHVzaCh7XG4gICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgfSk7XG5cbiAgICByZXR1cm4gYWxsQ29sdW1ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1ucyBhbmQgYXR0YWNoIGF0dHJpYnV0ZU5hbWUgaW4gY29sdW1uIGZvciByZW5kZXJpbmdcbiAgICpcbiAgICogQHBhcmFtIGNvbHVtbnNcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKGNvbHVtbnMpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgY29sdW1ucy5wcm9wZXJ0aWVzKGZ1bmN0aW9uKGtleSwgcHJvcGVydHkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCk7XG4gICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQG5hbWUgVGFibGUjcm93c1RvVGFibGVGb3JtYXRcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmVzdWx0LnB1c2goc2VsZi5yb3dUb1RhYmxlRm9ybWF0KHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IGRhdGEgdG8gcmVuZGVyIHZpZXcgZGF0YSBpbiB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93IENvbnNpc3RzIG9mIG93biBhbmQgcmVsYXRpb25zaGlwcyBkYXRhXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcm93VG9UYWJsZUZvcm1hdChyb3cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd1Jlc3VsdCA9IHJvdy5vd24ucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG5cbiAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICB2YXIgZmllbGQgPSByb3cub3duLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eVNjaGVtYXMoa2V5KS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgfSkuam9pbignLCAnKTtcblxuICAgIH0pO1xuXG4gICAgcm93UmVzdWx0LmxpbmtzID0gc2VsZi5fZ2V0TGlua3Mocm93Lm93bik7XG5cbiAgICByZXR1cm4gcm93UmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsaW5rcyBmb3IgY3VycmVudCBkYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRMaW5rcyhkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yT3duKGRhdGEubGlua3MoKSwgZnVuY3Rpb24obGluaykge1xuICAgICAgcmVzdWx0LnB1c2gobGluayk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQG5hbWUgVGFibGUjX2dldFJvd3NCeURhdGFcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICB9XG5cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWyckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KCRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbDtcbiAgICB2YXIgbWVzc2FnZXMgPSB7XG4gICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQmFzZSBjbGFzcyB3aXRoIGZ1bmN0aW9uYWxpdHkgaGFuZGxpbmcgcmVzb3VyY2VzXG4gICAgICpcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFbnRpdHkoKSB7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kRGF0YSh7XG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgnYXR0cmlidXRlcycpO1xuICAgICAgICB9LFxuICAgICAgICByZWxhdGlvbnNoaXBzRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgICB9LFxuICAgICAgICBhdHRyaWJ1dGVzRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWEoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uRmllbGQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYUxpc3Qoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5nZXRGdWxsKCkuZWFjaChmdW5jdGlvbihpbmRleCwgc2NoZW1hKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzY2hlbWEucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgJiYgKHJlbGF0aW9uRmllbGQgPT0gbnVsbCB8fCB2YWx1ZSA8IHJlbGF0aW9uRmllbGQpKSB7XG4gICAgICAgICAgICAgIHJlbGF0aW9uRmllbGQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25GaWVsZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBKc29uYXJ5IGRhdGEgb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSB7SnNvbmFyeX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSB7fTtcblxuICAgIGFuZ3VsYXIuZXh0ZW5kKEVudGl0eS5wcm90b3R5cGUsIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICAgIF9nZXRFbXB0eURhdGFSZWxhdGlvbnM6IF9nZXRFbXB0eURhdGFSZWxhdGlvbnMsXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfSk7XG5cbiAgICByZXR1cm4gRW50aXR5O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1cmwgYnkgcGFyYW1zIGZvciBsb2FkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24oakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbihqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICByZXN1bHQgPSBzY2hlbWEuY3JlYXRlVmFsdWUoKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSB7fTtcblxuICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZXMgPSBzY2hlbWEucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpO1xuICAgICAgXy5mb3JFYWNoKHNjaGVtYUF0dHJpYnV0ZXMuZGVmaW5lZFByb3BlcnRpZXMoKSwgZnVuY3Rpb24ocHJvcGVydHlOYW1lKSB7XG5cbiAgICAgICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlc1twcm9wZXJ0eU5hbWVdID0gc2NoZW1hQXR0cmlidXRlcy5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKS5jcmVhdGVWYWx1ZSgpICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSkuY3JlYXRlVmFsdWUoKVxuICAgICAgICAgIDogc2NoZW1hQXR0cmlidXRlcy5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKVswXS5kZWZhdWx0VmFsdWUoKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXN1bHQuZGF0YS5yZWxhdGlvbnNoaXBzID0gc2VsZi5fZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGVtcHR5IHZhbHVlIHJlbGF0aW9uc2hpcHMgcmVzb3VyY2UgZm9yIG1vZGVsXG4gICAgICpcbiAgICAgKiBAbmFtZSBFbnRpdHkjX2dldEVtcHR5RGF0YVJlbGF0aW9uc1xuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcmV0dXJucyB7e319XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSkge1xuICAgICAgdmFyIHJlbGF0aW9uID0ge307XG5cbiAgICAgIHZhciBkYXRhU2NoZW1hID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVzU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnNTY2hlbWEgPSBkYXRhU2NoZW1hLnByb3BlcnR5U2NoZW1hcygncmVsYXRpb25zaGlwcycpO1xuXG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zU2NoZW1hLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHJlbGF0aW9uTmFtZSkge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVTY2hlbWEgPSBhdHRyaWJ1dGVzU2NoZW1hLnByb3BlcnR5U2NoZW1hcyhyZWxhdGlvbk5hbWUpLmdldEZ1bGwoKTtcblxuICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdID0ge307XG4gICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0ubGlua3MgPSB7fTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZVNjaGVtYS5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVsYXRpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLmRhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBuYW1lIEVudGl0eSNmZXRjaENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbihkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgICByZXNvdXJjZXNbdXJsXSA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgdG90YWwrKztcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0UmVsYXRpb25MaW5rXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkocmVsSXRlbS5saW5rcykgJiYgIV8uaXNFbXB0eShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgICAgfV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25CZWZvcmVMb2FkRGF0YScpO1xuXG4gICAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcblxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVQYWdpbmF0aW9uJywgdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKTtcblxudGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3cgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICB2YXIgZGlyZWN0aW9uO1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IGRpcmVjdGlvbiA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgZGlyZWN0aW9uKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbVZhbHVlKCkpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgdGFibGUtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGRpdiB0YWJsZS1wYWdpbmF0aW9uIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvZGl2PlxcbjwvZ3JpZC10YWJsZT5cXG5cXG48IS0tPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPi0tPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=