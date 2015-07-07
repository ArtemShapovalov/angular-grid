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
                _getEnumValues: _getEnumValues,
                _getTitleMapsForRelations: _getTitleMapsForRelations,
                _createTitleMap: _createTitleMap,
                _getFormConfig: _getFormConfig,
                _getFieldsForm: _getFieldsForm,
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
                    /*var attributes = self.mergeRelSchema(
        data.property('data').schemas()[0].data.value(),
        data.schemas()[0].data.document.raw.value()
      ).properties.attributes.properties;*/
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
            /**
   * Get enum values for schema with allOf
   *
   * @name Form#_getEnumValues
   * @param data
   * @returns {{}}
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
                        var enumsData = loadResources[enums.url].data;
                        var sourceEnum = self._getEnumValues(enumsData);
                        console.log(data);
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
                                //value: data.property('data').propertyValue('id'),
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
                    self.pagination.setTotalCount(data.property('meta').propertyValue('total'));
                    self._getRowsByData(data, function (rows) {
                        self.rows = self.rowsToTableFormat(rows);
                        self.links = data.links();
                        self.columns = self.getColumnsBySchema(data);
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
                //var rel = this.data.property('data').item(0).property('attributes').property(field);
                var rel = this.data.property('data').item(0).property('relationships').property(field).schemas().relationField();
                if (rel) {
                    result += '.' + rel;
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
   * @name Table#getColumnsBySchema
   * @param schemaWithoutRef
   * @returns {Array}
   */
            function getColumnsBySchema(data) {
                var getColumns = function (columns) {
                    var result = [];
                    columns.properties(function (key, property) {
                        var value = property.schemas()[0].data.value();
                        value.attributeName = key;
                        result.push(value);
                    });
                    return result;
                };
                var attributes = data.property('data').item(0).property('attributes');
                var relationships = data.property('data').item(0).property('relationships');
                return _.union(getColumns(attributes), getColumns(relationships));
            }
            /**
   * Convert array Jsonary Data to result array for rendering table
   *
   * @name Table#rowsToTableFormat
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
                            //var field = row.own.property('relationships').property(key).schemas().relationField();
                            var field = row.own.schemas().propertySchemas('relationships').propertySchemas(key).relationField();
                            /** relationField additional field(relation row) */
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
                    Jsonary.extendData({
                        relationships: function () {
                            return this.propertyValue('relationships');
                        },
                        attributes: function () {
                            return this.propertyValue('attributes');
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
                    mergeRelSchema: mergeRelSchema,
                    getTypeProperty: getTypeProperty,
                    _getEmptyData: _getEmptyData,
                    _getEmptyDataRelations: _getEmptyDataRelations,
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
                        var data = Jsonary.create(self._getEmptyData(jSchema));
                        data.document.url = self.getModel().url;
                        data.addSchema(jSchema);
                        if (callback !== undefined) {
                            callback(data, schema);
                        }
                    });
                }
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
                            } else if (typeof haystack[key] === 'object' && Array.isArray(haystack[key]) && [
                                    'oneOf',
                                    'allOf'
                                ].indexOf(key) >= 0) {
                                _.forEach(haystack[key], function (value, index) {
                                    if (value.$ref) {
                                        haystack[key][index] = Helper.strToObject(schemaFull, value.$ref.substring(2));
                                        _replaceFromFull(haystack[key], schemaFull);
                                    }
                                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldEVudW1WYWx1ZXMiLCJfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9maWVsZHNUb0Zvcm1Gb3JtYXQiLCJfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwic2VsZiIsImNhbGxiYWNrIiwiZ2V0TW9kZWwiLCJ1cmwiLCJnZXRSZXNvdXJjZVVybCIsInBhcmFtcyIsImZldGNoRGF0YSIsImZldGNoRGF0YVN1Y2Nlc3MiLCJkYXRhIiwibmV3RGF0YSIsInByb3BlcnR5Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwic2NoZW1hcyIsInZhbHVlIiwiZmllbGRzIiwiY2FsbGJhY2tGb3JtQ29uZmlnIiwiY29uZmlnIiwidW5pb24iLCJ1bmRlZmluZWQiLCJyZXNvdXJjZSIsIm93biIsImZvckVhY2giLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJrZXkiLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJwcm9wZXJ0eVZhbHVlIiwiQXJyYXkiLCJpc0FycmF5IiwicmVzdWx0IiwidGl0bGVNYXBzIiwiYXR0cmlidXRlcyIsInByb3BlcnR5U2NoZW1hcyIsImdldEZ1bGwiLCJkZWZpbmVkUHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9iYXRjaExvYWREYXRhIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJlbnVtVmFsdWVzIiwiaXRlbXMiLCJzb3VyY2VUaXRsZU1hcHMiLCJyZXNvdXJjZXMiLCJwcm9wZXJ0aWVzIiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlEYXRhIiwiaXNFbXB0eSIsImhyZWYiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwiZW51bXMiLCJlbnVtc0RhdGEiLCJzb3VyY2VFbnVtIiwiY29uc29sZSIsImxvZyIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwicGFyZW50S2V5IiwiYXR0cmlidXRlTmFtZSIsInJlbGF0aW9uRmllbGQiLCJuYW1lIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInN0clRvT2JqZWN0IiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwibGVuZ3RoIiwiayIsInNlYXJjaFBhcmFtcyIsInBvcyIsImluZGV4T2YiLCJjaGFpbiIsInNsaWNlIiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0IiwiZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCIsImdldFNvcnRpbmdQYXJhbVZhbHVlIiwiX2dldFJvd3NCeURhdGEiLCJyZWwiLCJnZXRDb2x1bW5zIiwicm93Iiwicm93UmVzdWx0IiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJKc29uYXJ5IiwiZXh0ZW5kRGF0YSIsImV4dGVuZFNjaGVtYSIsImV4dGVuZFNjaGVtYUxpc3QiLCJlYWNoIiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJnZXRUeXBlUHJvcGVydHkiLCJfZ2V0RW1wdHlEYXRhIiwiX2dldEVtcHR5RGF0YVJlbGF0aW9ucyIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJfZ2V0UmVsYXRpb25MaW5rIiwiTW9kZWwiLCJwYXJhbSIsIm1lc3NhZ2UiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwiZG9jdW1lbnQiLCJyYXciLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiYWRkU2NoZW1hIiwidG1wT2JqIiwiY3JlYXRlVmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVzIiwiZGVmYXVsdFZhbHVlIiwiZGF0YVNjaGVtYSIsImF0dHJpYnV0ZXNTY2hlbWEiLCJyZWxhdGlvbnNTY2hlbWEiLCJhdHRyaWJ1dGVTY2hlbWEiLCJiYXNpY1R5cGVzIiwidG9TdHJpbmciLCJsaW5rUmVzb3VyY2VzIiwibG9hZGVkIiwidG90YWwiLCJ1bmlxIiwiaW50ZXJ2YWwiLCJjYW5jZWwiLCJzY2hlbWFGdWxsIiwiaGF5c3RhY2siLCJoYXNPd25Qcm9wZXJ0eSIsIiRyZWYiLCJzdWJzdHJpbmciLCJyZWxhdGlvbnMiLCJyZWxJdGVtIiwicmVsS2V5IiwibGlua0FycmF5IiwiZGF0YU9iaiIsImdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMiLCJyb3dzUmVsYXRpb25zaGlwcyIsImtSb3ciLCJrUmVsIiwia1JlbEl0ZW0iLCJncmlkQWN0aW9uQ3JlYXRlIiwiJGh0dHAiLCJzY29wZSIsIm1ldGhvZCIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsInNldFNvcnRpbmdCeVNlYXJjaCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwibGFzdEluZGV4T2YiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FBRUFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUNuQkFOLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFVBQUEsRUFBQUUsUUFBQSxFO1FBQ0FBLFFBQUEsQ0FBQUMsT0FBQSxHQUFBO0FBQUEsWUFBQSxhQUFBO0FBQUEsWUFBQSxVQUFBO0FBQUEsWUFBQSxHQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQUQsUUFBQSxDQUFBRSxVQUFBLEVBQUFDLFFBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsWUFFQSxTQUFBQyxJQUFBLENBQUFDLEtBQUEsRUFBQTtBQUFBLGdCQUNBLEtBQUFDLFFBQUEsQ0FB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LENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUFBLDRmQUFBLEVBQUE7QUFBQSxnQkFDQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsZ0NBQUEsRUFBQSxnaEJBQUEsRUFEQTtBQUFBLGdCQUVBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxzQ0FBQSxFQUFBLDJNQUFBLEVBRkE7QUFBQSxnQkFHQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFBQSwwckNBQUEsRUFIQTtBQUFBLGFBQUE7QUFBQSxTQUFBLEUiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0RW51bVZhbHVlczogX2dldEVudW1WYWx1ZXMsXG4gICAgX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9uczogX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgIF9maWVsZHNUb0Zvcm1Gb3JtYXQ6IF9maWVsZHNUb0Zvcm1Gb3JtYXQsXG4gICAgX2dldEZvcm1CdXR0b25CeVNjaGVtYTogX2dldEZvcm1CdXR0b25CeVNjaGVtYVxuICB9KTtcblxuICByZXR1cm4gRm9ybTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBmb3JtOiBzZWxmLmZvcm0sXG4gICAgICBtb2RlbDogc2VsZi5tb2RlbCxcbiAgICAgIHNjaGVtYTogc2VsZi5zY2hlbWEsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSlcblxuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHJlc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICB9KTtcbiAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgLyp2YXIgYXR0cmlidXRlcyA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoXG4gICAgICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICApLnByb3BlcnRpZXMuYXR0cmlidXRlcy5wcm9wZXJ0aWVzOyovXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGEuc2NoZW1hcygpLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKS5kZWZpbmVkUHJvcGVydGllcygpO1xuXG4gICAgICBfLmZvckVhY2goYXR0cmlidXRlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBvYmogPSB7a2V5OiBrZXl9O1xuXG4gICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgIG9iai50aXRsZU1hcCA9IHRpdGxlTWFwc1trZXldXG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2gob2JqKVxuICAgICAgfSk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRGaWVsZHNGb3JtKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWVsZHM7XG4gICAgdmFyIGluY2x1ZGVkID0gW107XG5cbiAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKGRhdGEucHJvcGVydHkoJ2RhdGEnKSkpO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgb3duOiBmaWVsZHMsXG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgfSlcbiAgICAgIH07XG5cbiAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBlbnVtIHZhbHVlcyBmb3Igc2NoZW1hIHdpdGggYWxsT2ZcbiAgICpcbiAgICogQG5hbWUgRm9ybSNfZ2V0RW51bVZhbHVlc1xuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcmV0dXJucyB7e319XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0RW51bVZhbHVlcyhkYXRhKSB7XG4gICAgdmFyIGVudW1WYWx1ZXMgPSBbXTtcblxuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgIGVudW1WYWx1ZXMucHVzaCh2YWx1ZS5wcm9wZXJ0eVZhbHVlKCdpZCcpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBlbnVtVmFsdWVzO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc291cmNlVGl0bGVNYXBzID0gW107XG4gICAgdmFyIHJlc291cmNlcyA9IFtdO1xuXG4gICAgZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnRpZXMoZnVuY3Rpb24ocHJvcGVydHlOYW1lLCBwcm9wZXJ0eURhdGEpIHtcblxuICAgICAgaWYgKCFfLmlzRW1wdHkocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpKSkge1xuICAgICAgICByZXNvdXJjZXMucHVzaCh7XG4gICAgICAgICAgdXJsOiBwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJylbMF0uaHJlZixcbiAgICAgICAgICBkYXRhOiBwcm9wZXJ0eURhdGFcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHJlc291cmNlcywgJ3VybCcpLCBmdW5jdGlvbihsb2FkUmVzb3VyY2VzKSB7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZXMsIGZ1bmN0aW9uKGVudW1zKSB7XG5cbiAgICAgICAgdmFyIHByb3BlcnR5RGF0YSA9IGVudW1zLmRhdGE7XG4gICAgICAgIHZhciBlbnVtc0RhdGEgPSBsb2FkUmVzb3VyY2VzW2VudW1zLnVybF0uZGF0YTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHNlbGYuX2dldEVudW1WYWx1ZXMoZW51bXNEYXRhKTtcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZUVudW0sIGZ1bmN0aW9uKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwocHJvcGVydHlEYXRhLmxpbmtzKCdyZWxhdGlvbicpWzBdLmhyZWYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBlbnVtSXRlbX0pO1xuXG4gICAgICAgICAgc291cmNlVGl0bGVNYXBzLnB1c2goe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgICByZWxhdGlvbk5hbWU6IHByb3BlcnR5RGF0YS5wYXJlbnRLZXkoKSxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IHByb3BlcnR5RGF0YS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2soc291cmNlVGl0bGVNYXBzKTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEsIGZ1bmN0aW9uKHNvdXJjZVRpdGxlTWFwcykge1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihfLm1hcChzb3VyY2VUaXRsZU1hcHMsICd1cmwnKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJylcbiAgICAgICAgICAgICAgLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaCxcbiAgICBzdHJUb09iamVjdDogc3RyVG9PYmplY3RcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICBmdW5jdGlvbiBzdHJUb09iamVjdChvYmosIHBhdGgpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gICAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIGsgPSBhW2ldO1xuICAgICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICAgIG9iaiA9IG9ialtrXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zID49IDApIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgJz8nIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIGFuZCBzcGxpdCBvdXQgZWFjaCBhc3NpZ25tZW50XG4gICAgICBzZWFyY2hQYXJhbXMgPSBfLmNoYWluKHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSlcbiAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oaXRlbSkgeyBpZiAoaXRlbSkgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTsgfSlcbiAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgLy8gVHVybiBba2V5LCB2YWx1ZV0gYXJyYXlzIGludG8gb2JqZWN0IHBhcmFtZXRlcnNcbiAgICAgICAgLm9iamVjdCgpXG4gICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAudmFsdWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VhcmNoUGFyYW1zIHx8IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpIHtcbiAgICB2YXIgc2VhcmNoUGF0aDtcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcbiAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nICsgc2VhcmNoUGF0aCA6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICAvL3RoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFNvcnRpbmcoKSB7XG4gICAgdGhpcy5zb3J0UGFyYW0gPSAnc29ydCc7XG4gIH1cblxuICBTb3J0aW5nLkRJUkVDVElPTl9BU0MgPSAnYXNjJztcbiAgU29ydGluZy5ESVJFQ1RJT05fREVTQyA9ICdkZXNjJztcbiAgU29ydGluZy5maWVsZCA9IHVuZGVmaW5lZDtcbiAgU29ydGluZy5kaXJlY3Rpb24gPSAnJztcbiAgU29ydGluZy5zb3J0RmllbGRzID0gW107XG5cbiAgYW5ndWxhci5leHRlbmQoU29ydGluZy5wcm90b3R5cGUsIHtcbiAgICBnZXRDb2x1bW46IGdldENvbHVtbixcbiAgICBnZXREaXJlY3Rpb25Db2x1bW46IGdldERpcmVjdGlvbkNvbHVtbixcbiAgICBzZXRTb3J0RmllbGRzOiBzZXRTb3J0RmllbGRzLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgZ2V0VXJsOiBnZXRVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFNvcnRpbmc7XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0RGlyZWN0aW9uQ29sdW1uXG4gICAqIEBwYXJhbSBjdXJyZW50RGlyZWN0aW9uXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RGlyZWN0aW9uQ29sdW1uKGN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICBpZiAoIWN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiAnYXNjJztcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnREaXJlY3Rpb24gPT0gJ2FzYycgPyAnZGVzYycgOiAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1uIGZvciBmaWVsZCBpZiBmaWVsZCBoYXZlICcuJyB0aGVuIGdldCBmaXJzdCBwYXJ0XG4gICAqIEZvciBleGFtcGxlOiAndXNlci5uYW1lJyByZXR1cm4gJ3VzZXInXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0Q29sdW1uXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uKCkge1xuICAgIGlmICh0aGlzLmZpZWxkKSB7XG4gICAgICBpZiAodGhpcy5maWVsZC5pbmRleE9mKCcuJykgPj0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWVsZC5zbGljZSgwLCB0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmZpZWxkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0aW5nXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmZpZWxkID0gZmllbGQ7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0RmllbGRzXG4gICAqIEBwYXJhbSBmaWVsZHNcbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRGaWVsZHMoZmllbGRzKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBpZiAoIXRoaXMuZmllbGQpIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnNvcnRQYXJhbSArICdbJyArIHRoaXMuZmllbGQgKyAnXSddID0gdGhpcy5kaXJlY3Rpb247XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgZ2V0U29ydGluZ1BhcmFtVmFsdWU6IGdldFNvcnRpbmdQYXJhbVZhbHVlLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgIHNlbGYucGFnaW5hdGlvbi5zZXRUb3RhbENvdW50KGRhdGEucHJvcGVydHkoJ21ldGEnKS5wcm9wZXJ0eVZhbHVlKCd0b3RhbCcpKTtcblxuICAgICAgc2VsZi5fZ2V0Um93c0J5RGF0YShkYXRhLCBmdW5jdGlvbihyb3dzKSB7XG5cbiAgICAgICAgc2VsZi5yb3dzID0gc2VsZi5yb3dzVG9UYWJsZUZvcm1hdChyb3dzKTtcbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5jb2x1bW5zID0gc2VsZi5nZXRDb2x1bW5zQnlTY2hlbWEoZGF0YSk7XG5cbiAgICAgICAgc2VsZi5zb3J0aW5nLnNldFNvcnRGaWVsZHMoXy5tYXAoc2VsZi5jb2x1bW5zLCAnYXR0cmlidXRlTmFtZScpKTtcblxuICAgICAgICBzZWxmLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgdGl0bGU6ICdBY3Rpb25zJyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiAnbGlua3MnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soc2VsZi5nZXRDb25maWcoKSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICBmaWVsZCA9IHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCk7XG4gICAgdGhpcy5zb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbilcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBUYWJsZSNnZXRTb3J0aW5nUGFyYW1CeUZpZWxkXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpIHtcbiAgICB2YXIgcmVzdWx0ID0gZmllbGQ7XG4gICAgLy92YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5KGZpZWxkKTtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuXG4gICAgaWYgKHJlbCkge1xuICAgICAgcmVzdWx0ICs9ICcuJyArIHJlbDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB2YWx1ZSBmb3IgR0VUIHNvcnRpbmcgcGFyYW1cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zb3J0aW5nLmRpcmVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCh0aGlzLnNvcnRpbmcuZmllbGQpICsgJ18nICsgdGhpcy5zb3J0aW5nLmRpcmVjdGlvblxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBDb2x1bW5zIGluZm8gYnkgc2NoZW1hXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI2dldENvbHVtbnNCeVNjaGVtYVxuICAgKiBAcGFyYW0gc2NoZW1hV2l0aG91dFJlZlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2x1bW5zQnlTY2hlbWEoZGF0YSkge1xuXG4gICAgdmFyIGdldENvbHVtbnMgPSBmdW5jdGlvbihjb2x1bW5zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIGNvbHVtbnMucHJvcGVydGllcyhmdW5jdGlvbihrZXksIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3BlcnR5LnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCk7XG4gICAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtKDApLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgdmFyIHJlbGF0aW9uc2hpcHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuXG4gICAgcmV0dXJuIF8udW5pb24oZ2V0Q29sdW1ucyhhdHRyaWJ1dGVzKSwgZ2V0Q29sdW1ucyhyZWxhdGlvbnNoaXBzKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQG5hbWUgVGFibGUjcm93c1RvVGFibGVGb3JtYXRcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93KSB7XG4gICAgICB2YXIgZGF0YSA9IHJvdy5vd247XG4gICAgICB2YXIgcm93UmVzdWx0ID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICAvL3ZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHlTY2hlbWFzKGtleSkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgIC8qKiByZWxhdGlvbkZpZWxkIGFkZGl0aW9uYWwgZmllbGQocmVsYXRpb24gcm93KSAqL1xuICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICB9KTtcblxuICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgcm93UmVzdWx0LmxpbmtzLnB1c2gobGluayk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnSGVscGVyJywgJyRpbnRlcnZhbCcsICdfJ107XG5cbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRFbnRpdHlHZXQoSGVscGVyLCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWw7XG4gICAgdmFyIG1lc3NhZ2VzID0ge1xuICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcblxuICAgICAgSnNvbmFyeS5leHRlbmREYXRhKHtcbiAgICAgICAgcmVsYXRpb25zaGlwczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgICB9LFxuICAgICAgICBhdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eVZhbHVlKCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYSh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsYXRpb25GaWVsZCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hTGlzdCh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZWxhdGlvbkZpZWxkID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmdldEZ1bGwoKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBzY2hlbWEpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNjaGVtYS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiAocmVsYXRpb25GaWVsZCA9PSBudWxsIHx8IHZhbHVlIDwgcmVsYXRpb25GaWVsZCkpIHtcbiAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkZpZWxkO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgYW5ndWxhci5leHRlbmQoRW50aXR5LnByb3RvdHlwZSwge1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgICB9LFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBnZXRUeXBlUHJvcGVydHk6IGdldFR5cGVQcm9wZXJ0eSxcbiAgICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zOiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbihqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24oalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgcmVzdWx0ID0gc2NoZW1hLmNyZWF0ZVZhbHVlKCk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0ge307XG5cbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVzID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIF8uZm9yRWFjaChzY2hlbWFBdHRyaWJ1dGVzLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHByb3BlcnR5TmFtZSkge1xuXG4gICAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXNbcHJvcGVydHlOYW1lXSA9IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSkuY3JlYXRlVmFsdWUoKSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpLmNyZWF0ZVZhbHVlKClcbiAgICAgICAgICA6IHNjaGVtYUF0dHJpYnV0ZXMucHJvcGVydHlTY2hlbWFzKHByb3BlcnR5TmFtZSlbMF0uZGVmYXVsdFZhbHVlKCk7XG4gICAgICB9KTtcblxuICAgICAgcmVzdWx0LmRhdGEucmVsYXRpb25zaGlwcyA9IHNlbGYuX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRW50aXR5I19nZXRFbXB0eURhdGFSZWxhdGlvbnNcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHBhcmFtIGZ1bGxTY2hlbWFcbiAgICAgKiBAcmV0dXJucyB7e319XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9uID0ge307XG5cbiAgICAgIHZhciBkYXRhU2NoZW1hID0gc2NoZW1hLnByb3BlcnR5U2NoZW1hcygnZGF0YScpLmdldEZ1bGwoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVzU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnNTY2hlbWEgPSBkYXRhU2NoZW1hLnByb3BlcnR5U2NoZW1hcygncmVsYXRpb25zaGlwcycpO1xuXG4gICAgICBfLmZvckVhY2gocmVsYXRpb25zU2NoZW1hLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHJlbGF0aW9uTmFtZSkge1xuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVTY2hlbWEgPSBhdHRyaWJ1dGVzU2NoZW1hLnByb3BlcnR5U2NoZW1hcyhyZWxhdGlvbk5hbWUpLmdldEZ1bGwoKTtcblxuICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdID0ge307XG4gICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0ubGlua3MgPSB7fTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZVNjaGVtYS5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVsYXRpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLmRhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBuYW1lIEVudGl0eSNmZXRjaENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbihkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgICByZXNvdXJjZXNbdXJsXSA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgdG90YWwrKztcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgc2NoZW1hIHdpdGggJHJlZiBsaW5rIHRvIHNjaGVtYSB3aXRob3V0ICRyZWZcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIHNjaGVtYUZ1bGwpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2NoZW1hO1xuXG4gICAgICBzY2hlbWFXaXRob3V0UmVmID0gX3JlcGxhY2VGcm9tRnVsbChzY2hlbWFXaXRob3V0UmVmLCBzY2hlbWFGdWxsKTtcblxuICAgICAgcmV0dXJuIHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlIGZ1bmN0aW9uIHJlcGxhY2luZyAkcmVmIGZyb20gc2NoZW1hXG4gICAgICogQHBhcmFtIGhheXN0YWNrXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrLCBzY2hlbWFGdWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gaGF5c3RhY2spIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIGhheXN0YWNrW2tleV0uJHJlZikge1xuICAgICAgICAgICAgaGF5c3RhY2tba2V5XSA9IEhlbHBlci5zdHJUb09iamVjdChzY2hlbWFGdWxsLCBoYXlzdGFja1trZXldLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJlxuICAgICAgICAgICAgWydvbmVPZicsICdhbGxPZiddLmluZGV4T2Yoa2V5KSA+PSAwXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBfLmZvckVhY2goaGF5c3RhY2tba2V5XSwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZS4kcmVmKSB7XG4gICAgICAgICAgICAgICAgaGF5c3RhY2tba2V5XVtpbmRleF0gPSBIZWxwZXIuc3RyVG9PYmplY3Qoc2NoZW1hRnVsbCwgdmFsdWUuJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhheXN0YWNrO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0UmVsYXRpb25MaW5rXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkocmVsSXRlbS5saW5rcykgJiYgIV8uaXNFbXB0eShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgICAgfV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25CZWZvcmVMb2FkRGF0YScpO1xuXG4gICAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcblxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVQYWdpbmF0aW9uJywgdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKTtcblxudGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3cgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICB2YXIgZGlyZWN0aW9uO1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IGRpcmVjdGlvbiA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgZGlyZWN0aW9uKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbVZhbHVlKCkpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgdGFibGUtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGRpdiB0YWJsZS1wYWdpbmF0aW9uIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvZGl2PlxcbjwvZ3JpZC10YWJsZT5cXG5cXG48IS0tPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPi0tPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=