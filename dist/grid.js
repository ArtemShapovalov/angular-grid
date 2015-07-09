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
                _getRelationResources: _getRelationResources,
                _getRelationLink: _getRelationLink,
                _getRowsByData: _getRowsByData,
                _getLinks: _getLinks
            });
            return Table;
            /**
   * Get all data needed for rendering table
   *
   * @returns {{rows: *, columns: *, links: *}}
   */
            function getConfig() {
                var self = this;
                return {
                    rows: self.rows,
                    columns: self.columns,
                    links: self.links
                };
            }
            /**
   * Main function for get rendering data
   *
   * @param callback
   */
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
                function fetchDataSuccess(data) {
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
            /**
   * Get name sorting field and set it
   *
   * @param field
   * @param direction
   */
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
   * @param callback
   * @returns {Array}
   */
            function _getRowsByData(data, callback) {
                var self = this;
                var rows = [];
                var included = [];
                data.property('data').items(function (index, value) {
                    included.push(self._getRelationResources(value));
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
            /**
   * Circumvention the array relationships and get links for late them load
   *
   * @param data
   * @returns {Object} link for get resource
   */
            function _getRelationResources(data) {
                var self = this;
                var result = {};
                data.property('relationships').properties(function (relName, relData) {
                    result[relName] = self._getRelationLink(relData);
                });
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
                var resources = [];
                if (Array.isArray(relItem.propertyValue('data'))) {
                    relItem.property('data').items(function (index, dataObj) {
                        resources.push({
                            url: self.getResourceUrl(relItem.links()[0].href, {
                                type: self.default.actionGetResource,
                                id: dataObj.propertyValue('id')
                            })
                        });
                    });
                } else {
                    if (!_.isEmpty(relItem.links('relation'))) {
                        resources = [{
                                url: self.getResourceUrl(relItem.links('relation')[0].href, {
                                    type: self.default.actionGetResource,
                                    id: relItem.property('data').propertyValue('id')
                                })
                            }];
                    }
                }
                return resources;
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
                        result.data.attributes[propertyName] = schemaAttributes.propertySchemas(propertyName).createValue() != undefined ? schemaAttributes.propertySchemas(propertyName).createValue() : schemaAttributes.propertySchemas(propertyName)[0].defaultValue();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldFJlbGF0aW9uUmVzb3VyY2VzIiwiX3NpbXBsaWZ5RXh0ZW5kZWRTY2hlbWEiLCJfZ2V0RXh0ZW5kRW51bVNjaGVtYSIsIl9nZXRFbnVtVmFsdWVzIiwiX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEZvcm1CdXR0b25CeVNjaGVtYSIsInNlbGYiLCJjYWxsYmFjayIsImdldE1vZGVsIiwidXJsIiwiZ2V0UmVzb3VyY2VVcmwiLCJwYXJhbXMiLCJmZXRjaERhdGEiLCJmZXRjaERhdGFTdWNjZXNzIiwiZGF0YSIsImNhbGxiYWNrRm9ybUNvbmZpZyIsImNvbmZpZyIsImF0dHJpYnV0ZXMiLCJzY2hlbWFzIiwidmFsdWUiLCJmb3JFYWNoIiwicHJvcGVydGllcyIsImtleSIsInVuaW9uIiwicHJvcGVydHkiLCJ1bmRlZmluZWQiLCJmaWVsZHMiLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJiYXNpY1R5cGVzIiwiaW5kZXhPZiIsIm1hcCIsInByb3BlcnR5VmFsdWUiLCJpZCIsInJlc3VsdCIsInRpdGxlTWFwcyIsInByb3BlcnR5U2NoZW1hcyIsImdldEZ1bGwiLCJkZWZpbmVkUHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiZW51bVZhbHVlcyIsIml0ZW1zIiwiaW5kZXgiLCJzb3VyY2VUaXRsZU1hcHMiLCJyZXNvdXJjZXMiLCJlbnVtcyIsInByb3BlcnR5RGF0YSIsInJlbGF0aW9uRGF0YSIsImF0dHJpYnV0ZURhdGEiLCJwYXJlbnRLZXkiLCJzb3VyY2VFbnVtIiwicmVzb3VyY2VEYXRhIiwiYXR0cmlidXRlU2NoZW1hcyIsImFkZFNjaGVtYSIsImVudW1JdGVtIiwiaHJlZiIsInR5cGUiLCJkZWZhdWx0IiwiYWN0aW9uR2V0UmVzb3VyY2UiLCJyZWxhdGlvbk5hbWUiLCJhdHRyaWJ1dGVOYW1lIiwicmVsYXRpb25GaWVsZCIsInByb3BlcnR5TmFtZSIsImlzRW1wdHkiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwicmVzIiwic2NoZW1hc0VudW0iLCJhbmRTY2hlbWFzIiwibGVuZ3RoIiwicmVwbGFjZUFsbE9mU2NoZW1hIiwiYWxsT2YiLCJhbmRTY2hlbWEiLCJtZXJnZSIsInNjaGVtYUxpc3QiLCJtZXJnZU9iaiIsInRvU3RyaW5nIiwiZW51bSIsIkpzb25hcnkiLCJjcmVhdGVTY2hlbWEiLCJpbmZvUmVsYXRpb25SZXNvdXJjZSIsIml0ZW0iLCJuYW1lIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInN0clRvT2JqZWN0IiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibiIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJjaGFpbiIsInNsaWNlIiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnMiLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsInJvd1RvVGFibGVGb3JtYXQiLCJnZXRTb3J0aW5nUGFyYW1CeUZpZWxkIiwiZ2V0U29ydGluZ1BhcmFtVmFsdWUiLCJfZ2V0UmVsYXRpb25MaW5rIiwiX2dldFJvd3NCeURhdGEiLCJfZ2V0TGlua3MiLCJyZWwiLCJhbGxDb2x1bW5zIiwicm93Iiwicm93UmVzdWx0Iiwib3duIiwicmVsYXRpb25JdGVtIiwiZm9yT3duIiwiaW5jbHVkZWQiLCJfYmF0Y2hMb2FkRGF0YSIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJ0bXBSb3ciLCJtYXBWYWx1ZXMiLCJyZWxOYW1lIiwicmVsRGF0YSIsInJlbEl0ZW0iLCJBcnJheSIsImlzQXJyYXkiLCJkYXRhT2JqIiwicHJvdmlkZXIiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkcSIsIkVudGl0eSIsImV4dGVuZERhdGEiLCJyZWxhdGlvbnNoaXBzVmFsdWUiLCJhdHRyaWJ1dGVzVmFsdWUiLCJleHRlbmRTY2hlbWEiLCJleHRlbmRTY2hlbWFMaXN0IiwiZWFjaCIsInNldE1lc3NhZ2UiLCJnZXRNZXNzYWdlIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiX2dldEVtcHR5RGF0YSIsIl9nZXRFbXB0eURhdGFSZWxhdGlvbnMiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInJlc291cmNlIiwicmVzb2x2ZSIsImdldERhdGEiLCJqRGF0YSIsInJlcXVlc3QiLCJkb2N1bWVudCIsInJhdyIsImdldFNjaGVtYSIsImpTY2hlbWEiLCJjcmVhdGUiLCJjcmVhdGVWYWx1ZSIsInNjaGVtYUF0dHJpYnV0ZXMiLCJkZWZhdWx0VmFsdWUiLCJkYXRhU2NoZW1hIiwiYXR0cmlidXRlc1NjaGVtYSIsInJlbGF0aW9uc1NjaGVtYSIsImF0dHJpYnV0ZVNjaGVtYSIsInRoZW4iLCJyZXNwb25zZSIsImxpbmtSZXNvdXJjZXMiLCJhbGxSZXF1ZXN0IiwidW5pcSIsImFsbCIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsInRhYmxlIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiZm9ybUluc3QiLCJncmlkTW9kZWwiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ0YWJsZUluc3QiLCJ0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUiLCJyZXF1aXJlIiwidGVtcGxhdGVVcmwiLCJ0YWJsZVBhZ2luYXRpb25DdHJsIiwiJG9uIiwic2VhcmNoIiwicGFnZSIsInNob3ciLCJzZXRQYWdpbmF0aW9uIiwidG90YWxJdGVtcyIsIml0ZW1zUGVyUGFnZSIsInBhZ2VDaGFuZ2VkIiwicGFnZU5vIiwiZ3JpZFRoZWFkRGlyZWN0aXZlIiwiZ3JpZFRoZWFkQ3RybCIsImVsZW1lbnQiLCJhdHRyIiwiY29uc29sZSIsImxvZyIsInNldFNvcnRpbmdCeVNlYXJjaCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwibGFzdEluZGV4T2YiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FBRUFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUNuQkFOLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFVBQUEsRUFBQUUsUUFBQSxFO1FBQ0FBLFFBQUEsQ0FBQUMsT0FBQSxHQUFBO0FBQUEsWUFBQSxhQUFBO0FB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QUEsUUFBQSxDQUFBLENBYkE7QUFBQSxZQWVBLE9BQUFvUyxTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBNEMsb0JBQUEsQ0FBQXZDLE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUEwQyxjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUExQyxNQUFBLENBQUFHLFNBQUEsQ0FBQWhSLE1BQUEsQ0FBQThDLElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBbEYsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBMlYsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDByQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRSZWxhdGlvblJlc291cmNlczogX2dldFJlbGF0aW9uUmVzb3VyY2VzLFxuICAgIF9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hOiBfc2ltcGxpZnlFeHRlbmRlZFNjaGVtYSxcbiAgICBfZ2V0RXh0ZW5kRW51bVNjaGVtYTogX2dldEV4dGVuZEVudW1TY2hlbWEsXG4gICAgX2dldEVudW1WYWx1ZXM6IF9nZXRFbnVtVmFsdWVzLFxuICAgIF9nZXRJbmZvUmVsYXRpb25SZXNvdXJjZXNGb3JUaXRsZU1hcDogX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBuZWVkZWQgZGF0YSBmb3IgcmVuZGVyaW5nIENSVURcbiAgICpcbiAgICogQG5hbWUgRm9ybSNnZXRGb3JtSW5mb1xuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEpIHtcblxuICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5tb2RlbCA9IHNlbGYuX2ZpZWxkc1RvRm9ybUZvcm1hdChkYXRhKTtcbiAgICAgICAgc2VsZi5mb3JtID0gY29uZmlnO1xuXG4gICAgICAgIHNlbGYuc2NoZW1hID0gZGF0YS5hdHRyaWJ1dGVzKCkuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKTtcbiAgICAgICAgXy5mb3JFYWNoKHNlbGYuc2NoZW1hLnByb3BlcnRpZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBzZWxmLnNjaGVtYS5wcm9wZXJ0aWVzW2tleV0gPSBzZWxmLl9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hKGRhdGEsIGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IEpzb25hcnkgRGF0YSB0byByZXN1bHQgbW9kZWwgZm9yIHJlbmRlcmluZyBmb3JtXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChkYXRhKSB7XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEuYXR0cmlidXRlcygpLnZhbHVlKCk7XG5cbiAgICBkYXRhLnJlbGF0aW9uc2hpcHMoKS5wcm9wZXJ0aWVzKGZ1bmN0aW9uKGtleSwgcmVsYXRpb24pIHtcblxuICAgICAgaWYgKHJlbGF0aW9uLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpLmJhc2ljVHlwZXMoKS5pbmRleE9mKCdhcnJheScpID49IDApIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSBfLm1hcChyZWxhdGlvbi5wcm9wZXJ0eVZhbHVlKCdkYXRhJyksICdpZCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSByZWxhdGlvbi5wcm9wZXJ0eVZhbHVlKCdkYXRhJykuaWQ7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHJldHVybiBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgZm9ybSBjb25maWcgZm9yIEFuZ3VsYXIgc2NoZW1hIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnNjaGVtYXMoKVxuICAgICAgICAucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpXG4gICAgICAgIC5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKS5kZWZpbmVkUHJvcGVydGllcygpO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZW51bSB2YWx1ZXMgZm9yIHNjaGVtYSB3aXRoIGFsbE9mXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jX2dldEVudW1WYWx1ZXNcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMge1tdfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEVudW1WYWx1ZXMoZGF0YSkge1xuICAgIHZhciBlbnVtVmFsdWVzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICBlbnVtVmFsdWVzLnB1c2godmFsdWUucHJvcGVydHlWYWx1ZSgnaWQnKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZW51bVZhbHVlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0aXRsZU1hcCBmb3IgcmVsYXRpb24gcmVzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0SW5mb1JlbGF0aW9uUmVzb3VyY2VzRm9yVGl0bGVNYXAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IFtdO1xuXG4gICAgc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZXMoZGF0YSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKGVudW1zKSB7XG5cbiAgICAgICAgdmFyIHByb3BlcnR5RGF0YSA9IGVudW1zLnJlbGF0aW9uRGF0YTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZURhdGEgPSBkYXRhLmF0dHJpYnV0ZXMoKS5wcm9wZXJ0eShwcm9wZXJ0eURhdGEucGFyZW50S2V5KCkpO1xuXG4gICAgICAgIHZhciBzb3VyY2VFbnVtID0gc2VsZi5fZ2V0RW51bVZhbHVlcyhlbnVtcy5yZXNvdXJjZURhdGEpO1xuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hcyA9IGRhdGEuYXR0cmlidXRlcygpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKTtcblxuICAgICAgICBhdHRyaWJ1dGVEYXRhLmFkZFNjaGVtYShzZWxmLl9nZXRFeHRlbmRFbnVtU2NoZW1hKGF0dHJpYnV0ZVNjaGVtYXMsIHNvdXJjZUVudW0pKTtcblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24oZW51bUl0ZW0pIHtcbiAgICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZiwge1xuICAgICAgICAgICAgICB0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsXG4gICAgICAgICAgICAgIGlkOiBlbnVtSXRlbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICAgIHJlbGF0aW9uTmFtZTogcHJvcGVydHlEYXRhLnBhcmVudEtleSgpLFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogcHJvcGVydHlEYXRhLnNjaGVtYXMoKS5yZWxhdGlvbkZpZWxkKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhzb3VyY2VUaXRsZU1hcHMpO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWQgcmVzb3VyY2UgZm9yIGFsbCByZWxhdGlvbnNoaXBzXG4gICAqIGNhbGxiYWNrIG9iamVjdCB3aGVyZVxuICAgKiAgICByZWxhdGlvbkRhdGEgLSBKc29uYXJ5IG9iamVjdCBkZWZpbml0aW9uIHJlbGF0aW9uc2hpcHMgcGFydCxcbiAgICogICAgcmVzb3VyY2VEYXRhIC0gT2JqZWN0IGxvYWRlZCByZXNvdXJjZXNcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZXMoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc291cmNlcyA9IFtdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnRpZXMoZnVuY3Rpb24ocHJvcGVydHlOYW1lLCBwcm9wZXJ0eURhdGEpIHtcblxuICAgICAgaWYgKCFfLmlzRW1wdHkocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpKSkge1xuICAgICAgICByZXNvdXJjZXMucHVzaCh7XG4gICAgICAgICAgdXJsOiBwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZixcbiAgICAgICAgICBkYXRhOiBwcm9wZXJ0eURhdGFcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHJlc291cmNlcywgJ3VybCcpLCBmdW5jdGlvbihsb2FkUmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKHJlcywga2V5KSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0ge1xuICAgICAgICAgIHJlbGF0aW9uRGF0YTogcmVzLmRhdGEsXG4gICAgICAgICAgcmVzb3VyY2VEYXRhOiBsb2FkUmVzb3VyY2VzW3Jlcy51cmxdLmRhdGFcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG5cbiAgICB9KVxuXG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBleHRlbmRlZCBzY2hlbWEgdG8gc2ltcGxlIHNjaGVtYS4gRm9yIGV4YW1wbGUgaWYgc2NoZW1hIGhhcyBwcm9wZXJ0eSBhbGxPZlxuICAgKiB0aGVuIHdpbGwgYmUgcmVwbGFjZWQgb24gc2NoZW1hIHdoaWNoICBtZXJnZSBhbGwgaXRlbXMgYWxsT2YgZWxzZSByZXR1cm4gc2NoZW1hIHdpdGhvdXQgY2hhbmdlZFxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0ga2V5IEF0dHJpYnV0ZSBvciByZWxhdGlvbnNoaXBzIGtleVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIF9zaW1wbGlmeUV4dGVuZGVkU2NoZW1hKGRhdGEsIGtleSkge1xuICAgIHZhciBzY2hlbWFzID0gZGF0YS5hdHRyaWJ1dGVzKCkuc2NoZW1hcygpLnByb3BlcnR5U2NoZW1hcyhrZXkpLmdldEZ1bGwoKTtcbiAgICB2YXIgc2NoZW1hc0VudW0gPSBkYXRhLmF0dHJpYnV0ZXMoKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKS5nZXRGdWxsKCk7XG5cbiAgICBpZiAoc2NoZW1hc1swXS5hbmRTY2hlbWFzKCkubGVuZ3RoKSB7XG4gICAgICB2YXIgcmVwbGFjZUFsbE9mU2NoZW1hID0gc2NoZW1hc1swXS5kYXRhLnZhbHVlKCk7XG4gICAgICBkZWxldGUgcmVwbGFjZUFsbE9mU2NoZW1hLmFsbE9mO1xuXG4gICAgICBhbmd1bGFyLmZvckVhY2goc2NoZW1hc1swXS5hbmRTY2hlbWFzKCksIGZ1bmN0aW9uKGFuZFNjaGVtYSkge1xuICAgICAgICByZXBsYWNlQWxsT2ZTY2hlbWEgPSBhbmd1bGFyLmV4dGVuZChhbmRTY2hlbWEuZGF0YS52YWx1ZSgpLCByZXBsYWNlQWxsT2ZTY2hlbWEpXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXBsYWNlQWxsT2ZTY2hlbWE7XG4gICAgfVxuXG4gICAgcmV0dXJuIF8ubWVyZ2Uoe30sIHNjaGVtYXNbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWFzRW51bVswXS5kYXRhLnZhbHVlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBTdWJTY2hlbWEgd2l0aCBkeW5hbWljIGxvYWQgZW51bXMgZmllbGRzXG4gICAqXG4gICAqIEBuYW1lIEZvcm0jX2dldEV4dGVuZEVudW1TY2hlbWFcbiAgICogQHBhcmFtIHNjaGVtYUxpc3RcbiAgICogQHBhcmFtIHNvdXJjZUVudW1cbiAgICogQHJldHVybnMgeyp9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RXh0ZW5kRW51bVNjaGVtYShzY2hlbWFMaXN0LCBzb3VyY2VFbnVtKSB7XG4gICAgdmFyIG1lcmdlT2JqO1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBpZiAoc2NoZW1hTGlzdC5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICBtZXJnZU9iaiA9IHtcbiAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICBlbnVtOiBzb3VyY2VFbnVtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VPYmogPSB7ZW51bTogc291cmNlRW51bX1cbiAgICB9XG5cbiAgICByZXN1bHQgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShcbiAgICAgIF8ubWVyZ2Uoe30sIHNjaGVtYUxpc3RbMF0uZGF0YS52YWx1ZSgpLCBtZXJnZU9iailcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX2dldEluZm9SZWxhdGlvblJlc291cmNlc0ZvclRpdGxlTWFwKGRhdGEsIGZ1bmN0aW9uKGluZm9SZWxhdGlvblJlc291cmNlKSB7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKGluZm9SZWxhdGlvblJlc291cmNlLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKGluZm9SZWxhdGlvblJlc291cmNlLCBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEuYXR0cmlidXRlcygpXG4gICAgICAgICAgICAgIC5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbih1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykpXG4gICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgIC5vYmplY3QoKVxuICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JyArIHNlYXJjaFBhdGggOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHVybCB3aXRoIHNldCBwYWdlIHBhcmFtcyAob2Zmc2V0LCBsaW1pdClcbiAgICpcbiAgICogQHBhcmFtIHVybFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIFNvcnRpbmcgdGFibGUgY2xhc3NcbiAgICpcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gU29ydGluZygpIHtcbiAgICB0aGlzLnNvcnRQYXJhbSA9ICdzb3J0JztcbiAgfVxuXG4gIFNvcnRpbmcuRElSRUNUSU9OX0FTQyA9ICdhc2MnO1xuICBTb3J0aW5nLkRJUkVDVElPTl9ERVNDID0gJ2Rlc2MnO1xuICBTb3J0aW5nLmZpZWxkID0gdW5kZWZpbmVkO1xuICBTb3J0aW5nLmRpcmVjdGlvbiA9ICcnO1xuICBTb3J0aW5nLnNvcnRGaWVsZHMgPSBbXTtcblxuICBhbmd1bGFyLmV4dGVuZChTb3J0aW5nLnByb3RvdHlwZSwge1xuICAgIGdldENvbHVtbjogZ2V0Q29sdW1uLFxuICAgIGdldERpcmVjdGlvbkNvbHVtbjogZ2V0RGlyZWN0aW9uQ29sdW1uLFxuICAgIHNldFNvcnRGaWVsZHM6IHNldFNvcnRGaWVsZHMsXG4gICAgc2V0U29ydGluZzogc2V0U29ydGluZyxcbiAgICBnZXRVcmw6IGdldFVybFxuICB9KTtcblxuICByZXR1cm4gU29ydGluZztcblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNnZXREaXJlY3Rpb25Db2x1bW5cbiAgICogQHBhcmFtIGN1cnJlbnREaXJlY3Rpb25cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXREaXJlY3Rpb25Db2x1bW4oY3VycmVudERpcmVjdGlvbikge1xuICAgIGlmICghY3VycmVudERpcmVjdGlvbikge1xuICAgICAgcmV0dXJuICdhc2MnO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudERpcmVjdGlvbiA9PSAnYXNjJyA/ICdkZXNjJyA6ICcnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb2x1bW4gZm9yIGZpZWxkIGlmIGZpZWxkIGhhdmUgJy4nIHRoZW4gZ2V0IGZpcnN0IHBhcnRcbiAgICogRm9yIGV4YW1wbGU6ICd1c2VyLm5hbWUnIHJldHVybiAndXNlcidcbiAgICpcbiAgICogQG5hbWUgU29ydGluZyNnZXRDb2x1bW5cbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ3x1bmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW4oKSB7XG4gICAgaWYgKHRoaXMuZmllbGQpIHtcbiAgICAgIGlmICh0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSA+PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZpZWxkLnNsaWNlKDAsIHRoaXMuZmllbGQuaW5kZXhPZignLicpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZmllbGQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRpbmdcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIHRoaXMuZmllbGQgPSBmaWVsZDtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI3NldFNvcnRGaWVsZHNcbiAgICogQHBhcmFtIGZpZWxkc1xuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydEZpZWxkcyhmaWVsZHMpIHtcbiAgICB0aGlzLnNvcnRGaWVsZHMgPSBmaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHVybCB3aXRoIHNldCBwYXJhbSBzb3J0aW5nXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIGlmICghdGhpcy5maWVsZCkge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXJhbXMgPSBIZWxwZXIucGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpO1xuICAgIHNlYXJjaFBhcmFtc1tzZWxmLnNvcnRQYXJhbSArICdbJyArIHNlbGYuZmllbGQgKyAnXSddID0gc2VsZi5kaXJlY3Rpb247XG5cbiAgICByZXR1cm4gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uczogZ2V0Q29sdW1ucyxcbiAgICBnZXRDb2x1bW5zQnlTY2hlbWE6IGdldENvbHVtbnNCeVNjaGVtYSxcbiAgICByb3dzVG9UYWJsZUZvcm1hdDogcm93c1RvVGFibGVGb3JtYXQsXG4gICAgcm93VG9UYWJsZUZvcm1hdDogcm93VG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIGdldFNvcnRpbmdQYXJhbVZhbHVlOiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIF9nZXRSZWxhdGlvblJlc291cmNlczogX2dldFJlbGF0aW9uUmVzb3VyY2VzLFxuICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhLFxuICAgIF9nZXRMaW5rczogX2dldExpbmtzXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcbiAgLyoqXG4gICAqIEdldCBhbGwgZGF0YSBuZWVkZWQgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgKlxuICAgKiBAcmV0dXJucyB7e3Jvd3M6ICosIGNvbHVtbnM6ICosIGxpbmtzOiAqfX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJvd3M6IHNlbGYucm93cyxcbiAgICAgIGNvbHVtbnM6IHNlbGYuY29sdW1ucyxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1haW4gZnVuY3Rpb24gZm9yIGdldCByZW5kZXJpbmcgZGF0YVxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSkge1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnMoZGF0YSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbmFtZSBzb3J0aW5nIGZpZWxkIGFuZCBzZXQgaXRcbiAgICpcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEBwYXJhbSBkaXJlY3Rpb25cbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuXG4gICAgaWYgKHJlbCkge1xuICAgICAgcmVzdWx0ICs9ICcuJyArIHJlbDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB2YWx1ZSBmb3Igc29ydGluZyBHRVQgcGFyYW1cbiAgICpcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zb3J0aW5nLmRpcmVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCh0aGlzLnNvcnRpbmcuZmllbGQpICsgJ18nICsgdGhpcy5zb3J0aW5nLmRpcmVjdGlvblxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hIGFuZCBzZXQgc29ydGFibGUgZmllbGRzXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI2dldENvbHVtbnNCeVNjaGVtYVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgIHZhciByZWxhdGlvbnNoaXBzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgIHZhciBhbGxDb2x1bW5zID0gXy51bmlvbihzZWxmLmdldENvbHVtbnNCeVNjaGVtYShhdHRyaWJ1dGVzKSwgc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEocmVsYXRpb25zaGlwcykpO1xuXG4gICAgc2VsZi5zb3J0aW5nLnNldFNvcnRGaWVsZHMoXy5tYXAoYWxsQ29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICBhbGxDb2x1bW5zLnB1c2goe1xuICAgICAgdGl0bGU6ICdBY3Rpb25zJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGFsbENvbHVtbnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbnMgYW5kIGF0dGFjaCBhdHRyaWJ1dGVOYW1lIGluIGNvbHVtbiBmb3IgcmVuZGVyaW5nXG4gICAqXG4gICAqIEBwYXJhbSBjb2x1bW5zXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbnNCeVNjaGVtYShjb2x1bW5zKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGNvbHVtbnMucHJvcGVydGllcyhmdW5jdGlvbihrZXksIHByb3BlcnR5KSB7XG4gICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI3Jvd3NUb1RhYmxlRm9ybWF0XG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHNlbGYucm93VG9UYWJsZUZvcm1hdChyb3cpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBkYXRhIHRvIHJlbmRlciB2aWV3IGRhdGEgaW4gdGFibGVcbiAgICpcbiAgICogQHBhcmFtIHJvdyBDb25zaXN0cyBvZiBvd24gYW5kIHJlbGF0aW9uc2hpcHMgZGF0YVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd1RvVGFibGVGb3JtYXQocm93KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByb3dSZXN1bHQgPSByb3cub3duLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuXG4gICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHlTY2hlbWFzKGtleSkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGZpZWxkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pLmpvaW4oJywgJyk7XG5cbiAgICB9KTtcblxuICAgIHJvd1Jlc3VsdC5saW5rcyA9IHNlbGYuX2dldExpbmtzKHJvdy5vd24pO1xuXG4gICAgcmV0dXJuIHJvd1Jlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbGlua3MgZm9yIGN1cnJlbnQgZGF0YVxuICAgKlxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0TGlua3MoZGF0YSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxpbmspO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI19nZXRSb3dzQnlEYXRhXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRSb3dzQnlEYXRhKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByb3dzID0gW107XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG4gICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlcyh2YWx1ZSkpO1xuICAgICAgcm93cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgIGZ1bmN0aW9uIGJhdGNoTG9hZGVkKHJlbGF0aW9uUmVzb3VyY2VzKSB7XG4gICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgIF8uZm9yRWFjaChyb3dzLCBmdW5jdGlvbihyb3csIGluZGV4KSB7XG4gICAgICAgIHZhciB0bXBSb3cgPSB7XG4gICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbaW5kZXhdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgIH0pO1xuXG4gICAgICBjYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICpcbiAgICogQHBhcmFtIGRhdGFcbiAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZXMoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydGllcyhmdW5jdGlvbihyZWxOYW1lLCByZWxEYXRhKSB7XG4gICAgICByZXN1bHRbcmVsTmFtZV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsRGF0YSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgKlxuICAgKiBcImRhdGFcIjogW3tcbiAgICAgKiAgICBcInR5cGVcIjogXCJwb3N0c1wiLFxuICAgICAqICAgIFwiaWRcIjogXCIxXCIsXG4gICAgICogICAgXCJhdHRyaWJ1dGVzXCI6IHtcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgIH0sXG4gICAgICogICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgIFwiYXV0aG9yXCI6IHsgICAgICAgICAgIDwtLSBpbnB1dCBkYXRhXG4gICAgICogICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgXCJzZWxmXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvcmVsYXRpb25zaGlwcy9hdXRob3JcIixcbiAgICAgKiAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3Bvc3RzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgIH0sXG4gICAgICogICAgICAgICBcImRhdGFcIjogeyBcInR5cGVcIjogXCJwZW9wbGVcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICB9XG4gICAgICogICAgfVxuICAgICAqfV1cbiAgICogQG5hbWUgRW50aXR5I19nZXRSZWxhdGlvbkxpbmtcbiAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXNvdXJjZXMgPSBbXTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHJlbEl0ZW0ucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuXG4gICAgICByZWxJdGVtLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIGRhdGFPYmopIHtcbiAgICAgICAgcmVzb3VyY2VzLnB1c2goe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzKClbMF0uaHJlZiwge1xuICAgICAgICAgICAgdHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLFxuICAgICAgICAgICAgaWQ6IGRhdGFPYmoucHJvcGVydHlWYWx1ZSgnaWQnKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICBpZiAoIV8uaXNFbXB0eShyZWxJdGVtLmxpbmtzKCdyZWxhdGlvbicpKSkge1xuICAgICAgICByZXNvdXJjZXMgPSBbe1xuICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzKCdyZWxhdGlvbicpWzBdLmhyZWYsIHtcbiAgICAgICAgICAgIHR5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSxcbiAgICAgICAgICAgIGlkOiByZWxJdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuXG4gICAgfVxuICAgIHJldHVybiByZXNvdXJjZXM7XG4gIH1cblxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgIG1lc3NhZ2VzOiB7XG4gICAgICBzdWNjZXNzRGVsZXRlZDogJ1N1Y2Nlc3NmdWxseSBkZWxldGUnLFxuICAgICAgc3VjY2Vzc0NyZWF0ZWQ6ICdTdWNjZXNzZnVsbHkgY3JlYXRlJyxcbiAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICBzZXJ2ZXJFcnJvcjogJ09vcHMhIHNlcnZlciBlcnJvcidcbiAgICB9LFxuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJ18nLCAnJHEnXTtcblxuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEVudGl0eUdldChfLCAkcSkge1xuICAgIHZhciBtb2RlbDtcbiAgICB2YXIgbWVzc2FnZXMgPSB0aGlzLm1lc3NhZ2VzO1xuXG4gICAgLyoqXG4gICAgICogQmFzZSBjbGFzcyB3aXRoIGZ1bmN0aW9uYWxpdHkgaGFuZGxpbmcgcmVzb3VyY2VzXG4gICAgICpcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFbnRpdHkoKSB7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kRGF0YSh7XG4gICAgICAgIHJlbGF0aW9uc2hpcHNWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgICB9LFxuICAgICAgICBhdHRyaWJ1dGVzVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5VmFsdWUoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVsYXRpb25zaGlwczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgICB9LFxuICAgICAgICBhdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYSh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsYXRpb25GaWVsZCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hTGlzdCh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZWxhdGlvbkZpZWxkID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmdldEZ1bGwoKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBzY2hlbWEpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNjaGVtYS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiAocmVsYXRpb25GaWVsZCA9PSBudWxsIHx8IHZhbHVlIDwgcmVsYXRpb25GaWVsZCkpIHtcbiAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkZpZWxkO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIEVudGl0eS5wcm90b3R5cGUuY29uZmlnID0ge307XG4gICAgRW50aXR5LnByb3RvdHlwZS5kZWZhdWx0ID0ge1xuICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgIH07XG5cbiAgICBhbmd1bGFyLmV4dGVuZChFbnRpdHkucHJvdG90eXBlLCB7XG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICAgIF9nZXRFbXB0eURhdGFSZWxhdGlvbnM6IF9nZXRFbXB0eURhdGFSZWxhdGlvbnMsXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICByZXN1bHQgKz0gJy8nICsgcGFyYW1zLnR5cGUgKyAnLycgKyBwYXJhbXMuaWQ7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsKSB7XG4gICAgICByZXR1cm4gJHEoZnVuY3Rpb24ocmVzb2x2ZSkge1xuXG4gICAgICAgIEpzb25hcnkuZ2V0RGF0YSh1cmwsIGZ1bmN0aW9uKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIHNjaGVtYSBieSB1cmwsIGNyZWF0ZSBlbXB0eSBkYXRhIGFuZCBqb2luIHRoZW1cbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZFNjaGVtYSh1cmwpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgcmV0dXJuICRxKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgSnNvbmFyeS5nZXRTY2hlbWEodXJsLCBmdW5jdGlvbihqU2NoZW1hKSB7XG5cbiAgICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEpKTtcbiAgICAgICAgICBkYXRhLmRvY3VtZW50LnVybCA9IHNlbGYuZ2V0TW9kZWwoKS51cmw7XG4gICAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgICByZXNvbHZlKHtkYXRhOiBkYXRhLCBzY2hlbWE6IHNjaGVtYX0pO1xuXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZW1wdHkgbW9kZWwgZm9yIGNyZWF0ZSBmb3JtXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgcmVzdWx0ID0gc2NoZW1hLmNyZWF0ZVZhbHVlKCk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0ge307XG5cbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVzID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIF8uZm9yRWFjaChzY2hlbWFBdHRyaWJ1dGVzLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHByb3BlcnR5TmFtZSkge1xuXG4gICAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXNbcHJvcGVydHlOYW1lXSA9IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSkuY3JlYXRlVmFsdWUoKSAhPSB1bmRlZmluZWRcbiAgICAgICAgICA/IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSkuY3JlYXRlVmFsdWUoKVxuICAgICAgICAgIDogc2NoZW1hQXR0cmlidXRlcy5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKVswXS5kZWZhdWx0VmFsdWUoKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXN1bHQuZGF0YS5yZWxhdGlvbnNoaXBzID0gc2VsZi5fZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGVtcHR5IHZhbHVlIHJlbGF0aW9uc2hpcHMgcmVzb3VyY2UgZm9yIG1vZGVsXG4gICAgICpcbiAgICAgKiBAbmFtZSBFbnRpdHkjX2dldEVtcHR5RGF0YVJlbGF0aW9uc1xuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcmV0dXJucyB7e319XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSkge1xuICAgICAgdmFyIHJlbGF0aW9uID0ge307XG5cbiAgICAgIHZhciBkYXRhU2NoZW1hID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVzU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnNTY2hlbWEgPSBkYXRhU2NoZW1hLnByb3BlcnR5U2NoZW1hcygncmVsYXRpb25zaGlwcycpO1xuXG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zU2NoZW1hLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHJlbGF0aW9uTmFtZSkge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVTY2hlbWEgPSBhdHRyaWJ1dGVzU2NoZW1hLnByb3BlcnR5U2NoZW1hcyhyZWxhdGlvbk5hbWUpLmdldEZ1bGwoKTtcbiAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXSA9IHtcbiAgICAgICAgICBsaW5rczoge30sXG4gICAgICAgICAgZGF0YTogYXR0cmlidXRlU2NoZW1hLmJhc2ljVHlwZXMoKS5pbmRleE9mKCdhcnJheScpID49IDAgPyBbXSA6IHt9XG4gICAgICAgIH07XG5cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVsYXRpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsKS50aGVuKGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwpLnRoZW4oZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHJlc3BvbnNlLnNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAbmFtZSBFbnRpdHkjZmV0Y2hDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHthcnJheX0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGFsbFJlcXVlc3QgPSBbXTtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcyA9IF8udW5pcShsaW5rUmVzb3VyY2VzKTtcblxuICAgICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih1cmwpIHtcblxuICAgICAgICB2YXIgcmVxdWVzdCA9IHNlbGYubG9hZERhdGEodXJsKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSByZXNwb25zZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYWxsUmVxdWVzdC5wdXNoKHJlcXVlc3QpO1xuICAgICAgfSk7XG5cbiAgICAgICRxLmFsbChhbGxSZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmtzIGZyb20gZGF0YSByZWxhdGlvbnNoaXBzIHNlY3Rpb25cbiAgICAgKiBJTlBVVDpcbiAgICAgKiAgIFwiZGF0YVwiOiBbe1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgICBcImF1dGhvclwiOiB7XG4gICAgICogICAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwidXNlcnNcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICAgIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgIH1dXG4gICAgICogT1VUUFVUOlxuICAgICAqICAgW1xuICAgICAqICAgICAgaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yLzlcbiAgICAgKiAgIF1cbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShyb3dzUmVsYXRpb25zaGlwcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3csIGtSb3cpIHtcbiAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF1ba1JlbEl0ZW1dID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1jcmVhdGUnLCBncmlkQWN0aW9uQ3JlYXRlKTtcbmdyaWRBY3Rpb25DcmVhdGUuJGluamVjdCA9IFsnJGh0dHAnXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25DcmVhdGUoJGh0dHApIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkNyZWF0ZVN1Y2Nlc3MsIGFjdGlvbkNyZWF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuXG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0NyZWF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkNyZWF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZFRhYmxlJywgJ2dyaWRGb3JtJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uRGVsZXRlKCRodHRwLCBncmlkVGFibGUsIGdyaWRGb3JtKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBncmlkVGFibGUpIHtcbiAgICAgICAgb2JqLmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAgIHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAgIHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBncmlkRm9ybSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzRGVsZXRlZCcpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZ29UbycsIGdyaWRBY3Rpb25Hb1RvKTtcbmdyaWRBY3Rpb25Hb1RvLiRpbmplY3QgPSBbJyRsb2NhdGlvbiddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkdvVG8oJGxvY2F0aW9uKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICByZXR1cm4gbGluay5zdWJqZWN0RGF0YS5wcm9wZXJ0eVZhbHVlKHAxKTtcbiAgICB9KTtcblxuICAgICRsb2NhdGlvbi51cmwocmVzdWx0TGluayk7XG4gIH07XG59IiwiLyogR3JpZCBsaW5rcyBhY3Rpb25zICovXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnByb3ZpZGVyKCdncmlkLWFjdGlvbnMnLCBncmlkQWN0aW9ucyk7XG5ncmlkQWN0aW9ucy4kaW5qZWN0ID0gW107XG5mdW5jdGlvbiBncmlkQWN0aW9ucygpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgYWN0aW9uczoge30sXG4gICAgJGdldDogZ3JpZEFjdGlvbnNHZXRcbiAgfTtcblxuICBncmlkQWN0aW9uc0dldC4kaW5qZWN0ID0gWydncmlkLWFjdGlvbi1nb1RvJywgJ2dyaWQtYWN0aW9uLWRlbGV0ZScsICdncmlkLWFjdGlvbi11cGRhdGUnLCAnZ3JpZC1hY3Rpb24tY3JlYXRlJ107XG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkQWN0aW9uc0dldChBY3Rpb25Hb1RvLCBBY3Rpb25EZWxldGUsIEFjdGlvblVwZGF0ZSwgQWN0aW9uQ3JlYXRlKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdGhpcy5hY3Rpb25zID0ge1xuICAgICAgZ29Ub1VwZGF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9DcmVhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvTGlzdDogQWN0aW9uR29UbyxcbiAgICAgIHJlYWQ6IEFjdGlvbkdvVG8sXG4gICAgICBkZWxldGU6IEFjdGlvbkRlbGV0ZSxcbiAgICAgIHVwZGF0ZTogQWN0aW9uVXBkYXRlLFxuICAgICAgY3JlYXRlOiBBY3Rpb25DcmVhdGVcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25zW2xpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbCcpXShvYmosIGxpbmssIHNjb3BlKTtcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLXVwZGF0ZScsIGdyaWRBY3Rpb25VcGRhdGUpO1xuZ3JpZEFjdGlvblVwZGF0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkLWVudGl0eSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvblVwZGF0ZSgkaHR0cCwgZ3JpZEVudGl0eSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBvYmouZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRGb3JtJywgZ3JpZEZvcm1EaXJlY3RpdmUpO1xuXG4vL1RPRE86IHNob3VsZCBiZSBzZXQgcmVxdWlyZSAuLi4gZGVwZW5kcyBvbiB2bXNHcmlkXG5mdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHJlcGxhY2U6IHRydWUsXG4gICAgY29udHJvbGxlcjogZ3JpZEZvcm1EaXJlY3RpdmVDdHJsXG4gIH07XG5cbiAgZ3JpZEZvcm1EaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkRm9ybScsICdncmlkLWFjdGlvbnMnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlQ3RybCgkc2NvcGUsIGdyaWRGb3JtLCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZSA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAkc2NvcGUuc2NvcGVGb3JtID0gc2NvcGU7XG4gICAgfTtcblxuICAgIHZhciBmb3JtSW5zdCA9IG5ldyBncmlkRm9ybSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgIGZvcm1JbnN0LmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICRzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICRzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgJHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICRzY29wZS5saW5rcyA9IGZvcm0ubGlua3M7XG4gICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbigkZXZlbnQsIGZvcm0pIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlRGlyZWN0aXZlKTtcblxuZ3JpZFRhYmxlRGlyZWN0aXZlLiRpbmplY3QgPSBbJ2dyaWRUYWJsZScsICdncmlkLWFjdGlvbnMnXTtcblxuZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlKGdyaWRUYWJsZSwgZ3JpZEFjdGlvbnMpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBjb250cm9sbGVyOiBncmlkVGFibGVEaXJlY3RpdmVDdHJsXG4gICAgfTtcblxuICBncmlkVGFibGVEaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybCgkdGltZW91dCwgJHNjb3BlKSB7XG4gICAgLyoqIEB0eXBlIHtncmlkVGFibGV9ICovXG4gICAgdmFyIHRhYmxlSW5zdCA9IG5ldyBncmlkVGFibGUoJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG4gICAgJHNjb3BlLnRhYmxlSW5zdCA9IHRhYmxlSW5zdDtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uQmVmb3JlTG9hZERhdGEnKTtcblxuICAgICAgdGFibGVJbnN0LmdldFRhYmxlSW5mbyhmdW5jdGlvbih0YWJsZSkge1xuICAgICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICRzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgJHNjb3BlLmxpbmtzID0gdGFibGUubGlua3M7XG5cbiAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ29uTG9hZERhdGEnKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbih0YWJsZUluc3QsIGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlUGFnaW5hdGlvbicsIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSk7XG5cbnRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkRpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtcGFnaW5hdGlvbi5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IHRhYmxlUGFnaW5hdGlvbkN0cmxcbiAgfTtcblxuICB0YWJsZVBhZ2luYXRpb25DdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHRhYmxlUGFnaW5hdGlvbkN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259ICovXG4gICAgdmFyIHBhZ2luYXRpb24gPSAkc2NvcGUudGFibGVJbnN0LnBhZ2luYXRpb247XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKCRsb2NhdGlvbi5zZWFyY2goKS5wYWdlKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5zaG93ID0gdHJ1ZTtcbiAgICAgICRzY29wZS5zZXRQYWdpbmF0aW9uKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnRvdGFsSXRlbXMgPSBwYWdpbmF0aW9uLmdldFRvdGFsQ291bnQoKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRzY29wZS5pdGVtc1BlclBhZ2UgPSBwYWdpbmF0aW9uLmdldFBlclBhZ2UoKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnBhZ2VDaGFuZ2VkID0gZnVuY3Rpb24ocGFnZU5vKSB7XG4gICAgICBwYWdpbmF0aW9uLnNldEN1cnJlbnRQYWdlKHBhZ2VObyk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdwYWdlJywgcGFnZU5vKTtcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVUaGVhZCcsIGdyaWRUaGVhZERpcmVjdGl2ZSk7XG5cbmdyaWRUaGVhZERpcmVjdGl2ZS4kaW5qZWN0ID0gW107XG5cbmZ1bmN0aW9uIGdyaWRUaGVhZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICBzY29wZToge1xuICAgICAgdGFibGVJbnN0OiAnPXRhYmxlJ1xuICAgIH0sXG4gICAgcmVxdWlyZTogJ15ncmlkVGFibGUnLFxuICAgIHRlbXBsYXRlVXJsOiAndGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sJyxcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRUaGVhZEN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHIpIHtcbiAgICAgIC8vY29uc29sZS5sb2coYXR0cik7XG4gICAgfVxuICB9O1xuXG4gIGdyaWRUaGVhZEN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZFRoZWFkQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtTb3J0aW5nfSAqL1xuICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coJ3NvcnRpbmcgYmVmb3JlIGxvYWQnKTtcbiAgICAgIHNldFNvcnRpbmdCeVNlYXJjaCgkbG9jYXRpb24uc2VhcmNoKCkpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLmNvbHVtbnMgPSAkc2NvcGUudGFibGVJbnN0LmNvbHVtbnM7XG4gICAgICAkc2NvcGUuc29ydEZpZWxkcyA9IHNvcnRpbmcuc29ydEZpZWxkcztcbiAgICAgICRzY29wZS5zZXRTb3J0aW5nKCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuc2V0U29ydGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZpZWxkID0gc29ydGluZy5nZXRDb2x1bW4oKTtcblxuICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgIF8ud2hlcmUodGhpcy5jb2x1bW5zLCB7J2F0dHJpYnV0ZU5hbWUnOiBmaWVsZH0pWzBdLnNvcnRpbmcgPSBzb3J0aW5nLmRpcmVjdGlvbjtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNvcnRCeSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgdmFyIGRpcmVjdGlvbjtcblxuICAgICAgY29sdW1uLnNvcnRpbmcgPSBkaXJlY3Rpb24gPSBzb3J0aW5nLmdldERpcmVjdGlvbkNvbHVtbihjb2x1bW4uc29ydGluZyk7XG4gICAgICAkc2NvcGUudGFibGVJbnN0LnNldFNvcnRpbmcoY29sdW1uLmF0dHJpYnV0ZU5hbWUsIGRpcmVjdGlvbik7XG4gICAgICAkbG9jYXRpb24uc2VhcmNoKCdzb3J0JywgJHNjb3BlLnRhYmxlSW5zdC5nZXRTb3J0aW5nUGFyYW1WYWx1ZSgpKTtcblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRTb3J0aW5nQnlTZWFyY2goZmllbGRzKSB7XG4gICAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICAgaWYgKCFmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3MgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICB2YXIgZmllbGQgPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKDAsIHBvcyk7XG4gICAgICB2YXIgZGlyZWN0aW9uID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZShwb3MgKyAxKTtcblxuICAgICAgc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pO1xuICAgIH1cblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlKSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKFwiZ3JpZFwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWxcIixcIjxncmlkLWZvcm0+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJnbyhsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgIDwvc3Bhbj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcbiAgICA8L2Rpdj5cXG4gICAgPGZvcm0gbm92YWxpZGF0ZSBuYW1lPVxcXCJncmlkRm9ybVxcXCIgbmctaW5pdD1cXFwic2V0Rm9ybVNjb3BlKHRoaXMpXFxcIlxcbiAgICAgICAgICBzZi1zY2hlbWE9XFxcInNjaGVtYVxcXCIgc2YtZm9ybT1cXFwiZm9ybVxcXCIgc2YtbW9kZWw9XFxcIm1vZGVsXFxcIlxcbiAgICAgICAgICBjbGFzcz1cXFwiZm9ybS1ob3Jpem9udGFsXFxcIiByb2xlPVxcXCJmb3JtXFxcIiBuZy1pZj1cXFwiaGlkZUZvcm0gIT09IHRydWVcXFwiPlxcbiAgICA8L2Zvcm0+XFxuPC9ncmlkLWZvcm0+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtaGVhZC5odG1sXCIsXCI8dHI+XFxuICAgIDx0aCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk+PTBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lciBzb3J0YWJsZVxcXCIgbmctY2xpY2s9XFxcInNvcnRCeShjb2x1bW4sICRldmVudClcXFwiPnt7Y29sdW1uLnRpdGxlfX1cXG4gICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLnNvcnRpbmdcXFwiIGNsYXNzPVxcXCJvcmRlclxcXCIgbmctY2xhc3M9XFxcIntcXCdkcm9wdXBcXCc6IGNvbHVtbi5zb3J0aW5nPT1cXCdkZXNjXFwnfVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJjYXJldFxcXCIgc3R5bGU9XFxcIm1hcmdpbjogMHB4IDVweDtcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgbmctaWY9XFxcInNvcnRGaWVsZHMuaW5kZXhPZihjb2x1bW4uYXR0cmlidXRlTmFtZSk8MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyXFxcIj57e2NvbHVtbi50aXRsZX19PC9kaXY+XFxuICAgIDwvdGg+XFxuPC90cj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWxcIixcIjxwYWdpbmF0aW9uIG5nLWlmPVxcXCJzaG93XFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj5cXG5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sXCIsXCI8Z3JpZC10YWJsZT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICA8L3NwYW4+XFxuICAgIDxhbGVydCBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIGFsZXJ0c1xcXCIgdHlwZT1cXFwie3thbGVydC50eXBlfX1cXFwiIGNsb3NlPVxcXCJjbG9zZUFsZXJ0KCRpbmRleClcXFwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PlxcblxcbiAgICA8dGFibGUgY2xhc3M9XFxcInRhYmxlIGdyaWRcXFwiPlxcbiAgICAgICAgPHRoZWFkIHRhYmxlLXRoZWFkIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHk+XFxuICAgICAgICAgICAgPHRyIG5nLXJlcGVhdD1cXFwicm93IGluIHJvd3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8dGQgbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXFxcIj57e3Jvd1tjb2x1bW4uYXR0cmlidXRlTmFtZV19fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSA9PSBcXCdsaW5rc1xcJ1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIHJvdy5saW5rc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKTtcXFwiIG5nLWNsaWNrPVxcXCJlZGl0KGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxkaXYgdGFibGUtcGFnaW5hdGlvbiB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L2Rpdj5cXG48L2dyaWQtdGFibGU+XFxuXFxuPCEtLTxwYWdpbmF0aW9uIG5nLWlmPVxcXCJyb3dzXFxcIiBkaXJlY3Rpb24tbGlua3M9XFxcImZhbHNlXFxcIiBib3VuZGFyeS1saW5rcz1cXFwidHJ1ZVxcXCIgaXRlbXMtcGVyLXBhZ2U9XFxcIml0ZW1zUGVyUGFnZVxcXCIgdG90YWwtaXRlbXM9XFxcInRvdGFsSXRlbXNcXFwiIG5nLW1vZGVsPVxcXCJjdXJyZW50UGFnZVxcXCIgbmctY2hhbmdlPVxcXCJwYWdlQ2hhbmdlZChjdXJyZW50UGFnZSlcXFwiPjwvcGFnaW5hdGlvbj4tLT5cIik7fV0pOyJdLCJzb3VyY2VSb290IjoiLi4vc3JjLyJ9