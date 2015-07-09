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
                _getRelationResources: _getRelationResources,
                _simplifyExtendedSchema: _simplifyExtendedSchema,
                _getExtendEnumSchema: _getExtendEnumSchema,
                _getEnumValues: _getEnumValues,
                _getInfoRelationResourcesForTitleMap: _getInfoRelationResourcesForTitleMap,
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
                        self.schema = data.attributes().schemas()[0].data.value();
                        _.forEach(self.schema.properties, function (value, key) {
                            self.schema.properties[key] = self._simplifyExtendedSchema(data, key);
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
                var fields = data.attributes().value();
                data.relationships().properties(function (key, relation) {
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
                self._createTitleMap(data, function (titleMaps) {
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
            function _getInfoRelationResourcesForTitleMap(data, callback) {
                var self = this;
                var sourceTitleMaps = [];
                self._getRelationResources(data, function (resources) {
                    _.forEach(resources, function (enums) {
                        var propertyData = enums.relationData;
                        var attributeData = data.attributes().property(propertyData.parentKey());
                        var sourceEnum = self._getEnumValues(enums.resourceData);
                        var attributeSchemas = data.attributes().schemas().propertySchemas(propertyData.parentKey());
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
   * Download resource for all relationships
   * callback object where
   *    relationData - Jsonary object definition relationships part,
   *    resourceData - Object loaded resources
   *
   * @param data
   * @param callback
   */
            function _getRelationResources(data, callback) {
                var self = this;
                var resources = [];
                var result = [];
                data.property('data').property('relationships').properties(function (propertyName, propertyData) {
                    if (!_.isEmpty(propertyData.links('relation'))) {
                        resources.push({
                            url: propertyData.links('relation')[0].href,
                            data: propertyData
                        });
                    }
                });
                self.fetchCollection(_.map(resources, 'url'), function (loadResources) {
                    _.forEach(resources, function (res, key) {
                        result[key] = {
                            relationData: res.data,
                            resourceData: loadResources[res.url].data
                        };
                    });
                    callback(result);
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
            function _simplifyExtendedSchema(data, key) {
                var schemas = data.attributes().schemas().propertySchemas(key).getFull();
                var schemasEnum = data.attributes().property(key).schemas().getFull();
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
                self._getInfoRelationResourcesForTitleMap(data, function (infoRelationResource) {
                    self.fetchCollection(_.map(infoRelationResource, 'url'), function (resources) {
                        var titleMaps = {};
                        _.forEach(infoRelationResource, function (item) {
                            if (!titleMaps[item.relationName]) {
                                titleMaps[item.relationName] = [];
                            }
                            titleMaps[item.relationName].push({
                                value: item.enumItem,
                                name: resources[item.url].data.attributes().propertyValue(item.attributeName) || item.enumItem
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
            var provider = {
                messages: {
                    successDeleted: 'Successfully delete',
                    successCreated: 'Successfully create',
                    successUpdated: 'Successfully update',
                    serverError: 'Oops! server error'
                },
                $get: gridEntityGet
            };
            gridEntityGet.$inject = [
                '_',
                '$q'
            ];
            return provider;
            function gridEntityGet(_, $q) {
                var model;
                var messages = this.messages;
                /**
     * Base class with functionality handling resources
     *
     * @class
     * @constructor
     */
                function Entity() {
                    Jsonary.extendData({
                        relationshipsValue: function () {
                            return this.propertyValue('relationships');
                        },
                        attributesValue: function () {
                            return this.propertyValue('attributes');
                        },
                        relationships: function () {
                            return this.property('data').property('relationships');
                        },
                        attributes: function () {
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
                Entity.prototype.config = {};
                Entity.prototype.default = { actionGetResource: 'read' };
                angular.extend(Entity.prototype, {
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
                    if (!params.type) {
                        return result;
                    }
                    if (params.type === 'update' || params.type === 'read') {
                        result += '/' + params.type + '/' + params.id;
                    } else if (params.type === 'create') {
                        result += '/schema#/definitions/create';
                    }
                    return result;
                }
                /**
     * Fetch data by url and include schema from header data
     * @param url
     * @param callback
     * @returns {boolean}
     */
                function loadData(url) {
                    return $q(function (resolve) {
                        Jsonary.getData(url, function (jData, request) {
                            var data = jData;
                            var schema = jData.property('data').schemas()[0].data.document.raw.value();
                            resolve({
                                data: data,
                                schema: schema,
                                request: request
                            });
                        });
                    });
                }
                /**
     * Fetch schema by url, create empty data and join them
     * @param url
     * @param callback
     */
                function loadSchema(url) {
                    var self = this;
                    return $q(function (resolve) {
                        Jsonary.getSchema(url, function (jSchema) {
                            var schema = jSchema.data.document.raw.value();
                            var data = Jsonary.create(self._getEmptyData(jSchema));
                            data.document.url = self.getModel().url;
                            data.addSchema(jSchema);
                            resolve({
                                data: data,
                                schema: schema
                            });
                        });
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
                        relation[relationName] = {
                            links: {},
                            data: attributeSchema.basicTypes().indexOf('array') >= 0 ? [] : {}
                        };
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
                    var self = this;
                    if (model.params.type === 'create') {
                        self.loadSchema(url).then(fetchDataSuccess);
                    } else {
                        self.loadData(url).then(fetchDataSuccess);
                    }
                    function fetchDataSuccess(response) {
                        self.data = response.data;
                        if (callback !== undefined) {
                            callback(response.data, response.schema);
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
                    var allRequest = [];
                    var resources = {};
                    var links = _.uniq(linkResources);
                    _.forEach(links, function (url) {
                        var request = self.loadData(url).then(function (response) {
                            resources[url] = response;
                        });
                        allRequest.push(request);
                    });
                    $q.all(allRequest).then(function () {
                        callback(resources);
                    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFJlbGF0aW9uUmVzb3VyY2VzIiwiX3NpbXBsaWZ5RXh0ZW5kZWRTY2hlbWEiLCJfZ2V0RXh0ZW5kRW51bVNjaGVtYSIsIl9nZXRFbnVtVmFsdWVzIiwiX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEZvcm1CdXR0b25CeVNjaGVtYSIsInNlbGYiLCJjYWxsYmFjayIsImdldE1vZGVsIiwidXJsIiwiZ2V0UmVzb3VyY2VVcmwiLCJwYXJhbXMiLCJmZXRjaERhdGEiLCJmZXRjaERhdGFTdWNjZXNzIiwiZGF0YSIsImNhbGxiYWNrRm9ybUNvbmZpZyIsImNvbmZpZyIsImF0dHJpYnV0ZXMiLCJzY2hlbWFzIiwidmFsdWUiLCJmb3JFYWNoIiwicHJvcGVydGllcyIsImtleSIsInVuaW9uIiwicHJvcGVydHkiLCJ1bmRlZmluZWQiLCJmaWVsZHMiLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJiYXNpY1R5cGVzIiwiaW5kZXhPZiIsIm1hcCIsInByb3BlcnR5VmFsdWUiLCJpZCIsInJlc3VsdCIsInRpdGxlTWFwcyIsInByb3BlcnR5U2NoZW1hcyIsImdldEZ1bGwiLCJkZWZpbmVkUHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiZW51bVZhbHVlcyIsIml0ZW1zIiwiaW5kZXgiLCJzb3VyY2VUaXRsZU1hcHMiLCJyZXNvdXJjZXMiLCJlbnVtcyIsInByb3BlcnR5RGF0YSIsInJlbGF0aW9uRGF0YSIsImF0dHJpYnV0ZURhdGEiLCJwYXJlbnRLZXkiLCJzb3VyY2VFbnVtIiwicmVzb3VyY2VEYXRhIiwiYXR0cmlidXRlU2NoZW1hcyIsImFkZFNjaGVtYSIsImVudW1JdGVtIiwiaHJlZiIsInR5cGUiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJyZWxhdGlvbk5hbWUiLCJhdHRyaWJ1dGVOYW1lIiwicmVsYXRpb25GaWVsZCIsInByb3BlcnR5TmFtZSIsImlzRW1wdHkiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwicmVzIiwic2NoZW1hc0VudW0iLCJhbmRTY2hlbWFzIiwibGVuZ3RoIiwicmVwbGFjZUFsbE9mU2NoZW1hIiwiYWxsT2YiLCJhbmRTY2hlbWEiLCJtZXJnZSIsInNjaGVtYUxpc3QiLCJtZXJnZU9iaiIsInRvU3RyaW5nIiwiZW51bSIsIkpzb25hcnkiLCJjcmVhdGVTY2hlbWEiLCJpbmZvUmVsYXRpb25SZXNvdXJjZSIsIml0ZW0iLCJuYW1lIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInN0clRvT2JqZWN0IiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibiIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJjaGFpbiIsInNsaWNlIiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsInJvd1RvVGFibGVGb3JtYXQiLCJnZXRTb3J0aW5nUGFyYW1CeUZpZWxkIiwiZ2V0U29ydGluZ1BhcmFtVmFsdWUiLCJfZ2V0Um93c0J5RGF0YSIsIl9nZXRMaW5rcyIsInJlbCIsImFsbENvbHVtbnMiLCJyb3ciLCJyb3dSZXN1bHQiLCJvd24iLCJyZWxhdGlvbkl0ZW0iLCJmb3JPd24iLCJpbmNsdWRlZCIsIl9nZXRSZWxhdGlvblJlc291cmNlIiwiX2JhdGNoTG9hZERhdGEiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwidG1wUm93IiwibWFwVmFsdWVzIiwicHJvdmlkZXIiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkcSIsIkVudGl0eSIsImV4dGVuZERhdGEiLCJyZWxhdGlvbnNoaXBzVmFsdWUiLCJhdHRyaWJ1dGVzVmFsdWUiLCJleHRlbmRTY2hlbWEiLCJleHRlbmRTY2hlbWFMaXN0IiwiZWFjaCIsInNldE1lc3NhZ2UiLCJnZXRNZXNzYWdlIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiX2dldEVtcHR5RGF0YSIsIl9nZXRFbXB0eURhdGFSZWxhdGlvbnMiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJyZXNvdXJjZSIsInJlc29sdmUiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiY3JlYXRlVmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVzIiwiZGVmYXVsdFZhbHVlIiwiZGF0YVNjaGVtYSIsImF0dHJpYnV0ZXNTY2hlbWEiLCJyZWxhdGlvbnNTY2hlbWEiLCJhdHRyaWJ1dGVTY2hlbWEiLCJ0aGVuIiwicmVzcG9uc2UiLCJsaW5rUmVzb3VyY2VzIiwiYWxsUmVxdWVzdCIsInVuaXEiLCJhbGwiLCJyZWxhdGlvbnMiLCJyZWxJdGVtIiwicmVsS2V5IiwiQXJyYXkiLCJpc0FycmF5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsInRhYmxlIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiZm9ybUluc3QiLCJncmlkTW9kZWwiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ0YWJsZUluc3QiLCJ0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUiLCJyZXF1aXJlIiwidGVtcGxhdGVVcmwiLCJ0YWJsZVBhZ2luYXRpb25DdHJsIiwiJG9uIiwic2VhcmNoIiwicGFnZSIsInNob3ciLCJzZXRQYWdpbmF0aW9uIiwidG90YWxJdGVtcyIsIml0ZW1zUGVyUGFnZSIsInBhZ2VDaGFuZ2VkIiwicGFnZU5vIiwiZ3JpZFRoZWFkRGlyZWN0aXZlIiwiZ3JpZFRoZWFkQ3RybCIsImVsZW1lbnQiLCJhdHRyIiwiY29uc29sZSIsImxvZyIsInNldFNvcnRpbmdCeVNlYXJjaCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwibGFzdEluZGV4T2YiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FBRUFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUNuQkFOLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFVBQUEsRUFBQUUsUUFBQSxFO1FBQ0FBLFFB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QUFBLEVBQUF5QyxvQkFOQTtBQUFBLGdCQU9BNU8sSUFBQSxFQUFBLFVBQUF1SixLQUFBLEVBQUFzRixFQUFBLEVBQUFYLElBQUEsRUFBQVksSUFBQSxFQUFBO0FBQUEsaUJBUEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQWFBRixvQkFBQSxDQUFBbFYsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBYkE7QUFBQSxZQWVBLE9BQUFzUyxTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBNEMsb0JBQUEsQ0FBQXZDLE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUEwQyxjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUExQyxNQUFBLENBQUFHLFNBQUEsQ0FBQWxSLE1BQUEsQ0FBQThDLElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBbEYsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBNlYsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDByQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRSZWxhdGlvblJlc291cmNlczogX2dldFJlbGF0aW9uUmVzb3VyY2VzLFxuICAgIF9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hOiBfc2ltcGxpZnlFeHRlbmRlZFNjaGVtYSxcbiAgICBfZ2V0RXh0ZW5kRW51bVNjaGVtYTogX2dldEV4dGVuZEVudW1TY2hlbWEsXG4gICAgX2dldEVudW1WYWx1ZXM6IF9nZXRFbnVtVmFsdWVzLFxuICAgIF9nZXRJbmZvUmVsYXRpb25SZXNvdXJjZXNGb3JUaXRsZU1hcDogX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBuZWVkZWQgZGF0YSBmb3IgcmVuZGVyaW5nIENSVURcbiAgICpcbiAgICogQG5hbWUgRm9ybSNnZXRGb3JtSW5mb1xuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEpIHtcblxuICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChkYXRhKTtcbiAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgIHNlbGYuc2NoZW1hID0gZGF0YS5hdHRyaWJ1dGVzKCkuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKTtcbiAgICAgICAgXy5mb3JFYWNoKHNlbGYuc2NoZW1hLnByb3BlcnRpZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBzZWxmLnNjaGVtYS5wcm9wZXJ0aWVzW2tleV0gPSBzZWxmLl9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hKGRhdGEsIGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChkYXRhKSB7XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEuYXR0cmlidXRlcygpLnZhbHVlKCk7XG5cbiAgICBkYXRhLnJlbGF0aW9uc2hpcHMoKS5wcm9wZXJ0aWVzKGZ1bmN0aW9uKGtleSwgcmVsYXRpb24pIHtcblxuICAgICAgaWYgKHJlbGF0aW9uLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpLmJhc2ljVHlwZXMoKS5pbmRleE9mKCdhcnJheScpID49IDApIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbi5wcm9wZXJ0eVZhbHVlKCdkYXRhJyksICdpZCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSByZWxhdGlvbi5wcm9wZXJ0eVZhbHVlKCdkYXRhJykuaWQ7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnNjaGVtYXMoKVxuICAgICAgICAucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpXG4gICAgICAgIC5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKS5kZWZpbmVkUHJvcGVydGllcygpO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZW51bSB2YWx1ZXMgZm9yIHNjaGVtYSB3aXRoIGFsbE9mXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jX2dldEVudW1WYWx1ZXNcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMge1tdfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVudW1WYWx1ZXMoZGF0YSkge1xuICAgIHZhciBlbnVtVmFsdWVzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICBlbnVtVmFsdWVzLnB1c2godmFsdWUucHJvcGVydHlWYWx1ZSgnaWQnKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZW51bVZhbHVlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0aXRsZU1hcCBmb3IgcmVsYXRpb24gcmVzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0SW5mb1JlbGF0aW9uUmVzb3VyY2VzRm9yVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZXMoZGF0YSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKGVudW1zKSB7XG5cbiAgICAgICAgdmFyIHByb3BlcnR5RGF0YSA9IGVudW1zLnJlbGF0aW9uRGF0YTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZURhdGEgPSBkYXRhLmF0dHJpYnV0ZXMoKS5wcm9wZXJ0eShwcm9wZXJ0eURhdGEucGFyZW50S2V5KCkpO1xuXG4gICAgICAgIHZhciBzb3VyY2VFbnVtID0gc2VsZi5fZ2V0RW51bVZhbHVlcyhlbnVtcy5yZXNvdXJjZURhdGEpO1xuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hcyA9IGRhdGEuYXR0cmlidXRlcygpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKTtcblxuICAgICAgICBhdHRyaWJ1dGVEYXRhLmFkZFNjaGVtYShzZWxmLl9nZXRFeHRlbmRFbnVtU2NoZW1hKGF0dHJpYnV0ZVNjaGVtYXMsIHNvdXJjZUVudW0pKTtcblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24oZW51bUl0ZW0pIHtcbiAgICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZiwge1xuICAgICAgICAgICAgICB0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsXG4gICAgICAgICAgICAgIGlkOiBlbnVtSXRlbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICAgIHJlbGF0aW9uTmFtZTogcHJvcGVydHlEYXRhLnBhcmVudEtleSgpLFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogcHJvcGVydHlEYXRhLnNjaGVtYXMoKS5yZWxhdGlvbkZpZWxkKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhzb3VyY2VUaXRsZU1hcHMpO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWQgcmVzb3VyY2UgZm9yIGFsbCByZWxhdGlvbnNoaXBzXG4gICAqIGNhbGxiYWNrIG9iamVjdCB3aGVyZVxuICAgKiAgICByZWxhdGlvbkRhdGEgLSBKc29uYXJ5IG9iamVjdCBkZWZpbml0aW9uIHJlbGF0aW9uc2hpcHMgcGFydCxcbiAgICogICAgcmVzb3VyY2VEYXRhIC0gT2JqZWN0IGxvYWRlZCByZXNvdXJjZXNcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZXMoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc291cmNlcyA9IFtdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnRpZXMoZnVuY3Rpb24ocHJvcGVydHlOYW1lLCBwcm9wZXJ0eURhdGEpIHtcblxuICAgICAgaWYgKCFfLmlzRW1wdHkocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpKSkge1xuICAgICAgICByZXNvdXJjZXMucHVzaCh7XG4gICAgICAgICAgdXJsOiBwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZixcbiAgICAgICAgICBkYXRhOiBwcm9wZXJ0eURhdGFcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHJlc291cmNlcywgJ3VybCcpLCBmdW5jdGlvbihsb2FkUmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKHJlcywga2V5KSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0ge1xuICAgICAgICAgIHJlbGF0aW9uRGF0YTogcmVzLmRhdGEsXG4gICAgICAgICAgcmVzb3VyY2VEYXRhOiBsb2FkUmVzb3VyY2VzW3Jlcy51cmxdLmRhdGFcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICB9KVxuXG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBleHRlbmRlZCBzY2hlbWEgdG8gc2ltcGxlIHNjaGVtYS4gRm9yIGV4YW1wbGUgaWYgc2NoZW1hIGhhcyBwcm9wZXJ0eSBhbGxPZlxuICAgKiB0aGVuIHdpbGwgYmUgcmVwbGFjZWQgb24gc2NoZW1hIHdoaWNoICBtZXJnZSBhbGwgaXRlbXMgYWxsT2YgZWxzZSByZXR1cm4gc2NoZW1hIHdpdGhvdXQgY2hhbmdlZFxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0ga2V5IEF0dHJpYnV0ZSBvciByZWxhdGlvbnNoaXBzIGtleVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIF9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hKGRhdGEsIGtleSkge1xuICAgIHZhciBzY2hlbWFzID0gZGF0YS5hdHRyaWJ1dGVzKCkuc2NoZW1hcygpLnByb3BlcnR5U2NoZW1hcyhrZXkpLmdldEZ1bGwoKTtcbiAgICB2YXIgc2NoZW1hc0VudW0gPSBkYXRhLmF0dHJpYnV0ZXMoKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKS5nZXRGdWxsKCk7XG5cbiAgICBpZiAoc2NoZW1hc1swXS5hbmRTY2hlbWFzKCkubGVuZ3RoKSB7XG4gICAgICB2YXIgcmVwbGFjZUFsbE9mU2NoZW1hID0gc2NoZW1hc1swXS5kYXRhLnZhbHVlKCk7XG4gICAgICBkZWxldGUgcmVwbGFjZUFsbE9mU2NoZW1hLmFsbE9mO1xuXG4gICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hc1swXS5hbmRTY2hlbWFzKCksIGZ1bmN0aW9uKGFuZFNjaGVtYSkge1xuICAgICAgICByZXBsYWNlQWxsT2ZTY2hlbWEgPSBhbmd1bGFyLmV4dGVuZChhbmRTY2hlbWEuZGF0YS52YWx1ZSgpLCByZXBsYWNlQWxsT2ZTY2hlbWEpXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXBsYWNlQWxsT2ZTY2hlbWE7XG4gICAgfVxuXG4gICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHNjaGVtYXNbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWFzRW51bVswXS5kYXRhLnZhbHVlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBTdWJTY2hlbWEgd2l0aCBkeW5hbWljIGxvYWQgZW51bXMgZmllbGRzXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jX2dldEV4dGVuZEVudW1TY2hlbWFcbiAgICogQHBhcmFtIHNjaGVtYUxpc3RcbiAgICogQHBhcmFtIHNvdXJjZUVudW1cbiAgICogQHJldHVybnMgeyp9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RXh0ZW5kRW51bVNjaGVtYShzY2hlbWFMaXN0LCBzb3VyY2VFbnVtKSB7XG4gICAgdmFyIG1lcmdlT2JqO1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBpZiAoc2NoZW1hTGlzdC5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICBtZXJnZU9iaiA9IHtcbiAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICBlbnVtOiBzb3VyY2VFbnVtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VPYmogPSB7ZW51bTogc291cmNlRW51bX1cbiAgICB9XG5cbiAgICByZXN1bHQgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShcbiAgICAgIF8ubWVyZ2Uoe30sIHNjaGVtYUxpc3RbMF0uZGF0YS52YWx1ZSgpLCBtZXJnZU9iailcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwKGRhdGEsIGZ1bmN0aW9uKGluZm9SZWxhdGlvblJlc291cmNlKSB7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKGluZm9SZWxhdGlvblJlc291cmNlLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKGluZm9SZWxhdGlvblJlc291cmNlLCBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEuYXR0cmlidXRlcygpXG4gICAgICAgICAgICAgIC5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbih1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykpXG4gICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgIC5vYmplY3QoKVxuICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JyArIHNlYXJjaFBhdGggOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHVybCB3aXRoIHNldCBwYWdlIHBhcmFtcyAob2Zmc2V0LCBsaW1pdClcbiAgICpcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIFNvcnRpbmcgdGFibGUgY2xhc3NcbiAgICpcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gU29ydGluZygpIHtcbiAgICB0aGlzLnNvcnRQYXJhbSA9ICdzb3J0JztcbiAgfVxuXG4gIFNvcnRpbmcuRElSRUNUSU9OX0FTQyA9ICdhc2MnO1xuICBTb3J0aW5nLkRJUkVDVElPTl9ERVNDID0gJ2Rlc2MnO1xuICBTb3J0aW5nLmZpZWxkID0gdW5kZWZpbmVkO1xuICBTb3J0aW5nLmRpcmVjdGlvbiA9ICcnO1xuICBTb3J0aW5nLnNvcnRGaWVsZHMgPSBbXTtcblxuICBhbmd1bGFyLmV4dGVuZChTb3J0aW5nLnByb3RvdHlwZSwge1xuICAgIGdldENvbHVtbjogZ2V0Q29sdW1uLFxuICAgIGdldERpcmVjdGlvbkNvbHVtbjogZ2V0RGlyZWN0aW9uQ29sdW1uLFxuICAgIHNldFNvcnRGaWVsZHM6IHNldFNvcnRGaWVsZHMsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBnZXRVcmw6IGdldFVybFxuICB9KTtcblxuICByZXR1cm4gU29ydGluZztcblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXREaXJlY3Rpb25Db2x1bW5cbiAgICogQHBhcmFtIGN1cnJlbnREaXJlY3Rpb25cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXREaXJlY3Rpb25Db2x1bW4oY3VycmVudERpcmVjdGlvbikge1xuICAgIGlmICghY3VycmVudERpcmVjdGlvbikge1xuICAgICAgcmV0dXJuICdhc2MnO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudERpcmVjdGlvbiA9PSAnYXNjJyA/ICdkZXNjJyA6ICcnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb2x1bW4gZm9yIGZpZWxkIGlmIGZpZWxkIGhhdmUgJy4nIHRoZW4gZ2V0IGZpcnN0IHBhcnRcbiAgICogRm9yIGV4YW1wbGU6ICd1c2VyLm5hbWUnIHJldHVybiAndXNlcidcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRDb2x1bW5cbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ3x1bmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW4oKSB7XG4gICAgaWYgKHRoaXMuZmllbGQpIHtcbiAgICAgIGlmICh0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSA+PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkLnNsaWNlKDAsIHRoaXMuZmllbGQuaW5kZXhPZignLicpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZmllbGQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRpbmdcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZmllbGQgPSBmaWVsZDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRGaWVsZHNcbiAgICogQHBhcmFtIGZpZWxkc1xuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydEZpZWxkcyhmaWVsZHMpIHtcbiAgICB0aGlzLnNvcnRGaWVsZHMgPSBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHVybCB3aXRoIHNldCBwYXJhbSBzb3J0aW5nXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIGlmICghdGhpcy5maWVsZCkge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuICAgIHNlYXJjaFBhcmFtc1tzZWxmLnNvcnRQYXJhbSArICdbJyArIHNlbGYuZmllbGQgKyAnXSddID0gc2VsZi5kaXJlY3Rpb247XG5cbiAgICByZXR1cm4gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uczogZ2V0Q29sdW1ucyxcbiAgICBnZXRDb2x1bW5zQnlTY2hlbWE6IGdldENvbHVtbnNCeVNjaGVtYSxcbiAgICByb3dzVG9UYWJsZUZvcm1hdDogcm93c1RvVGFibGVGb3JtYXQsXG4gICAgcm93VG9UYWJsZUZvcm1hdDogcm93VG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIGdldFNvcnRpbmdQYXJhbVZhbHVlOiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YSxcbiAgICBfZ2V0TGlua3M6IF9nZXRMaW5rc1xuICB9KTtcblxuICByZXR1cm4gVGFibGU7XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcm93czogc2VsZi5yb3dzLFxuICAgICAgY29sdW1uczogc2VsZi5jb2x1bW5zLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpO1xuICAgIHZhciB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnMoZGF0YSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuXG4gICAgaWYgKHJlbCkge1xuICAgICAgcmVzdWx0ICs9ICcuJyArIHJlbDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB2YWx1ZSBmb3Igc29ydGluZyBHRVQgcGFyYW1cbiAgICpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zb3J0aW5nLmRpcmVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCh0aGlzLnNvcnRpbmcuZmllbGQpICsgJ18nICsgdGhpcy5zb3J0aW5nLmRpcmVjdGlvblxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hIGFuZCBzZXQgc29ydGFibGUgZmllbGRzXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI2dldENvbHVtbnNCeVNjaGVtYVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgIHZhciByZWxhdGlvbnNoaXBzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgIHZhciBhbGxDb2x1bW5zID0gXy51bmlvbihzZWxmLmdldENvbHVtbnNCeVNjaGVtYShhdHRyaWJ1dGVzKSwgc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEocmVsYXRpb25zaGlwcykpO1xuXG4gICAgc2VsZi5zb3J0aW5nLnNldFNvcnRGaWVsZHMoXy5tYXAoYWxsQ29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICBhbGxDb2x1bW5zLnB1c2goe1xuICAgICAgdGl0bGU6ICdBY3Rpb25zJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGFsbENvbHVtbnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbnMgYW5kIGF0dGFjaCBhdHRyaWJ1dGVOYW1lIGluIGNvbHVtbiBmb3IgcmVuZGVyaW5nXG4gICAqXG4gICAqIEBwYXJhbSBjb2x1bW5zXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShjb2x1bW5zKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGNvbHVtbnMucHJvcGVydGllcyhmdW5jdGlvbihrZXksIHByb3BlcnR5KSB7XG4gICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI3Jvd3NUb1RhYmxlRm9ybWF0XG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHNlbGYucm93VG9UYWJsZUZvcm1hdChyb3cpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBkYXRhIHRvIHJlbmRlciB2aWV3IGRhdGEgaW4gdGFibGVcbiAgICpcbiAgICogQHBhcmFtIHJvdyBDb25zaXN0cyBvZiBvd24gYW5kIHJlbGF0aW9uc2hpcHMgZGF0YVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd1RvVGFibGVGb3JtYXQocm93KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByb3dSZXN1bHQgPSByb3cub3duLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuXG4gICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHlTY2hlbWFzKGtleSkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pLmpvaW4oJywgJyk7XG5cbiAgICB9KTtcblxuICAgIHJvd1Jlc3VsdC5saW5rcyA9IHNlbGYuX2dldExpbmtzKHJvdy5vd24pO1xuXG4gICAgcmV0dXJuIHJvd1Jlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbGlua3MgZm9yIGN1cnJlbnQgZGF0YVxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0TGlua3MoZGF0YSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxpbmspO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI19nZXRSb3dzQnlEYXRhXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UodmFsdWUpKTtcbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgbWVzc2FnZXM6IHtcbiAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgIH0sXG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnXycsICckcSddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KF8sICRxKSB7XG4gICAgdmFyIG1vZGVsO1xuICAgIHZhciBtZXNzYWdlcyA9IHRoaXMubWVzc2FnZXM7XG5cbiAgICAvKipcbiAgICAgKiBCYXNlIGNsYXNzIHdpdGggZnVuY3Rpb25hbGl0eSBoYW5kbGluZyByZXNvdXJjZXNcbiAgICAgKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcblxuICAgICAgSnNvbmFyeS5leHRlbmREYXRhKHtcbiAgICAgICAgcmVsYXRpb25zaGlwc1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eVZhbHVlKCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGF0dHJpYnV0ZXNWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgnYXR0cmlidXRlcycpO1xuICAgICAgICB9LFxuICAgICAgICByZWxhdGlvbnNoaXBzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hKHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWxhdGlvbkZpZWxkJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWFMaXN0KHtcbiAgICAgICAgcmVsYXRpb25GaWVsZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHJlbGF0aW9uRmllbGQgPSBudWxsO1xuICAgICAgICAgIHRoaXMuZ2V0RnVsbCgpLmVhY2goZnVuY3Rpb24oaW5kZXgsIHNjaGVtYSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gc2NoZW1hLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIChyZWxhdGlvbkZpZWxkID09IG51bGwgfHwgdmFsdWUgPCByZWxhdGlvbkZpZWxkKSkge1xuICAgICAgICAgICAgICByZWxhdGlvbkZpZWxkID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHJlbGF0aW9uRmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgRW50aXR5LnByb3RvdHlwZS5jb25maWcgPSB7fTtcbiAgICBFbnRpdHkucHJvdG90eXBlLmRlZmF1bHQgPSB7XG4gICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgfTtcblxuICAgIGFuZ3VsYXIuZXh0ZW5kKEVudGl0eS5wcm90b3R5cGUsIHtcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgICAgX2dldEVtcHR5RGF0YVJlbGF0aW9uczogX2dldEVtcHR5RGF0YVJlbGF0aW9ucyxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsKSB7XG4gICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSkge1xuXG4gICAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbihqU2NoZW1hKSB7XG5cbiAgICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEpKTtcbiAgICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgICByZXNvbHZlKHtkYXRhOiBkYXRhLCBzY2hlbWE6IHNjaGVtYX0pO1xuXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZW1wdHkgbW9kZWwgZm9yIGNyZWF0ZSBmb3JtXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgcmVzdWx0ID0gc2NoZW1hLmNyZWF0ZVZhbHVlKCk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0ge307XG5cbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVzID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIF8uZm9yRWFjaChzY2hlbWFBdHRyaWJ1dGVzLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHByb3BlcnR5TmFtZSkge1xuXG4gICAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXNbcHJvcGVydHlOYW1lXSA9IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSkuY3JlYXRlVmFsdWUoKSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpLmNyZWF0ZVZhbHVlKClcbiAgICAgICAgICA6IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSlbMF0uZGVmYXVsdFZhbHVlKCk7XG4gICAgICB9KTtcblxuICAgICAgcmVzdWx0LmRhdGEucmVsYXRpb25zaGlwcyA9IHNlbGYuX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBlbXB0eSB2YWx1ZSByZWxhdGlvbnNoaXBzIHJlc291cmNlIGZvciBtb2RlbFxuICAgICAqXG4gICAgICogQG5hbWUgRW50aXR5I19nZXRFbXB0eURhdGFSZWxhdGlvbnNcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHJldHVybnMge3t9fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEpIHtcbiAgICAgIHZhciByZWxhdGlvbiA9IHt9O1xuXG4gICAgICB2YXIgZGF0YVNjaGVtYSA9IHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCk7XG4gICAgICB2YXIgYXR0cmlidXRlc1NjaGVtYSA9IGRhdGFTY2hlbWEucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgcmVsYXRpb25zU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc1NjaGVtYS5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihyZWxhdGlvbk5hbWUpIHtcblxuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hID0gYXR0cmlidXRlc1NjaGVtYS5wcm9wZXJ0eVNjaGVtYXMocmVsYXRpb25OYW1lKS5nZXRGdWxsKCk7XG4gICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0gPSB7XG4gICAgICAgICAgbGlua3M6IHt9LFxuICAgICAgICAgIGRhdGE6IGF0dHJpYnV0ZVNjaGVtYS5iYXNpY1R5cGVzKCkuaW5kZXhPZignYXJyYXknKSA+PSAwID8gW10gOiB7fVxuICAgICAgICB9O1xuXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlbGF0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgc2VsZi5sb2FkU2NoZW1hKHVybCkudGhlbihmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsKS50aGVuKGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIHNlbGYuZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLCByZXNwb25zZS5zY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgbG9hZCByZXNvdXJjZSBieSBhcnJheSBsaW5rc1xuICAgICAqXG4gICAgICogQG5hbWUgRW50aXR5I2ZldGNoQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBhbGxSZXF1ZXN0ID0gW107XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odXJsKSB7XG5cbiAgICAgICAgdmFyIHJlcXVlc3QgPSBzZWxmLmxvYWREYXRhKHVybCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0gcmVzcG9uc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFsbFJlcXVlc3QucHVzaChyZXF1ZXN0KTtcbiAgICAgIH0pO1xuXG4gICAgICAkcS5hbGwoYWxsUmVxdWVzdCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0UmVsYXRpb25MaW5rXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkocmVsSXRlbS5saW5rcykgJiYgIV8uaXNFbXB0eShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgICAgfV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25CZWZvcmVMb2FkRGF0YScpO1xuXG4gICAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcblxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVQYWdpbmF0aW9uJywgdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKTtcblxudGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3cgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICB2YXIgZGlyZWN0aW9uO1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IGRpcmVjdGlvbiA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgZGlyZWN0aW9uKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbVZhbHVlKCkpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgdGFibGUtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGRpdiB0YWJsZS1wYWdpbmF0aW9uIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvZGl2PlxcbjwvZ3JpZC10YWJsZT5cXG5cXG48IS0tPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPi0tPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=