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
                function fetchDataSuccess(data, schema) {
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
                var self = this;
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
                        self.sorting.setSortFields(_.map(self.columns, 'attributeName'));
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
   * Get Columns info by schema
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
                    /*jshint validthis: true */
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
     * @param fullSchema
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
     * @param fullSchema
     * @returns {{}}
     * @private
     */
                function _getEmptyDataRelations(schema) {
                    var self = this;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2NvbnZlcnRFeHRlbmRTY2hlbWEiLCJfZ2V0RXh0ZW5kRW51bVNjaGVtYSIsIl9nZXRFbnVtVmFsdWVzIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2ZpZWxkc1RvRm9ybUZvcm1hdCIsIl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEiLCJzZWxmIiwiY2FsbGJhY2siLCJnZXRNb2RlbCIsInVybCIsImdldFJlc291cmNlVXJsIiwicGFyYW1zIiwiZmV0Y2hEYXRhIiwiZmV0Y2hEYXRhU3VjY2VzcyIsImRhdGEiLCJjYWxsYmFja0Zvcm1Db25maWciLCJjb25maWciLCJhdHRyaWJ1dGVzRGF0YSIsInNjaGVtYXMiLCJ2YWx1ZSIsImZvckVhY2giLCJwcm9wZXJ0aWVzIiwia2V5IiwidW5pb24iLCJwcm9wZXJ0eSIsInVuZGVmaW5lZCIsImZpZWxkcyIsInJlbGF0aW9uc2hpcHNEYXRhIiwicmVsYXRpb24iLCJiYXNpY1R5cGVzIiwiaW5kZXhPZiIsIm1hcCIsInByb3BlcnR5VmFsdWUiLCJpZCIsInJlc3VsdCIsInRpdGxlTWFwcyIsImF0dHJpYnV0ZXMiLCJwcm9wZXJ0eVNjaGVtYXMiLCJnZXRGdWxsIiwiZGVmaW5lZFByb3BlcnRpZXMiLCJvYmoiLCJ0aXRsZU1hcCIsImVudW1WYWx1ZXMiLCJpdGVtcyIsImluZGV4Iiwic291cmNlVGl0bGVNYXBzIiwicmVzb3VyY2VzIiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlEYXRhIiwiaXNFbXB0eSIsImhyZWYiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwiZW51bXMiLCJhdHRyaWJ1dGVEYXRhIiwicGFyZW50S2V5Iiwic291cmNlRW51bSIsImF0dHJpYnV0ZVNjaGVtYXMiLCJhZGRTY2hlbWEiLCJlbnVtSXRlbSIsInR5cGUiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJyZWxhdGlvbk5hbWUiLCJhdHRyaWJ1dGVOYW1lIiwicmVsYXRpb25GaWVsZCIsInNjaGVtYXNFbnVtIiwiYW5kU2NoZW1hcyIsImxlbmd0aCIsInJlcGxhY2VBbGxPZlNjaGVtYSIsImFsbE9mIiwiYW5kU2NoZW1hIiwibWVyZ2UiLCJzY2hlbWFMaXN0IiwibWVyZ2VPYmoiLCJ0b1N0cmluZyIsImVudW0iLCJKc29uYXJ5IiwiY3JlYXRlU2NoZW1hIiwiaXRlbSIsIm5hbWUiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiaGVscGVyU3J2IiwicGFyc2VMb2NhdGlvblNlYXJjaCIsInNldExvY2F0aW9uU2VhcmNoIiwic3RyVG9PYmplY3QiLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJuIiwiayIsInNlYXJjaFBhcmFtcyIsInBvcyIsImNoYWluIiwic2xpY2UiLCJjb21wYWN0Iiwib2JqZWN0Iiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJqb2luIiwiZ3JpZFBhZ2luYXRpb24iLCJIZWxwZXIiLCJQYWdpbmF0aW9uIiwicGFnZVBhcmFtIiwiY3VycmVudFBhZ2UiLCJwZXJQYWdlIiwidG90YWxDb3VudCIsImdldFBhZ2VQYXJhbSIsInNldFRvdGFsQ291bnQiLCJnZXRUb3RhbENvdW50Iiwic2V0UGVyUGFnZSIsImdldFBlclBhZ2UiLCJnZXRQYWdlQ291bnQiLCJzZXRDdXJyZW50UGFnZSIsImdldEN1cnJlbnRQYWdlIiwiZ2V0T2Zmc2V0IiwiZ2V0UGFnZVVybCIsInRvdGFsUGFnZXMiLCJNYXRoIiwiY2VpbCIsIm1heCIsInNvcnRpbmdTcnYiLCJTb3J0aW5nIiwic29ydFBhcmFtIiwiRElSRUNUSU9OX0FTQyIsIkRJUkVDVElPTl9ERVNDIiwiZmllbGQiLCJkaXJlY3Rpb24iLCJzb3J0RmllbGRzIiwiZ2V0Q29sdW1uIiwiZ2V0RGlyZWN0aW9uQ29sdW1uIiwic2V0U29ydEZpZWxkcyIsInNldFNvcnRpbmciLCJnZXRVcmwiLCJjdXJyZW50RGlyZWN0aW9uIiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJwYWdpbmF0aW9uIiwic29ydGluZyIsInJvd3MiLCJjb2x1bW5zIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Q29sdW1ucyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0Iiwicm93VG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJnZXRTb3J0aW5nUGFyYW1WYWx1ZSIsIl9nZXRSb3dzQnlEYXRhIiwiX2dldExpbmtzIiwicmVsIiwicmVsYXRpb25zaGlwcyIsImFsbENvbHVtbnMiLCJyb3ciLCJyb3dSZXN1bHQiLCJvd24iLCJyZWxhdGlvbkl0ZW0iLCJmb3JPd24iLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwicmVzIiwidG1wUm93IiwibWFwVmFsdWVzIiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJleHRlbmREYXRhIiwiZXh0ZW5kU2NoZW1hIiwiZXh0ZW5kU2NoZW1hTGlzdCIsImVhY2giLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsIl9nZXRFbXB0eURhdGEiLCJfZ2V0RW1wdHlEYXRhUmVsYXRpb25zIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwicmVzb3VyY2UiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiY3JlYXRlVmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVzIiwiZGVmYXVsdFZhbHVlIiwiZGF0YVNjaGVtYSIsImF0dHJpYnV0ZXNTY2hlbWEiLCJyZWxhdGlvbnNTY2hlbWEiLCJhdHRyaWJ1dGVTY2hlbWEiLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJyZWxhdGlvbnMiLCJyZWxJdGVtIiwicmVsS2V5IiwiQXJyYXkiLCJpc0FycmF5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUE7QUFBQSxZQUNBSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxjQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxjQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUFDLE9BQUEsR0FBQUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBRixJQUFBLENBQUEsQztRQUVBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxHQUFBLEVBQUEsWUFBQTtBQUFBLFlBQ0EsT0FBQUMsTUFBQSxDQURBO0FBQUEsU0FBQSxFO1FDbkJBTixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxVQUFBLEVBQUFFLFFBQUEsRTtRQUNBQSxRQUFBLENBQUFDLE9BQUEsR0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFlBQUEsVUFBQTtBQUFBLFlBQUEsR0FBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUFELFFB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QUEvUSxNQUFBLENBQUFpRCxJQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBLDBCQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLG9CQUlBLE9BQUEsMkJBQUEsQ0FKQTtBQUFBLGlCQUFBLENBREE7QUFBQSxhQWpCQTtBQUFBLFM7UUNGQXBGLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQXlWLEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7QUFBQSxZQUFBLFVBQUFDLGNBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUFBLDRmQUFBLEVBQUE7QUFBQSxnQkFDQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsZ0NBQUEsRUFBQSxnaEJBQUEsRUFEQTtBQUFBLGdCQUVBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxzQ0FBQSxFQUFBLDJNQUFBLEVBRkE7QUFBQSxnQkFHQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFBQSwwckNBQUEsRUFIQTtBQUFBLGFBQUE7QUFBQSxTQUFBLEUiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfY29udmVydEV4dGVuZFNjaGVtYTogX2NvbnZlcnRFeHRlbmRTY2hlbWEsXG4gICAgX2dldEV4dGVuZEVudW1TY2hlbWE6IF9nZXRFeHRlbmRFbnVtU2NoZW1hLFxuICAgIF9nZXRFbnVtVmFsdWVzOiBfZ2V0RW51bVZhbHVlcyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBuZWVkZWQgZGF0YSBmb3IgcmVuZGVyaW5nIENSVURcbiAgICpcbiAgICogQG5hbWUgRm9ybSNnZXRGb3JtSW5mb1xuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcblxuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGRhdGEpO1xuICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgc2VsZi5zY2hlbWEgPSBkYXRhLmF0dHJpYnV0ZXNEYXRhKCkuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKTtcbiAgICAgICAgXy5mb3JFYWNoKHNlbGYuc2NoZW1hLnByb3BlcnRpZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBzZWxmLnNjaGVtYS5wcm9wZXJ0aWVzW2tleV0gPSBzZWxmLl9jb252ZXJ0RXh0ZW5kU2NoZW1hKGRhdGEsIGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChkYXRhKSB7XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEuYXR0cmlidXRlc0RhdGEoKS52YWx1ZSgpO1xuXG4gICAgZGF0YS5yZWxhdGlvbnNoaXBzRGF0YSgpLnByb3BlcnRpZXMoZnVuY3Rpb24oa2V5LCByZWxhdGlvbikge1xuXG4gICAgICBpZiAocmVsYXRpb24ucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKCkuYmFzaWNUeXBlcygpLmluZGV4T2YoJ2FycmF5JykgPj0gMCkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSwgJ2lkJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaWVsZHNba2V5XSA9IHJlbGF0aW9uLnByb3BlcnR5VmFsdWUoJ2RhdGEnKS5pZDtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpLmRlZmluZWRQcm9wZXJ0aWVzKCk7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBlbnVtIHZhbHVlcyBmb3Igc2NoZW1hIHdpdGggYWxsT2ZcbiAgICpcbiAgICogQG5hbWUgRm9ybSNfZ2V0RW51bVZhbHVlc1xuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7W119XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RW51bVZhbHVlcyhkYXRhKSB7XG4gICAgdmFyIGVudW1WYWx1ZXMgPSBbXTtcblxuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgIGVudW1WYWx1ZXMucHVzaCh2YWx1ZS5wcm9wZXJ0eVZhbHVlKCdpZCcpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBlbnVtVmFsdWVzO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gW107XG4gICAgdmFyIHJlc291cmNlcyA9IFtdO1xuXG4gICAgZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnRpZXMoZnVuY3Rpb24ocHJvcGVydHlOYW1lLCBwcm9wZXJ0eURhdGEpIHtcblxuICAgICAgaWYgKCFfLmlzRW1wdHkocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpKSkge1xuICAgICAgICByZXNvdXJjZXMucHVzaCh7XG4gICAgICAgICAgdXJsOiBwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZixcbiAgICAgICAgICBkYXRhOiBwcm9wZXJ0eURhdGFcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHJlc291cmNlcywgJ3VybCcpLCBmdW5jdGlvbihsb2FkUmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKGVudW1zKSB7XG5cbiAgICAgICAgdmFyIHByb3BlcnR5RGF0YSA9IGVudW1zLmRhdGE7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVEYXRhID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5KHByb3BlcnR5RGF0YS5wYXJlbnRLZXkoKSk7XG5cbiAgICAgICAgdmFyIHNvdXJjZUVudW0gPSBzZWxmLl9nZXRFbnVtVmFsdWVzKGxvYWRSZXNvdXJjZXNbZW51bXMudXJsXS5kYXRhKTtcblxuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5RGF0YS5wYXJlbnRLZXkoKSk7XG4gICAgICAgIGF0dHJpYnV0ZURhdGEuYWRkU2NoZW1hKHNlbGYuX2dldEV4dGVuZEVudW1TY2hlbWEoYXR0cmlidXRlU2NoZW1hcywgc291cmNlRW51bSkpO1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbihlbnVtSXRlbSkge1xuICAgICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLCB7XG4gICAgICAgICAgICAgIHR5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSxcbiAgICAgICAgICAgICAgaWQ6IGVudW1JdGVtXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgICAgcmVsYXRpb25OYW1lOiBwcm9wZXJ0eURhdGEucGFyZW50S2V5KCksXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBwcm9wZXJ0eURhdGEuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHNvdXJjZVRpdGxlTWFwcyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGV4dGVuZGVkIHNjaGVtYSB0byBzaW1wbGUgc2NoZW1hLiBGb3IgZXhhbXBsZSBpZiBzY2hlbWEgaGFzIHByb3BlcnR5IGFsbE9mXG4gICAqIHRoZW4gd2lsbCBiZSByZXBsYWNlZCBvbiBzY2hlbWEgd2hpY2ggIG1lcmdlIGFsbCBpdGVtcyBhbGxPZiBlbHNlIHJldHVybiBzY2hlbWEgd2l0aG91dCBjaGFuZ2VkXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBrZXkgQXR0cmlidXRlIG9yIHJlbGF0aW9uc2hpcHMga2V5XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2NvbnZlcnRFeHRlbmRTY2hlbWEoZGF0YSwga2V5KSB7XG4gICAgdmFyIHNjaGVtYXMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKGtleSkuZ2V0RnVsbCgpO1xuICAgIHZhciBzY2hlbWFzRW51bSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpLmdldEZ1bGwoKTtcblxuICAgIGlmIChzY2hlbWFzWzBdLmFuZFNjaGVtYXMoKS5sZW5ndGgpIHtcbiAgICAgIHZhciByZXBsYWNlQWxsT2ZTY2hlbWEgPSBzY2hlbWFzWzBdLmRhdGEudmFsdWUoKTtcbiAgICAgIGRlbGV0ZSByZXBsYWNlQWxsT2ZTY2hlbWEuYWxsT2Y7XG5cbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChzY2hlbWFzWzBdLmFuZFNjaGVtYXMoKSwgZnVuY3Rpb24oYW5kU2NoZW1hKSB7XG4gICAgICAgIHJlcGxhY2VBbGxPZlNjaGVtYSA9IGFuZ3VsYXIuZXh0ZW5kKGFuZFNjaGVtYS5kYXRhLnZhbHVlKCksIHJlcGxhY2VBbGxPZlNjaGVtYSlcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlcGxhY2VBbGxPZlNjaGVtYTtcbiAgICB9XG5cbiAgICByZXR1cm4gXy5tZXJnZSh7fSwgc2NoZW1hc1swXS5kYXRhLnZhbHVlKCksIHNjaGVtYXNFbnVtWzBdLmRhdGEudmFsdWUoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIFN1YlNjaGVtYSB3aXRoIGR5bmFtaWMgbG9hZCBlbnVtcyBmaWVsZHNcbiAgICpcbiAgICogQG5hbWUgRm9ybSNfZ2V0RXh0ZW5kRW51bVNjaGVtYVxuICAgKiBAcGFyYW0gc2NoZW1hTGlzdFxuICAgKiBAcGFyYW0gc291cmNlRW51bVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFeHRlbmRFbnVtU2NoZW1hKHNjaGVtYUxpc3QsIHNvdXJjZUVudW0pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1lcmdlT2JqO1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBpZiAoc2NoZW1hTGlzdC5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICBtZXJnZU9iaiA9IHtcbiAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICBlbnVtOiBzb3VyY2VFbnVtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VPYmogPSB7ZW51bTogc291cmNlRW51bX1cbiAgICB9XG5cbiAgICByZXN1bHQgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShcbiAgICAgIF8ubWVyZ2Uoe30sIHNjaGVtYUxpc3RbMF0uZGF0YS52YWx1ZSgpLCBtZXJnZU9iailcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhLCBmdW5jdGlvbihzb3VyY2VUaXRsZU1hcHMpIHtcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgICAgICAgaWYgKCF0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdKSB7XG4gICAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdID0gW107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXS5wdXNoKHtcbiAgICAgICAgICAgIHZhbHVlOiBpdGVtLmVudW1JdGVtLFxuICAgICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKVxuICAgICAgICAgICAgICAucHJvcGVydHlWYWx1ZShpdGVtLmF0dHJpYnV0ZU5hbWUpIHx8IGl0ZW0uZW51bUl0ZW1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2sodGl0bGVNYXBzKVxuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBjb25maWcgZm9yIHJlbmRlcmluZyBidXR0b25zIGZyb20gc2NoZW1hIGxpbmtzXG4gICAqXG4gICAqIEBwYXJhbSBsaW5rc1xuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGxpbmtzKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2J1dHRvbicsXG4gICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgbGluazogdmFsdWUsXG4gICAgICAgIG9uQ2xpY2s6ICdlZGl0KCRldmVudCwgZm9ybSknXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnSGVscGVyJywgaGVscGVyU3J2KTtcbmhlbHBlclNydi4kaW5qZWN0ID0gWydfJ107XG5mdW5jdGlvbiBoZWxwZXJTcnYoKSB7XG5cbiAgdmFyIGZhY3RvcnkgPSAge1xuICAgIHBhcnNlTG9jYXRpb25TZWFyY2g6IHBhcnNlTG9jYXRpb25TZWFyY2gsXG4gICAgc2V0TG9jYXRpb25TZWFyY2g6IHNldExvY2F0aW9uU2VhcmNoLFxuICAgIHN0clRvT2JqZWN0OiBzdHJUb09iamVjdFxuICB9O1xuXG4gIHJldHVybiBmYWN0b3J5O1xuXG4gIGZ1bmN0aW9uIHN0clRvT2JqZWN0KG9iaiwgcGF0aCkge1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcWyhcXHcrKV0vZywgJy4kMScpOyAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7ICAvLyBjb252ZXJ0IGluZGV4ZXMgdG8gcHJvcGVydGllc1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgIC8vIHN0cmlwIGEgbGVhZGluZyBkb3RcbiAgICB2YXIgYSA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgayA9IGFbaV07XG4gICAgICBpZiAoayBpbiBvYmopIHtcbiAgICAgICAgb2JqID0gb2JqW2tdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHNlYXJjaCBwYXJhbSB1cmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYXRpb25TZWFyY2godXJsKSB7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgLy8gUmVtb3ZlIHRoZSAnPycgYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgYW5kIHNwbGl0IG91dCBlYWNoIGFzc2lnbm1lbnRcbiAgICAgIHNlYXJjaFBhcmFtcyA9IF8uY2hhaW4odXJsLnNsaWNlKHVybC5pbmRleE9mKCc/JykgKyAxKS5zcGxpdCgnJicpKVxuICAgICAgICAvLyBTcGxpdCBlYWNoIGFycmF5IGl0ZW0gaW50byBba2V5LCB2YWx1ZV0gaWdub3JlIGVtcHR5IHN0cmluZyBpZiBzZWFyY2ggaXMgZW1wdHlcbiAgICAgICAgLm1hcChmdW5jdGlvbihpdGVtKSB7IGlmIChpdGVtKSByZXR1cm4gaXRlbS5zcGxpdCgnPScpOyB9KVxuICAgICAgICAvLyBSZW1vdmUgdW5kZWZpbmVkIGluIHRoZSBjYXNlIHRoZSBzZWFyY2ggaXMgZW1wdHlcbiAgICAgICAgLmNvbXBhY3QoKVxuICAgICAgICAvLyBUdXJuIFtrZXksIHZhbHVlXSBhcnJheXMgaW50byBvYmplY3QgcGFyYW1ldGVyc1xuICAgICAgICAub2JqZWN0KClcbiAgICAgICAgLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgY2hhaW4gb3BlcmF0aW9uXG4gICAgICAgIC52YWx1ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWFyY2hQYXJhbXMgfHwge307XG4gIH1cblxuICBmdW5jdGlvbiBzZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcykge1xuICAgIHZhciBzZWFyY2hQYXRoO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICBpZiAocG9zID49IDApIHtcbiAgICAgIHJlc3VsdCA9IHVybC5zbGljZSgwLCBwb3MpO1xuICAgIH1cblxuICAgIHNlYXJjaFBhdGggPSBPYmplY3Qua2V5cyhzZWFyY2hQYXJhbXMpLm1hcChmdW5jdGlvbihrKSB7XG4gICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChzZWFyY2hQYXJhbXNba10pXG4gICAgfSkuam9pbignJicpO1xuXG4gICAgc2VhcmNoUGF0aCA9IHNlYXJjaFBhdGggPyAnPycgKyBzZWFyY2hQYXRoIDogJyc7XG5cbiAgICByZXR1cm4gcmVzdWx0ICsgc2VhcmNoUGF0aDtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFBhZ2luYXRpb24nLCBncmlkUGFnaW5hdGlvbik7XG5ncmlkUGFnaW5hdGlvbi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFBhZ2luYXRpb24oSGVscGVyLCBfKSB7XG5cbiAgZnVuY3Rpb24gUGFnaW5hdGlvbigpIHtcbiAgICAvKiogTmFtZSBvZiB0aGUgcGFyYW1ldGVyIHN0b3JpbmcgdGhlIGN1cnJlbnQgcGFnZSBpbmRleCAqL1xuICAgIHRoaXMucGFnZVBhcmFtID0gJ3BhZ2UnO1xuICAgIC8qKiBUaGUgemVyby1iYXNlZCBjdXJyZW50IHBhZ2UgbnVtYmVyICovXG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IDE7XG4gICAgLyoqIE51bWJlciBvZiBwYWdlcyAqL1xuICAgIC8vdGhpcy5wYWdlQ291bnQgPSAwO1xuICAgIC8qKiBUaGUgbnVtYmVyIG9mIGl0ZW1zIHBlciBwYWdlICovXG4gICAgdGhpcy5wZXJQYWdlID0gMTtcbiAgICAvKiogVG90YWwgbnVtYmVyIG9mIGl0ZW1zICovXG4gICAgdGhpcy50b3RhbENvdW50ID0gMjtcbiAgfVxuXG4gIGFuZ3VsYXIuZXh0ZW5kKFBhZ2luYXRpb24ucHJvdG90eXBlLCB7XG4gICAgZ2V0UGFnZVBhcmFtOiBnZXRQYWdlUGFyYW0sXG4gICAgc2V0VG90YWxDb3VudDogc2V0VG90YWxDb3VudCxcbiAgICBnZXRUb3RhbENvdW50OiBnZXRUb3RhbENvdW50LFxuICAgIHNldFBlclBhZ2U6IHNldFBlclBhZ2UsXG4gICAgZ2V0UGVyUGFnZTogZ2V0UGVyUGFnZSxcbiAgICBnZXRQYWdlQ291bnQ6IGdldFBhZ2VDb3VudCxcbiAgICBzZXRDdXJyZW50UGFnZTogc2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0Q3VycmVudFBhZ2U6IGdldEN1cnJlbnRQYWdlLFxuICAgIGdldE9mZnNldDogZ2V0T2Zmc2V0LFxuICAgIGdldFBhZ2VVcmw6IGdldFBhZ2VVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFBhZ2luYXRpb247XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZVBhcmFtKCkge1xuICAgIHJldHVybiB0aGlzLnBhZ2VQYXJhbTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFRvdGFsQ291bnQodG90YWxDb3VudCkge1xuICAgIHRoaXMudG90YWxDb3VudCA9IHRvdGFsQ291bnQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUb3RhbENvdW50KCkge1xuICAgIHJldHVybiB0aGlzLnRvdGFsQ291bnQ7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRQZXJQYWdlKHBlclBhZ2UpIHtcbiAgICB0aGlzLnBlclBhZ2UgPSBwZXJQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGVyUGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5wZXJQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZUNvdW50KCkge1xuICAgIHZhciB0b3RhbFBhZ2VzID0gdGhpcy5wZXJQYWdlIDwgMSA/IDEgOiBNYXRoLmNlaWwodGhpcy50b3RhbENvdW50IC8gdGhpcy5wZXJQYWdlKTtcbiAgICByZXR1cm4gTWF0aC5tYXgodG90YWxQYWdlcyB8fCAwLCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldEN1cnJlbnRQYWdlKGN1cnJlbnRQYWdlKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IGN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q3VycmVudFBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRPZmZzZXQoKSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHJlc3VsdCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFBhZ2UgfHwgMCwgMSkgKiB0aGlzLnBlclBhZ2UgLSB0aGlzLnBlclBhZ2U7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGFnZVVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tvZmZzZXRdJ10gPSB0aGlzLmdldE9mZnNldCgpO1xuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbbGltaXRdJ10gPSB0aGlzLmdldFBlclBhZ2UoKTtcblxuICAgIHJlc3VsdCA9IEhlbHBlci5zZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdTb3J0aW5nJywgc29ydGluZ1Nydik7XG5zb3J0aW5nU3J2LiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBzb3J0aW5nU3J2KEhlbHBlciwgXykge1xuICAvKipcbiAgICogU29ydGluZyB0YWJsZSBjbGFzc1xuICAgKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpID49IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdXJsIHdpdGggc2V0IHBhcmFtIHNvcnRpbmdcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRVcmxcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIGlmICghdGhpcy5maWVsZCkge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuXG4gICAgc2VhcmNoUGFyYW1zW3RoaXMuc29ydFBhcmFtICsgJ1snICsgdGhpcy5maWVsZCArICddJ10gPSB0aGlzLmRpcmVjdGlvbjtcblxuICAgIHJlc3VsdCA9IEhlbHBlci5zZXRMb2NhdGlvblNlYXJjaCh1cmwsIHNlYXJjaFBhcmFtcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbn1cblxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkVGFibGUnLCBncmlkVGFibGUpO1xuZ3JpZFRhYmxlLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJ2dyaWRQYWdpbmF0aW9uJywgJ1NvcnRpbmcnLCAnJHRpbWVvdXQnLCAnXyddO1xuZnVuY3Rpb24gZ3JpZFRhYmxlKGdyaWRFbnRpdHksIGdyaWRQYWdpbmF0aW9uLCBTb3J0aW5nLCAkdGltZW91dCwgXykge1xuXG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBUYWJsZShtb2RlbCkge1xuXG4gICAgdGhpcy5zZXRNb2RlbChtb2RlbCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge2dyaWRQYWdpbmF0aW9ufVxuICAgICAqL1xuICAgIHRoaXMucGFnaW5hdGlvbiA9IG5ldyBncmlkUGFnaW5hdGlvbigpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtTb3J0aW5nfVxuICAgICAqL1xuICAgIHRoaXMuc29ydGluZyA9IG5ldyBTb3J0aW5nKCk7XG4gICAgdGhpcy5yb3dzID0gW107XG4gICAgdGhpcy5jb2x1bW5zID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgVGFibGUucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChUYWJsZS5wcm90b3R5cGUsIHtcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBnZXRUYWJsZUluZm86IGdldFRhYmxlSW5mbyxcbiAgICBnZXRDb2x1bW5zOiBnZXRDb2x1bW5zLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICByb3dUb1RhYmxlRm9ybWF0OiByb3dUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgZ2V0U29ydGluZ1BhcmFtVmFsdWU6IGdldFNvcnRpbmdQYXJhbVZhbHVlLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhLFxuICAgIF9nZXRMaW5rczogX2dldExpbmtzXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgIHNlbGYucGFnaW5hdGlvbi5zZXRUb3RhbENvdW50KGRhdGEucHJvcGVydHkoJ21ldGEnKS5wcm9wZXJ0eVZhbHVlKCd0b3RhbCcpKTtcbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1ucyhkYXRhKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICBmaWVsZCA9IHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCk7XG4gICAgdGhpcy5zb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbilcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBUYWJsZSNnZXRTb3J0aW5nUGFyYW1CeUZpZWxkXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpIHtcbiAgICB2YXIgcmVzdWx0ID0gZmllbGQ7XG4gICAgdmFyIHJlbCA9IHRoaXMuZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShmaWVsZCkuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKTtcblxuICAgIGlmIChyZWwpIHtcbiAgICAgIHJlc3VsdCArPSAnLicgKyByZWw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdmFsdWUgZm9yIHNvcnRpbmcgR0VUIHBhcmFtXG4gICAqXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtVmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuc29ydGluZy5kaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQodGhpcy5zb3J0aW5nLmZpZWxkKSArICdfJyArIHRoaXMuc29ydGluZy5kaXJlY3Rpb25cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAbmFtZSBUYWJsZSNnZXRDb2x1bW5zQnlTY2hlbWFcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICB2YXIgcmVsYXRpb25zaGlwcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG5cbiAgICB2YXIgYWxsQ29sdW1ucyA9IF8udW5pb24oc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEoYXR0cmlidXRlcyksIHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKHJlbGF0aW9uc2hpcHMpKTtcblxuICAgIGFsbENvbHVtbnMucHVzaCh7XG4gICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgfSk7XG5cbiAgICByZXR1cm4gYWxsQ29sdW1ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1ucyBhbmQgYXR0YWNoIGF0dHJpYnV0ZU5hbWUgaW4gY29sdW1uIGZvciByZW5kZXJpbmdcbiAgICpcbiAgICogQHBhcmFtIGNvbHVtbnNcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKGNvbHVtbnMpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgY29sdW1ucy5wcm9wZXJ0aWVzKGZ1bmN0aW9uKGtleSwgcHJvcGVydHkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCk7XG4gICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQG5hbWUgVGFibGUjcm93c1RvVGFibGVGb3JtYXRcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmVzdWx0LnB1c2goc2VsZi5yb3dUb1RhYmxlRm9ybWF0KHJvdykpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IGRhdGEgdG8gcmVuZGVyIHZpZXcgZGF0YSBpbiB0YWJsZVxuICAgKlxuICAgKiBAcGFyYW0gcm93IENvbnNpc3RzIG9mIG93biBhbmQgcmVsYXRpb25zaGlwcyBkYXRhXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcm93VG9UYWJsZUZvcm1hdChyb3cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd1Jlc3VsdCA9IHJvdy5vd24ucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJvdy5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG5cbiAgICAgIHJvd1Jlc3VsdFtrZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICB2YXIgZmllbGQgPSByb3cub3duLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eVNjaGVtYXMoa2V5KS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgfSkuam9pbignLCAnKTtcblxuICAgIH0pO1xuXG4gICAgcm93UmVzdWx0LmxpbmtzID0gc2VsZi5fZ2V0TGlua3Mocm93Lm93bik7XG5cbiAgICByZXR1cm4gcm93UmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsaW5rcyBmb3IgY3VycmVudCBkYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRMaW5rcyhkYXRhKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yT3duKGRhdGEubGlua3MoKSwgZnVuY3Rpb24obGluaykge1xuICAgICAgcmVzdWx0LnB1c2gobGluayk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQG5hbWUgVGFibGUjX2dldFJvd3NCeURhdGFcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICB9XG5cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWVudGl0eScsIGdyaWRFbnRpdHkpO1xuXG5mdW5jdGlvbiBncmlkRW50aXR5KCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICAkZ2V0OiBncmlkRW50aXR5R2V0XG4gIH07XG5cbiAgZ3JpZEVudGl0eUdldC4kaW5qZWN0ID0gWydIZWxwZXInLCAnJGludGVydmFsJywgJ18nXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldChIZWxwZXIsICRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbDtcbiAgICB2YXIgbWVzc2FnZXMgPSB7XG4gICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQGNsYXNzXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gRW50aXR5KCkge1xuXG4gICAgICBKc29uYXJ5LmV4dGVuZERhdGEoe1xuICAgICAgICByZWxhdGlvbnNoaXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eVZhbHVlKCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5VmFsdWUoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVsYXRpb25zaGlwc0RhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXR0cmlidXRlc0RhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hKHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWxhdGlvbkZpZWxkJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWFMaXN0KHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHJlbGF0aW9uRmllbGQgPSBudWxsO1xuICAgICAgICAgIHRoaXMuZ2V0RnVsbCgpLmVhY2goZnVuY3Rpb24oaW5kZXgsIHNjaGVtYSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc2NoZW1hLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIChyZWxhdGlvbkZpZWxkID09IG51bGwgfHwgdmFsdWUgPCByZWxhdGlvbkZpZWxkKSkge1xuICAgICAgICAgICAgICByZWxhdGlvbkZpZWxkID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uRmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSnNvbmFyeSBkYXRhIG9iamVjdFxuICAgICAqXG4gICAgICogQHR5cGUge0pzb25hcnl9XG4gICAgICovXG4gICAgdGhpcy5kYXRhID0ge307XG5cbiAgICBhbmd1bGFyLmV4dGVuZChFbnRpdHkucHJvdG90eXBlLCB7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBjb25maWc6IHt9LFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gICAgICBmZXRjaERhdGE6IGZldGNoRGF0YSxcbiAgICAgIGZldGNoQ29sbGVjdGlvbjogZmV0Y2hDb2xsZWN0aW9uLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFJlc291cmNlVXJsOiBnZXRSZXNvdXJjZVVybCxcbiAgICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zOiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIEVudGl0eTtcblxuICAgIGZ1bmN0aW9uIHNldE1vZGVsKE1vZGVsKSB7XG4gICAgICBtb2RlbCA9IE1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1vZGVsKCkge1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2UocGFyYW0pIHtcbiAgICAgIHJldHVybiBtZXNzYWdlc1twYXJhbV07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWVzc2FnZShwYXJhbSwgbWVzc2FnZSkge1xuICAgICAgbWVzc2FnZXNbcGFyYW1dID0gbWVzc2FnZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdXJsIGJ5IHBhcmFtcyBmb3IgbG9hZCByZXNvdXJjZVxuICAgICAqXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRSZXNvdXJjZVVybCh1cmwsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgICAgaWYgKHBhcmFtcy5yZXNvdXJjZSkge1xuICAgICAgICByZXN1bHQgPSB1cmwgKyAnLycgKyBwYXJhbXMucmVzb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSkge1xuICAgICAgICBpZiAocGFyYW1zLnR5cGUgPT09ICd1cGRhdGUnIHx8IHBhcmFtcy50eXBlID09PSAncmVhZCcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvc2NoZW1hIy9kZWZpbml0aW9ucy9jcmVhdGUnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cbiAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hLCByZXF1ZXN0KTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbihqU2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYSA9IGpTY2hlbWEuZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcbiAgICAgICAgdmFyIGRhdGEgPSBKc29uYXJ5LmNyZWF0ZShzZWxmLl9nZXRFbXB0eURhdGEoalNjaGVtYSkpO1xuICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgIGRhdGEuYWRkU2NoZW1hKGpTY2hlbWEpO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHJlc3VsdCA9IHNjaGVtYS5jcmVhdGVWYWx1ZSgpO1xuICAgICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IHt9O1xuXG4gICAgICB2YXIgc2NoZW1hQXR0cmlidXRlcyA9IHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCkucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICBfLmZvckVhY2goc2NoZW1hQXR0cmlidXRlcy5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihwcm9wZXJ0eU5hbWUpIHtcblxuICAgICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzW3Byb3BlcnR5TmFtZV0gPSBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpLmNyZWF0ZVZhbHVlKCkgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gc2NoZW1hQXR0cmlidXRlcy5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKS5jcmVhdGVWYWx1ZSgpXG4gICAgICAgICAgOiBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpWzBdLmRlZmF1bHRWYWx1ZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIHJlc3VsdC5kYXRhLnJlbGF0aW9uc2hpcHMgPSBzZWxmLl9nZXRFbXB0eURhdGFSZWxhdGlvbnMoc2NoZW1hKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZW1wdHkgdmFsdWUgcmVsYXRpb25zaGlwcyByZXNvdXJjZSBmb3IgbW9kZWxcbiAgICAgKlxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0RW1wdHlEYXRhUmVsYXRpb25zXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAgICogQHJldHVybnMge3t9fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbiA9IHt9O1xuXG4gICAgICB2YXIgZGF0YVNjaGVtYSA9IHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCk7XG4gICAgICB2YXIgYXR0cmlidXRlc1NjaGVtYSA9IGRhdGFTY2hlbWEucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgcmVsYXRpb25zU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc1NjaGVtYS5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihyZWxhdGlvbk5hbWUpIHtcblxuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hID0gYXR0cmlidXRlc1NjaGVtYS5wcm9wZXJ0eVNjaGVtYXMocmVsYXRpb25OYW1lKS5nZXRGdWxsKCk7XG5cbiAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXSA9IHt9O1xuICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdLmxpbmtzID0ge307XG4gICAgICAgIGlmIChhdHRyaWJ1dGVTY2hlbWEuYmFzaWNUeXBlcygpLnRvU3RyaW5nKCkgPT0gJ2FycmF5Jykge1xuICAgICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0uZGF0YSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0uZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlbGF0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAbmFtZSBFbnRpdHkjZmV0Y2hDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHthcnJheX0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgdmFyIGxpbmtzO1xuXG4gICAgICBsaW5rcyA9IF8udW5pcShsaW5rUmVzb3VyY2VzKTtcblxuICAgICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24oZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaXJjdW12ZW50aW9uIHRoZSBhcnJheSByZWxhdGlvbnNoaXBzIGFuZCBnZXQgbGlua3MgZm9yIGxhdGUgdGhlbSBsb2FkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IGxpbmsgZm9yIGdldCByZXNvdXJjZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbnM7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICAgIGlmIChyZWxhdGlvbnMgPSBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykudmFsdWUoKSkge1xuICAgICAgICBfLmZvckVhY2gocmVsYXRpb25zLCBmdW5jdGlvbihyZWxJdGVtLCByZWxLZXkpIHtcbiAgICAgICAgICByZXN1bHRbcmVsS2V5XSA9IHNlbGYuX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmsgZnJvbSByZWxhdGlvbiBmb3IgbG9hZCByZXNvdXJjZSBkYXRhXG4gICAgICpcbiAgICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICAgKiBAbmFtZSBFbnRpdHkjX2dldFJlbGF0aW9uTGlua1xuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc291cmNlID0gW107XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbEl0ZW0uZGF0YSkpIHtcbiAgICAgICAgdmFyIGxpbmtBcnJheSA9IFtdO1xuICAgICAgICBfLmZvckVhY2gocmVsSXRlbS5kYXRhLCBmdW5jdGlvbihkYXRhT2JqKSB7XG4gICAgICAgICAgbGlua0FycmF5LnB1c2goe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGRhdGFPYmouaWR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2UgPSBsaW5rQXJyYXk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghXy5pc0VtcHR5KHJlbEl0ZW0ubGlua3MpICYmICFfLmlzRW1wdHkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICAgIHJlc291cmNlID0gW3tcbiAgICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiByZWxJdGVtLmRhdGEuaWR9KVxuICAgICAgICAgIH1dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc291cmNlID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGlua3MgZnJvbSBkYXRhIHJlbGF0aW9uc2hpcHMgc2VjdGlvblxuICAgICAqIElOUFVUOlxuICAgICAqICAgXCJkYXRhXCI6IFt7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICAgIFwiYXV0aG9yXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgICB9LFxuICAgICAqICAgICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJ1c2Vyc1wiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgICAgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgfV1cbiAgICAgKiBPVVRQVVQ6XG4gICAgICogICBbXG4gICAgICogICAgICBodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9hdXRob3IvOVxuICAgICAqICAgXVxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93KSB7XG4gICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCkge1xuICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0pIHtcblxuICAgICAgICAgICAgcmVzdWx0LnB1c2gocmVsSXRlbS51cmwpO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgKGJhdGNoKSBsb2FkIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSByb3dzUmVsYXRpb25zaGlwc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9iYXRjaExvYWREYXRhKHJvd3NSZWxhdGlvbnNoaXBzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihnZXRMaW5rRnJvbVJvd3NEYXRhUmVsYXRpb25zKHJvd3NSZWxhdGlvbnNoaXBzKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdywga1Jvdykge1xuICAgICAgICAgIHJlc3VsdFtrUm93XSA9IHJlc3VsdFtrUm93XSB8fCB7fTtcbiAgICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwsIGtSZWwpIHtcbiAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXSA9IHJlc3VsdFtrUm93XVtrUmVsXSB8fCBbXTtcbiAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtSZWxJdGVtKSB7XG4gICAgICAgICAgICAgIHJlc3VsdFtrUm93XVtrUmVsXVtrUmVsSXRlbV0gPSByZXNvdXJjZXNbcmVsSXRlbS51cmxdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZFRhYmxlJywgJ2dyaWRGb3JtJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkVGFibGUsIGdyaWRGb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBncmlkVGFibGUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBncmlkRm9ybSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkRm9ybScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRGb3JtLCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIHZhciBmb3JtSW5zdCA9IG5ldyBncmlkRm9ybSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkdGltZW91dCwgJHNjb3BlKSB7XG4gICAgLyoqIEB0eXBlIHtncmlkVGFibGV9ICovXG4gICAgdmFyIHRhYmxlSW5zdCA9IG5ldyBncmlkVGFibGUoJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG4gICAgJHNjb3BlLnRhYmxlSW5zdCA9IHRhYmxlSW5zdDtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uQmVmb3JlTG9hZERhdGEnKTtcblxuICAgICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uTG9hZERhdGEnKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlUGFnaW5hdGlvbicsIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSk7XG5cbnRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtcGFnaW5hdGlvbi5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IHRhYmxlUGFnaW5hdGlvbkN0cmxcbiAgfTtcblxuICB0YWJsZVBhZ2luYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259ICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSAkc2NvcGUudGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRUaGVhZEN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHIpIHtcbiAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3NvcnRpbmcgYmVmb3JlIGxvYWQnKTtcbiAgICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSAkc2NvcGUudGFibGVJbnN0LmNvbHVtbnM7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkcyA9IHNvcnRpbmcuc29ydEZpZWxkcztcbiAgICAgICRzY29wZS5zZXRTb3J0aW5nKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZpZWxkID0gc29ydGluZy5nZXRDb2x1bW4oKTtcblxuICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgIF8ud2hlcmUodGhpcy5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgdmFyIGRpcmVjdGlvbjtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBkaXJlY3Rpb24gPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGRpcmVjdGlvbik7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1WYWx1ZSgpKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWxcIixcIjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJzaG93XFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIHRhYmxlLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxkaXYgdGFibGUtcGFnaW5hdGlvbiB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L2Rpdj5cXG48L2dyaWQtdGFibGU+XFxuXFxuPCEtLTxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj4tLT5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9