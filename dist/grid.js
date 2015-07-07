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
                    self._getFieldsForm(data, function (fields) {
                        self.links = data.links();
                        self.model = self._fieldsToFormFormat(fields);
                        self._getFormConfig(data, callbackFormConfig);
                        function callbackFormConfig(config) {
                            self.form = config;
                            self.schema = data.property('data').property('attributes').schemas()[0].data.value();
                            _.forEach(self.schema.properties, function (value, key) {
                                self.schema.properties[key] = self._convertExtendSchema(data, key);
                            });
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
                        var attributeData = data.property('attributes').property(propertyData.parentKey());
                        var sourceEnum = self._getEnumValues(loadResources[enums.url].data);
                        attributeData.addSchema(self._getExtendEnumSchema(data.property('attributes').schemas().propertySchemas(propertyData.parentKey()), sourceEnum));
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
   * @param schema
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
                /*function _replaceFromFull(schemas) {
      _.forEach(schemas.getFull().definedProperties(), function(propertyName) {
        schemas.getFull().propertySchemas(propertyName).concat(
          _replaceFromFull(schemas.getFull().propertySchemas(propertyName))
        );
      });

      return schemas;
    }*/
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2NvbnZlcnRFeHRlbmRTY2hlbWEiLCJfZ2V0RXh0ZW5kRW51bVNjaGVtYSIsIl9nZXRFbnVtVmFsdWVzIiwiX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyIsIl9jcmVhdGVUaXRsZU1hcCIsIl9nZXRGb3JtQ29uZmlnIiwiX2dldEZpZWxkc0Zvcm0iLCJfZmllbGRzVG9Gb3JtRm9ybWF0IiwiX2dldEZvcm1CdXR0b25CeVNjaGVtYSIsInNlbGYiLCJjYWxsYmFjayIsImdldE1vZGVsIiwidXJsIiwiZ2V0UmVzb3VyY2VVcmwiLCJwYXJhbXMiLCJmZXRjaERhdGEiLCJmZXRjaERhdGFTdWNjZXNzIiwiZGF0YSIsImZpZWxkcyIsImNhbGxiYWNrRm9ybUNvbmZpZyIsImNvbmZpZyIsInByb3BlcnR5Iiwic2NoZW1hcyIsInZhbHVlIiwiZm9yRWFjaCIsInByb3BlcnRpZXMiLCJrZXkiLCJ1bmlvbiIsInVuZGVmaW5lZCIsInJlc291cmNlIiwib3duIiwicmVsYXRpb25zaGlwcyIsInJlbGF0aW9uIiwibWFwIiwicmVsYXRpb25JdGVtIiwicHJvcGVydHlWYWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdCIsInRpdGxlTWFwcyIsImF0dHJpYnV0ZXMiLCJwcm9wZXJ0eVNjaGVtYXMiLCJnZXRGdWxsIiwiZGVmaW5lZFByb3BlcnRpZXMiLCJvYmoiLCJ0aXRsZU1hcCIsImluY2x1ZGVkIiwiX2dldFJlbGF0aW9uUmVzb3VyY2UiLCJfYmF0Y2hMb2FkRGF0YSIsImJhdGNoTG9hZGVkIiwicmVsYXRpb25SZXNvdXJjZXMiLCJtYXBWYWx1ZXMiLCJuIiwiaXRlbSIsImluZGV4IiwiZW51bVZhbHVlcyIsIml0ZW1zIiwic291cmNlVGl0bGVNYXBzIiwicmVzb3VyY2VzIiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlEYXRhIiwiaXNFbXB0eSIsImhyZWYiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwiZW51bXMiLCJhdHRyaWJ1dGVEYXRhIiwicGFyZW50S2V5Iiwic291cmNlRW51bSIsImFkZFNjaGVtYSIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiYXR0cmlidXRlTmFtZSIsInJlbGF0aW9uRmllbGQiLCJzY2hlbWFzRW51bSIsImFuZFNjaGVtYXMiLCJsZW5ndGgiLCJyZXBsYWNlQWxsT2ZTY2hlbWEiLCJhbGxPZiIsImFuZFNjaGVtYSIsIm1lcmdlIiwic2NoZW1hTGlzdCIsIm1lcmdlT2JqIiwiYmFzaWNUeXBlcyIsInRvU3RyaW5nIiwiZW51bSIsIkpzb25hcnkiLCJjcmVhdGVTY2hlbWEiLCJuYW1lIiwidGl0bGUiLCJsaW5rIiwib25DbGljayIsImhlbHBlclNydiIsInBhcnNlTG9jYXRpb25TZWFyY2giLCJzZXRMb2NhdGlvblNlYXJjaCIsInN0clRvT2JqZWN0IiwicGF0aCIsInJlcGxhY2UiLCJhIiwic3BsaXQiLCJpIiwiayIsInNlYXJjaFBhcmFtcyIsInBvcyIsImluZGV4T2YiLCJjaGFpbiIsInNsaWNlIiwiY29tcGFjdCIsIm9iamVjdCIsInNlYXJjaFBhdGgiLCJPYmplY3QiLCJrZXlzIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwiam9pbiIsImdyaWRQYWdpbmF0aW9uIiwiSGVscGVyIiwiUGFnaW5hdGlvbiIsInBhZ2VQYXJhbSIsImN1cnJlbnRQYWdlIiwicGVyUGFnZSIsInRvdGFsQ291bnQiLCJnZXRQYWdlUGFyYW0iLCJzZXRUb3RhbENvdW50IiwiZ2V0VG90YWxDb3VudCIsInNldFBlclBhZ2UiLCJnZXRQZXJQYWdlIiwiZ2V0UGFnZUNvdW50Iiwic2V0Q3VycmVudFBhZ2UiLCJnZXRDdXJyZW50UGFnZSIsImdldE9mZnNldCIsImdldFBhZ2VVcmwiLCJ0b3RhbFBhZ2VzIiwiTWF0aCIsImNlaWwiLCJtYXgiLCJzb3J0aW5nU3J2IiwiU29ydGluZyIsInNvcnRQYXJhbSIsIkRJUkVDVElPTl9BU0MiLCJESVJFQ1RJT05fREVTQyIsImZpZWxkIiwiZGlyZWN0aW9uIiwic29ydEZpZWxkcyIsImdldENvbHVtbiIsImdldERpcmVjdGlvbkNvbHVtbiIsInNldFNvcnRGaWVsZHMiLCJzZXRTb3J0aW5nIiwiZ2V0VXJsIiwiY3VycmVudERpcmVjdGlvbiIsImdyaWRUYWJsZSIsIlRhYmxlIiwicGFnaW5hdGlvbiIsInNvcnRpbmciLCJyb3dzIiwiY29sdW1ucyIsImdldFRhYmxlSW5mbyIsImdldENvbHVtbnNCeVNjaGVtYSIsInJvd3NUb1RhYmxlRm9ybWF0IiwiZ2V0U29ydGluZ1BhcmFtQnlGaWVsZCIsImdldFNvcnRpbmdQYXJhbVZhbHVlIiwiX2dldFJvd3NCeURhdGEiLCJyZWwiLCJnZXRDb2x1bW5zIiwicm93Iiwicm93UmVzdWx0IiwiZm9yT3duIiwicmVzIiwidG1wUm93IiwicHJvdmlkZXIiLCIkZ2V0IiwiZ3JpZEVudGl0eUdldCIsIiRpbnRlcnZhbCIsIm1lc3NhZ2VzIiwic3VjY2Vzc0RlbGV0ZWQiLCJzdWNjZXNzQ3JlYXRlZCIsInN1Y2Nlc3NVcGRhdGVkIiwic2VydmVyRXJyb3IiLCJFbnRpdHkiLCJleHRlbmREYXRhIiwiZXh0ZW5kU2NoZW1hIiwiZXh0ZW5kU2NoZW1hTGlzdCIsImVhY2giLCJzZXRNZXNzYWdlIiwiZ2V0TWVzc2FnZSIsImxvYWREYXRhIiwibG9hZFNjaGVtYSIsIm1lcmdlUmVsU2NoZW1hIiwiZ2V0VHlwZVByb3BlcnR5IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRFbXB0eURhdGFSZWxhdGlvbnMiLCJfcmVwbGFjZUZyb21GdWxsIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsImRvY3VtZW50IiwicmF3IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsInRtcE9iaiIsImNyZWF0ZVZhbHVlIiwic2NoZW1hQXR0cmlidXRlcyIsImRlZmF1bHRWYWx1ZSIsImRhdGFTY2hlbWEiLCJhdHRyaWJ1dGVzU2NoZW1hIiwicmVsYXRpb25zU2NoZW1hIiwiYXR0cmlidXRlU2NoZW1hIiwibGlua1Jlc291cmNlcyIsImxvYWRlZCIsInRvdGFsIiwidW5pcSIsImludGVydmFsIiwiY2FuY2VsIiwic2NoZW1hRnVsbCIsInNjaGVtYVdpdGhvdXRSZWYiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbGF0aW9ucyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiJGJyb2FkY2FzdCIsInNjb3BlRm9ybSIsIiR2YWxpZCIsInRoZW4iLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsInRhYmxlIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiZm9ybUluc3QiLCJncmlkTW9kZWwiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ0YWJsZUluc3QiLCJ0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUiLCJyZXF1aXJlIiwidGVtcGxhdGVVcmwiLCJ0YWJsZVBhZ2luYXRpb25DdHJsIiwiJG9uIiwic2VhcmNoIiwicGFnZSIsInNob3ciLCJzZXRQYWdpbmF0aW9uIiwidG90YWxJdGVtcyIsIml0ZW1zUGVyUGFnZSIsInBhZ2VDaGFuZ2VkIiwicGFnZU5vIiwiZ3JpZFRoZWFkRGlyZWN0aXZlIiwiZ3JpZFRoZWFkQ3RybCIsImVsZW1lbnQiLCJhdHRyIiwiY29uc29sZSIsImxvZyIsInNldFNvcnRpbmdCeVNlYXJjaCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwibGFzdEluZGV4T2YiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FBRUFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUNuQkFOLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFVBQUEsRUFBQUUsUUFBQSxFO1FBQ0FBLFFBQUEsQ0FBQUMsT0FBQSxHQUFBO0FBQUEsWUFBQSxh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QUFBLENBQUFHLFNBQUEsQ0FBQW5SLE1BQUEsQ0FBQXlELElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBN0YsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBOFYsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDByQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9jb252ZXJ0RXh0ZW5kU2NoZW1hOiBfY29udmVydEV4dGVuZFNjaGVtYSxcbiAgICBfZ2V0RXh0ZW5kRW51bVNjaGVtYTogX2dldEV4dGVuZEVudW1TY2hlbWEsXG4gICAgX2dldEVudW1WYWx1ZXM6IF9nZXRFbnVtVmFsdWVzLFxuICAgIF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnM6IF9nZXRUaXRsZU1hcHNGb3JSZWxhdGlvbnMsXG4gICAgX2NyZWF0ZVRpdGxlTWFwOiBfY3JlYXRlVGl0bGVNYXAsXG4gICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgIF9nZXRGaWVsZHNGb3JtOiBfZ2V0RmllbGRzRm9ybSxcbiAgICBfZmllbGRzVG9Gb3JtRm9ybWF0OiBfZmllbGRzVG9Gb3JtRm9ybWF0LFxuICAgIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWE6IF9nZXRGb3JtQnV0dG9uQnlTY2hlbWFcbiAgfSk7XG5cbiAgcmV0dXJuIEZvcm07XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgZm9ybTogc2VsZi5mb3JtLFxuICAgICAgbW9kZWw6IHNlbGYubW9kZWwsXG4gICAgICBzY2hlbWE6IHNlbGYuc2NoZW1hLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwobW9kZWwudXJsLCBtb2RlbC5wYXJhbXMpO1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcblxuICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMpIHtcblxuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICBzZWxmLnNjaGVtYSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCk7XG4gICAgICAgICAgXy5mb3JFYWNoKHNlbGYuc2NoZW1hLnByb3BlcnRpZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIHNlbGYuc2NoZW1hLnByb3BlcnRpZXNba2V5XSA9IHNlbGYuX2NvbnZlcnRFeHRlbmRTY2hlbWEoZGF0YSwga2V5KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgc2VsZi5mb3JtID0gXy51bmlvbihzZWxmLmZvcm0sIHNlbGYuX2dldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9KVxuXG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pO1xuICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICAvKnZhciBhdHRyaWJ1dGVzID0gc2VsZi5tZXJnZVJlbFNjaGVtYShcbiAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7Ki9cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpLmRlZmluZWRQcm9wZXJ0aWVzKCk7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGVudW0gdmFsdWVzIGZvciBzY2hlbWEgd2l0aCBhbGxPZlxuICAgKlxuICAgKiBAbmFtZSBGb3JtI19nZXRFbnVtVmFsdWVzXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbnVtVmFsdWVzKGRhdGEpIHtcbiAgICB2YXIgZW51bVZhbHVlcyA9IFtdO1xuXG4gICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgZW51bVZhbHVlcy5wdXNoKHZhbHVlLnByb3BlcnR5VmFsdWUoJ2lkJykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcbiAgICB2YXIgcmVzb3VyY2VzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydGllcyhmdW5jdGlvbihwcm9wZXJ0eU5hbWUsIHByb3BlcnR5RGF0YSkge1xuXG4gICAgICBpZiAoIV8uaXNFbXB0eShwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJykpKSB7XG4gICAgICAgIHJlc291cmNlcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLFxuICAgICAgICAgIGRhdGE6IHByb3BlcnR5RGF0YVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAocmVzb3VyY2VzLCAndXJsJyksIGZ1bmN0aW9uKGxvYWRSZXNvdXJjZXMpIHtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlcywgZnVuY3Rpb24oZW51bXMpIHtcblxuICAgICAgICB2YXIgcHJvcGVydHlEYXRhID0gZW51bXMuZGF0YTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZURhdGEgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHkocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHNlbGYuX2dldEVudW1WYWx1ZXMobG9hZFJlc291cmNlc1tlbnVtcy51cmxdLmRhdGEpO1xuXG4gICAgICAgIGF0dHJpYnV0ZURhdGEuYWRkU2NoZW1hKHNlbGYuX2dldEV4dGVuZEVudW1TY2hlbWEoZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlEYXRhLnBhcmVudEtleSgpKSwgc291cmNlRW51bSkpO1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbihlbnVtSXRlbSkge1xuICAgICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgICAgcmVsYXRpb25OYW1lOiBwcm9wZXJ0eURhdGEucGFyZW50S2V5KCksXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBwcm9wZXJ0eURhdGEuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHNvdXJjZVRpdGxlTWFwcyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IGV4dGVuZGVkIHNjaGVtYSB0byBzaW1wbGUgc2NoZW1hLiBGb3IgZXhhbXBsZSBpZiBzY2hlbWEgaGFzIHByb3BlcnR5IGFsbE9mXG4gICAqIHRoZW4gd2lsbCBiZSByZXBsYWNlZCBvbiBzY2hlbWEgd2hpY2ggIG1lcmdlIGFsbCBpdGVtcyBhbGxPZiBlbHNlIHJldHVybiBzY2hlbWEgd2l0aG91dCBjaGFuZ2VkXG4gICAqXG4gICAqIEBwYXJhbSBzY2hlbWFcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfY29udmVydEV4dGVuZFNjaGVtYShkYXRhLCBrZXkpIHtcbiAgICB2YXIgc2NoZW1hcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnNjaGVtYXMoKS5wcm9wZXJ0eVNjaGVtYXMoa2V5KS5nZXRGdWxsKCk7XG4gICAgdmFyIHNjaGVtYXNFbnVtID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkuZ2V0RnVsbCgpO1xuXG4gICAgaWYgKHNjaGVtYXNbMF0uYW5kU2NoZW1hcygpLmxlbmd0aCkge1xuICAgICAgdmFyIHJlcGxhY2VBbGxPZlNjaGVtYSA9IHNjaGVtYXNbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgZGVsZXRlIHJlcGxhY2VBbGxPZlNjaGVtYS5hbGxPZjtcblxuICAgICAgYW5ndWxhci5mb3JFYWNoKHNjaGVtYXNbMF0uYW5kU2NoZW1hcygpLCBmdW5jdGlvbihhbmRTY2hlbWEpIHtcbiAgICAgICAgcmVwbGFjZUFsbE9mU2NoZW1hID0gYW5ndWxhci5leHRlbmQoYW5kU2NoZW1hLmRhdGEudmFsdWUoKSwgcmVwbGFjZUFsbE9mU2NoZW1hKVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVwbGFjZUFsbE9mU2NoZW1hO1xuICAgIH1cblxuICAgIHJldHVybiBfLm1lcmdlKHt9LCBzY2hlbWFzWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hc0VudW1bMF0uZGF0YS52YWx1ZSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9nZXRFeHRlbmRFbnVtU2NoZW1hKHNjaGVtYUxpc3QsIHNvdXJjZUVudW0pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1lcmdlT2JqO1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBpZiAoc2NoZW1hTGlzdC5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICBtZXJnZU9iaiA9IHtcbiAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICBlbnVtOiBzb3VyY2VFbnVtXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VPYmogPSB7ZW51bTogc291cmNlRW51bX1cbiAgICB9XG5cbiAgICByZXN1bHQgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShcbiAgICAgIF8ubWVyZ2Uoe30sIHNjaGVtYUxpc3RbMF0uZGF0YS52YWx1ZSgpLCBtZXJnZU9iailcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGl0bGVNYXAgZm9yIGZvcm0gYW5kIGxvYWQgZGVwZW5kZW5jeSByZXNvdXJjZVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhLCBmdW5jdGlvbihzb3VyY2VUaXRsZU1hcHMpIHtcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgICAgICAgaWYgKCF0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdKSB7XG4gICAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdID0gW107XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXS5wdXNoKHtcbiAgICAgICAgICAgIHZhbHVlOiBpdGVtLmVudW1JdGVtLFxuICAgICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgICBuYW1lOiByZXNvdXJjZXNbaXRlbS51cmxdLmRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpXG4gICAgICAgICAgICAgIC5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbih1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykpXG4gICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgIC5vYmplY3QoKVxuICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JyArIHNlYXJjaFBhdGggOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlVXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW29mZnNldF0nXSA9IHRoaXMuZ2V0T2Zmc2V0KCk7XG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tsaW1pdF0nXSA9IHRoaXMuZ2V0UGVyUGFnZSgpO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ1NvcnRpbmcnLCBzb3J0aW5nU3J2KTtcbnNvcnRpbmdTcnYuJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIHNvcnRpbmdTcnYoSGVscGVyLCBfKSB7XG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpID49IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldFVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgaWYgKCF0aGlzLmZpZWxkKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5zb3J0UGFyYW0gKyAnWycgKyB0aGlzLmZpZWxkICsgJ10nXSA9IHRoaXMuZGlyZWN0aW9uO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZSk7XG5ncmlkVGFibGUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFBhZ2luYXRpb24nLCAnU29ydGluZycsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgZ3JpZFBhZ2luYXRpb24sIFNvcnRpbmcsICR0aW1lb3V0LCBfKSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFRhYmxlKG1vZGVsKSB7XG5cbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdGhpcy5wYWdpbmF0aW9uID0gbmV3IGdyaWRQYWdpbmF0aW9uKCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge1NvcnRpbmd9XG4gICAgICovXG4gICAgdGhpcy5zb3J0aW5nID0gbmV3IFNvcnRpbmcoKTtcbiAgICB0aGlzLnJvd3MgPSBbXTtcbiAgICB0aGlzLmNvbHVtbnMgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBUYWJsZS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFRhYmxlLnByb3RvdHlwZSwge1xuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIGdldFNvcnRpbmdQYXJhbVZhbHVlOiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YVxuICB9KTtcblxuICByZXR1cm4gVGFibGU7XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcm93czogc2VsZi5yb3dzLFxuICAgICAgY29sdW1uczogc2VsZi5jb2x1bW5zLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpO1xuICAgIHZhciB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG5cbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKGRhdGEpO1xuXG4gICAgICAgIHNlbGYuc29ydGluZy5zZXRTb3J0RmllbGRzKF8ubWFwKHNlbGYuY29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICAgICAgc2VsZi5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgZmllbGQgPSB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpO1xuICAgIHRoaXMuc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pXG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgVGFibGUjZ2V0U29ydGluZ1BhcmFtQnlGaWVsZFxuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZpZWxkO1xuICAgIC8vdmFyIHJlbCA9IHRoaXMuZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eShmaWVsZCk7XG4gICAgdmFyIHJlbCA9IHRoaXMuZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShmaWVsZCkuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKTtcblxuICAgIGlmIChyZWwpIHtcbiAgICAgIHJlc3VsdCArPSAnLicgKyByZWw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdmFsdWUgZm9yIEdFVCBzb3J0aW5nIHBhcmFtXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtVmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuc29ydGluZy5kaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQodGhpcy5zb3J0aW5nLmZpZWxkKSArICdfJyArIHRoaXMuc29ydGluZy5kaXJlY3Rpb25cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAbmFtZSBUYWJsZSNnZXRDb2x1bW5zQnlTY2hlbWFcbiAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKGRhdGEpIHtcblxuICAgIHZhciBnZXRDb2x1bW5zID0gZnVuY3Rpb24oY29sdW1ucykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBjb2x1bW5zLnByb3BlcnRpZXMoZnVuY3Rpb24oa2V5LCBwcm9wZXJ0eSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwcm9wZXJ0eS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpO1xuICAgICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgIHZhciByZWxhdGlvbnNoaXBzID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgIHJldHVybiBfLnVuaW9uKGdldENvbHVtbnMoYXR0cmlidXRlcyksIGdldENvbHVtbnMocmVsYXRpb25zaGlwcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBuYW1lIFRhYmxlI3Jvd3NUb1RhYmxlRm9ybWF0XG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgdmFyIGRhdGEgPSByb3cub3duO1xuICAgICAgdmFyIHJvd1Jlc3VsdCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocm93LnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgcm93UmVzdWx0W2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgLy92YXIgZmllbGQgPSByb3cub3duLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgIHZhciBmaWVsZCA9IHJvdy5vd24uc2NoZW1hcygpLnByb3BlcnR5U2NoZW1hcygncmVsYXRpb25zaGlwcycpLnByb3BlcnR5U2NoZW1hcyhrZXkpLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgICAgICAvKiogcmVsYXRpb25GaWVsZCBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgfVxuXG4gIH1cblxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJ0hlbHBlcicsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KEhlbHBlciwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsO1xuICAgIHZhciBtZXNzYWdlcyA9IHtcbiAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFbnRpdHkoKSB7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kRGF0YSh7XG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgnYXR0cmlidXRlcycpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWEoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uRmllbGQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYUxpc3Qoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5nZXRGdWxsKCkuZWFjaChmdW5jdGlvbihpbmRleCwgc2NoZW1hKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzY2hlbWEucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwgJiYgKHJlbGF0aW9uRmllbGQgPT0gbnVsbCB8fCB2YWx1ZSA8IHJlbGF0aW9uRmllbGQpKSB7XG4gICAgICAgICAgICAgIHJlbGF0aW9uRmllbGQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25GaWVsZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBKc29uYXJ5IGRhdGEgb2JqZWN0XG4gICAgICpcbiAgICAgKiBAdHlwZSB7SnNvbmFyeX1cbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSB7fTtcblxuICAgIGFuZ3VsYXIuZXh0ZW5kKEVudGl0eS5wcm90b3R5cGUsIHtcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgYWN0aW9uR2V0UmVzb3VyY2U6ICdyZWFkJ1xuICAgICAgfSxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXRNb2RlbDogc2V0TW9kZWwsXG4gICAgICBnZXRNb2RlbDogZ2V0TW9kZWwsXG4gICAgICBzZXRNZXNzYWdlOiBzZXRNZXNzYWdlLFxuICAgICAgZ2V0TWVzc2FnZTogZ2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBsb2FkRGF0YTogbG9hZERhdGEsXG4gICAgICBsb2FkU2NoZW1hOiBsb2FkU2NoZW1hLFxuICAgICAgZ2V0UmVzb3VyY2VVcmw6IGdldFJlc291cmNlVXJsLFxuICAgICAgbWVyZ2VSZWxTY2hlbWE6IG1lcmdlUmVsU2NoZW1hLFxuICAgICAgZ2V0VHlwZVByb3BlcnR5OiBnZXRUeXBlUHJvcGVydHksXG4gICAgICBfZ2V0RW1wdHlEYXRhOiBfZ2V0RW1wdHlEYXRhLFxuICAgICAgX2dldEVtcHR5RGF0YVJlbGF0aW9uczogX2dldEVtcHR5RGF0YVJlbGF0aW9ucyxcbiAgICAgIF9nZXRSZWxhdGlvblJlc291cmNlOiBfZ2V0UmVsYXRpb25SZXNvdXJjZSxcbiAgICAgIF9yZXBsYWNlRnJvbUZ1bGw6IF9yZXBsYWNlRnJvbUZ1bGwsXG4gICAgICBfZ2V0UmVsYXRpb25MaW5rOiBfZ2V0UmVsYXRpb25MaW5rLFxuICAgICAgX2JhdGNoTG9hZERhdGE6IF9iYXRjaExvYWREYXRhXG4gICAgfSk7XG5cbiAgICByZXR1cm4gRW50aXR5O1xuXG4gICAgZnVuY3Rpb24gc2V0TW9kZWwoTW9kZWwpIHtcbiAgICAgIG1vZGVsID0gTW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TW9kZWwoKSB7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWVzc2FnZShwYXJhbSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2VzW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlKHBhcmFtLCBtZXNzYWdlKSB7XG4gICAgICBtZXNzYWdlc1twYXJhbV0gPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1cmwgYnkgcGFyYW1zIGZvciBsb2FkIHJlc291cmNlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBkYXRhIGJ5IHVybCBhbmQgaW5jbHVkZSBzY2hlbWEgZnJvbSBoZWFkZXIgZGF0YVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24oakRhdGEsIHJlcXVlc3QpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBqRGF0YTtcbiAgICAgICAgdmFyIHNjaGVtYSA9IGpEYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEsIHJlcXVlc3QpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggc2NoZW1hIGJ5IHVybCwgY3JlYXRlIGVtcHR5IGRhdGEgYW5kIGpvaW4gdGhlbVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBsb2FkU2NoZW1hKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBKc29uYXJ5LmdldFNjaGVtYSh1cmwsIGZ1bmN0aW9uKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0eShvYmopIHtcbiAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICBfLmZvckVhY2godG1wT2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGlmICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgc3dpdGNoICh2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRtcE9iajtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlbXB0eSBtb2RlbCBmb3IgY3JlYXRlIGZvcm1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gZnVsbFNjaGVtYVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YShzY2hlbWEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHJlc3VsdCA9IHNjaGVtYS5jcmVhdGVWYWx1ZSgpO1xuICAgICAgcmVzdWx0LmRhdGEuYXR0cmlidXRlcyA9IHt9O1xuXG4gICAgICB2YXIgc2NoZW1hQXR0cmlidXRlcyA9IHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCkucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICBfLmZvckVhY2goc2NoZW1hQXR0cmlidXRlcy5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihwcm9wZXJ0eU5hbWUpIHtcblxuICAgICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzW3Byb3BlcnR5TmFtZV0gPSBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpLmNyZWF0ZVZhbHVlKCkgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gc2NoZW1hQXR0cmlidXRlcy5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKS5jcmVhdGVWYWx1ZSgpXG4gICAgICAgICAgOiBzY2hlbWFBdHRyaWJ1dGVzLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpWzBdLmRlZmF1bHRWYWx1ZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIHJlc3VsdC5kYXRhLnJlbGF0aW9uc2hpcHMgPSBzZWxmLl9nZXRFbXB0eURhdGFSZWxhdGlvbnMoc2NoZW1hKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0RW1wdHlEYXRhUmVsYXRpb25zXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAgICogQHJldHVybnMge3t9fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbiA9IHt9O1xuXG4gICAgICB2YXIgZGF0YVNjaGVtYSA9IHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCk7XG4gICAgICB2YXIgYXR0cmlidXRlc1NjaGVtYSA9IGRhdGFTY2hlbWEucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgcmVsYXRpb25zU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc1NjaGVtYS5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihyZWxhdGlvbk5hbWUpIHtcblxuICAgICAgICB2YXIgYXR0cmlidXRlU2NoZW1hID0gYXR0cmlidXRlc1NjaGVtYS5wcm9wZXJ0eVNjaGVtYXMocmVsYXRpb25OYW1lKS5nZXRGdWxsKCk7XG5cbiAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXSA9IHt9O1xuICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdLmxpbmtzID0ge307XG4gICAgICAgIGlmIChhdHRyaWJ1dGVTY2hlbWEuYmFzaWNUeXBlcygpLnRvU3RyaW5nKCkgPT0gJ2FycmF5Jykge1xuICAgICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0uZGF0YSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0uZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlbGF0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBieSB1cmwgYW5kIGNoZWNrIHR5cGUgKGNyZWF0ZSBvciBvdGhlcilcbiAgICAgKiBpZiBjcmVhdGUgLSBmZXRjaCBzY2hlbWEgd2l0aCBjcmVhdGUgZW1wdHkgZGF0YSxcbiAgICAgKiBpZiBvdGhlciBhY3Rpb24gLSBmZXRjaCBkYXRhIHdpdGggc2NoZW1hXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoRGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKG1vZGVsLnBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmV0Y2hEYXRhU3VjY2VzcyhkYXRhLCBzY2hlbWEpIHtcbiAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSBsb2FkIHJlc291cmNlIGJ5IGFycmF5IGxpbmtzXG4gICAgICpcbiAgICAgKiBAbmFtZSBFbnRpdHkjZmV0Y2hDb2xsZWN0aW9uXG4gICAgICogQHBhcmFtIHthcnJheX0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgdmFyIGxpbmtzO1xuXG4gICAgICBsaW5rcyA9IF8udW5pcShsaW5rUmVzb3VyY2VzKTtcblxuICAgICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih1cmwpIHtcblxuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZnVuY3Rpb24oZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHNjaGVtYSB3aXRoICRyZWYgbGluayB0byBzY2hlbWEgd2l0aG91dCAkcmVmXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBzY2hlbWFGdWxsKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNjaGVtYTtcblxuICAgICAgc2NoZW1hV2l0aG91dFJlZiA9IF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hV2l0aG91dFJlZiwgc2NoZW1hRnVsbCk7XG5cbiAgICAgIHJldHVybiBzY2hlbWFXaXRob3V0UmVmO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZSBmdW5jdGlvbiByZXBsYWNpbmcgJHJlZiBmcm9tIHNjaGVtYVxuICAgICAqIEBwYXJhbSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSBzY2hlbWFGdWxsXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFjaywgc2NoZW1hRnVsbCkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGhheXN0YWNrKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiBoYXlzdGFja1trZXldLiRyZWYpIHtcbiAgICAgICAgICAgIGhheXN0YWNrW2tleV0gPSBIZWxwZXIuc3RyVG9PYmplY3Qoc2NoZW1hRnVsbCwgaGF5c3RhY2tba2V5XS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICB0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiZcbiAgICAgICAgICAgIFsnb25lT2YnLCAnYWxsT2YnXS5pbmRleE9mKGtleSkgPj0gMFxuICAgICAgICAgICkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKGhheXN0YWNrW2tleV0sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUuJHJlZikge1xuICAgICAgICAgICAgICAgIGhheXN0YWNrW2tleV1baW5kZXhdID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIHZhbHVlLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIChoYXlzdGFja1trZXldICE9PSAnbGlua3MnKSkge1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXlzdGFjaztcbiAgICB9XG5cbiAgICAvKmZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoc2NoZW1hcykge1xuICAgICAgXy5mb3JFYWNoKHNjaGVtYXMuZ2V0RnVsbCgpLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHByb3BlcnR5TmFtZSkge1xuICAgICAgICBzY2hlbWFzLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKS5jb25jYXQoXG4gICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChzY2hlbWFzLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMocHJvcGVydHlOYW1lKSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gc2NoZW1hcztcbiAgICB9Ki9cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0UmVsYXRpb25MaW5rXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkocmVsSXRlbS5saW5rcykgJiYgIV8uaXNFbXB0eShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgICAgfV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25CZWZvcmVMb2FkRGF0YScpO1xuXG4gICAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcblxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVQYWdpbmF0aW9uJywgdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKTtcblxudGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3cgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICB2YXIgZGlyZWN0aW9uO1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IGRpcmVjdGlvbiA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgZGlyZWN0aW9uKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbVZhbHVlKCkpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgdGFibGUtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGRpdiB0YWJsZS1wYWdpbmF0aW9uIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvZGl2PlxcbjwvZ3JpZC10YWJsZT5cXG5cXG48IS0tPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPi0tPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=