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
            /**
   * Get enum values for schema with allOf
   *
   * @param schema
   * @returns {{}}
   * @private
   */
            function _getEnumValues(schema) {
                var enumValues = {};
                var schemaList = schema.andSchemas().length ? schema.andSchemas() : schema.asList();
                if (schemaList.enumValues()) {
                    enumValues = schemaList.enumValues();
                } else {
                    schemaList.each(function (index, value) {
                        if (value.itemSchemas().enumValues()) {
                            enumValues = value.itemSchemas().enumValues();
                        }
                    });
                }
                return enumValues;
            }
            function _getTitleMapsForRelations(data) {
                var self = this;
                var sourceTitleMaps = [];
                var dataRelations = data.property('relationships');
                var dataAttributes = data.property('attributes');
                var documentSchema = data.schemas()[0].data.document.raw.value();
                _.forEach(data.relationships(), function (item, key) {
                    var resourceLink = item.links.self;
                    /** get name from schema */
                    var attributeName = dataRelations.property(key).schemas().relationField();
                    var schemaAttributeWithoutRef = self._replaceFromFull(dataAttributes.schemas()[0].data.value(), documentSchema)['properties'][key];
                    var schema = Jsonary.createSchema(schemaAttributeWithoutRef);
                    var sourceEnum = self._getEnumValues(schema);
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
                    result += '.' + rel.schemas().relationField();
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
                        var data = Jsonary.create(self._getEmptyData(jSchema.data.value(), schema));
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
                function _getEmptyData(schema, fullSchema) {
                    var self = this;
                    var result;
                    var schemaWithoutRef = self.mergeRelSchema(schema, fullSchema);
                    result = _.clone(schemaWithoutRef.properties);
                    result.data = getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties));
                    result.data.attributes = self.getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties.attributes.properties));
                    //result.data.relationships = self._getEmptyDataRelations(schemaWithoutRef, fullSchema);
                    return result;
                }
                function _getEmptyDataRelations(schema, fullSchema) {
                    var self = this;
                    var relation = {};
                    var patchSchema = self.mergeRelSchema(schema, fullSchema);
                    var dataSchema = Jsonary.createSchema(patchSchema).propertySchemas('data');
                    var attributesSchema = dataSchema.propertySchemas('attributes');
                    var relationsSchema = dataSchema.propertySchemas('relationships');
                    _.forEach(relationsSchema.definedProperties(), function (relationName) {
                        var relationSchema = relationsSchema.propertySchemas(relationName).getFull().propertySchemas('data');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldEVudW1WYWx1ZXMiLCJfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9maWVsZHNUb0Zvcm1Gb3JtYXQiLCJfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwic2VsZiIsImNhbGxiYWNrIiwiZ2V0TW9kZWwiLCJ1cmwiLCJnZXRSZXNvdXJjZVVybCIsInBhcmFtcyIsImZldGNoRGF0YSIsImZldGNoRGF0YVN1Y2Nlc3MiLCJkYXRhIiwibmV3RGF0YSIsInByb3BlcnR5Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwic2NoZW1hcyIsInZhbHVlIiwiZmllbGRzIiwiY2FsbGJhY2tGb3JtQ29uZmlnIiwiY29uZmlnIiwidW5pb24iLCJ1bmRlZmluZWQiLCJyZXNvdXJjZSIsIm93biIsImZvckVhY2giLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJrZXkiLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJwcm9wZXJ0eVZhbHVlIiwiQXJyYXkiLCJpc0FycmF5IiwicmVzdWx0IiwidGl0bGVNYXBzIiwiYXR0cmlidXRlcyIsImRvY3VtZW50IiwicmF3IiwicHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9iYXRjaExvYWREYXRhIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJlbnVtVmFsdWVzIiwic2NoZW1hTGlzdCIsImFuZFNjaGVtYXMiLCJsZW5ndGgiLCJhc0xpc3QiLCJlYWNoIiwiaXRlbVNjaGVtYXMiLCJzb3VyY2VUaXRsZU1hcHMiLCJkYXRhUmVsYXRpb25zIiwiZGF0YUF0dHJpYnV0ZXMiLCJkb2N1bWVudFNjaGVtYSIsInJlc291cmNlTGluayIsImF0dHJpYnV0ZU5hbWUiLCJyZWxhdGlvbkZpZWxkIiwic2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZiIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJKc29uYXJ5IiwiY3JlYXRlU2NoZW1hIiwic291cmNlRW51bSIsImVudW1JdGVtIiwidHlwZSIsImRlZmF1bHQiLCJhY3Rpb25HZXRSZXNvdXJjZSIsImlkIiwicmVsYXRpb25OYW1lIiwiZmV0Y2hDb2xsZWN0aW9uIiwicmVzb3VyY2VzIiwibmFtZSIsInRpdGxlIiwibGluayIsIm9uQ2xpY2siLCJoZWxwZXJTcnYiLCJwYXJzZUxvY2F0aW9uU2VhcmNoIiwic2V0TG9jYXRpb25TZWFyY2giLCJzdHJUb09iamVjdCIsInBhdGgiLCJyZXBsYWNlIiwiYSIsInNwbGl0IiwiaSIsImsiLCJzZWFyY2hQYXJhbXMiLCJwb3MiLCJpbmRleE9mIiwiY2hhaW4iLCJzbGljZSIsImNvbXBhY3QiLCJvYmplY3QiLCJzZWFyY2hQYXRoIiwiT2JqZWN0Iiwia2V5cyIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJncmlkUGFnaW5hdGlvbiIsIkhlbHBlciIsIlBhZ2luYXRpb24iLCJwYWdlUGFyYW0iLCJjdXJyZW50UGFnZSIsInBlclBhZ2UiLCJ0b3RhbENvdW50IiwiZ2V0UGFnZVBhcmFtIiwic2V0VG90YWxDb3VudCIsImdldFRvdGFsQ291bnQiLCJzZXRQZXJQYWdlIiwiZ2V0UGVyUGFnZSIsImdldFBhZ2VDb3VudCIsInNldEN1cnJlbnRQYWdlIiwiZ2V0Q3VycmVudFBhZ2UiLCJnZXRPZmZzZXQiLCJnZXRQYWdlVXJsIiwidG90YWxQYWdlcyIsIk1hdGgiLCJjZWlsIiwibWF4Iiwic29ydGluZ1NydiIsIlNvcnRpbmciLCJzb3J0UGFyYW0iLCJESVJFQ1RJT05fQVNDIiwiRElSRUNUSU9OX0RFU0MiLCJmaWVsZCIsImRpcmVjdGlvbiIsInNvcnRGaWVsZHMiLCJnZXRDb2x1bW4iLCJnZXREaXJlY3Rpb25Db2x1bW4iLCJzZXRTb3J0RmllbGRzIiwic2V0U29ydGluZyIsImdldFVybCIsImN1cnJlbnREaXJlY3Rpb24iLCJncmlkVGFibGUiLCJUYWJsZSIsInBhZ2luYXRpb24iLCJzb3J0aW5nIiwicm93cyIsImNvbHVtbnMiLCJnZXRUYWJsZUluZm8iLCJnZXRDb2x1bW5zQnlTY2hlbWEiLCJyb3dzVG9UYWJsZUZvcm1hdCIsImdldFNvcnRpbmdQYXJhbUJ5RmllbGQiLCJnZXRTb3J0aW5nUGFyYW1WYWx1ZSIsIl9nZXRSb3dzQnlEYXRhIiwicmVsIiwiaXRlbXMiLCJyb3ciLCJyb3dSZXN1bHQiLCJmb3JPd24iLCJyZXMiLCJ0bXBSb3ciLCJwcm92aWRlciIsIiRnZXQiLCJncmlkRW50aXR5R2V0IiwiJGludGVydmFsIiwibWVzc2FnZXMiLCJzdWNjZXNzRGVsZXRlZCIsInN1Y2Nlc3NDcmVhdGVkIiwic3VjY2Vzc1VwZGF0ZWQiLCJzZXJ2ZXJFcnJvciIsIkVudGl0eSIsImV4dGVuZERhdGEiLCJleHRlbmRTY2hlbWEiLCJleHRlbmRTY2hlbWFMaXN0Iiwic2V0TWVzc2FnZSIsImdldE1lc3NhZ2UiLCJsb2FkRGF0YSIsImxvYWRTY2hlbWEiLCJnZXRUeXBlUHJvcGVydHkiLCJfZ2V0RW1wdHlEYXRhIiwiX2dldEVtcHR5RGF0YVJlbGF0aW9ucyIsIl9nZXRSZWxhdGlvbkxpbmsiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsImdldERhdGEiLCJqRGF0YSIsInJlcXVlc3QiLCJnZXRTY2hlbWEiLCJqU2NoZW1hIiwiY3JlYXRlIiwiYWRkU2NoZW1hIiwidG1wT2JqIiwiZnVsbFNjaGVtYSIsImNsb25lIiwicGF0Y2hTY2hlbWEiLCJkYXRhU2NoZW1hIiwicHJvcGVydHlTY2hlbWFzIiwiYXR0cmlidXRlc1NjaGVtYSIsInJlbGF0aW9uc1NjaGVtYSIsImRlZmluZWRQcm9wZXJ0aWVzIiwicmVsYXRpb25TY2hlbWEiLCJnZXRGdWxsIiwiYXR0cmlidXRlU2NoZW1hIiwiYmFzaWNUeXBlcyIsInRvU3RyaW5nIiwibGlua1Jlc291cmNlcyIsImxvYWRlZCIsInRvdGFsIiwidW5pcSIsImludGVydmFsIiwiY2FuY2VsIiwic2NoZW1hRnVsbCIsImhheXN0YWNrIiwiaGFzT3duUHJvcGVydHkiLCIkcmVmIiwic3Vic3RyaW5nIiwicmVsYXRpb25zIiwicmVsSXRlbSIsInJlbEtleSIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJpc0VtcHR5IiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiaHJlZiIsIiRicm9hZGNhc3QiLCJzY29wZUZvcm0iLCIkdmFsaWQiLCJ0aGVuIiwiYWN0aW9uQ3JlYXRlU3VjY2VzcyIsImFjdGlvbkNyZWF0ZUVycm9yIiwiYWxlcnRzIiwibXNnIiwic3RhdHVzVGV4dCIsImdyaWRBY3Rpb25EZWxldGUiLCJhY3Rpb25EZWxldGVTdWNjZXNzIiwiYWN0aW9uRGVsZXRlRXJyb3IiLCJ0YWJsZSIsImhpZGVGb3JtIiwiZ3JpZEFjdGlvbkdvVG8iLCIkbG9jYXRpb24iLCJ0ZW1wbGF0ZUxpbmsiLCJkZWZpbml0aW9uIiwicmVzdWx0TGluayIsIm1hdGNoIiwicDEiLCJzdWJqZWN0RGF0YSIsImdyaWRBY3Rpb25zIiwiYWN0aW9ucyIsImdyaWRBY3Rpb25zR2V0IiwiQWN0aW9uR29UbyIsIkFjdGlvbkRlbGV0ZSIsIkFjdGlvblVwZGF0ZSIsIkFjdGlvbkNyZWF0ZSIsImdvVG9VcGRhdGUiLCJnb1RvQ3JlYXRlIiwiZ29Ub0xpc3QiLCJyZWFkIiwiZGVsZXRlIiwidXBkYXRlIiwiYWN0aW9uIiwiYmluZCIsImdyaWRBY3Rpb25VcGRhdGUiLCJhY3Rpb25VcGRhdGVTdWNjZXNzIiwiYWN0aW9uVXBkYXRlRXJyb3IiLCJkaXJlY3RpdmUiLCJncmlkRm9ybURpcmVjdGl2ZSIsInJlc3RyaWN0IiwiY29udHJvbGxlciIsImdyaWRGb3JtRGlyZWN0aXZlQ3RybCIsIiRzY29wZSIsInNldEZvcm1TY29wZSIsImZvcm1JbnN0IiwiZ3JpZE1vZGVsIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidGFibGVJbnN0IiwidGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlIiwicmVxdWlyZSIsInRlbXBsYXRlVXJsIiwidGFibGVQYWdpbmF0aW9uQ3RybCIsIiRvbiIsInNlYXJjaCIsInBhZ2UiLCJzaG93Iiwic2V0UGFnaW5hdGlvbiIsInRvdGFsSXRlbXMiLCJpdGVtc1BlclBhZ2UiLCJwYWdlQ2hhbmdlZCIsInBhZ2VObyIsImdyaWRUaGVhZERpcmVjdGl2ZSIsImdyaWRUaGVhZEN0cmwiLCJlbGVtZW50IiwiYXR0ciIsImNvbnNvbGUiLCJsb2ciLCJzZXRTb3J0aW5nQnlTZWFyY2giLCJ3aGVyZSIsInNvcnRCeSIsImNvbHVtbiIsImxhc3RJbmRleE9mIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImN0cmwiLCJnZXRUZW1wbGF0ZVVybCIsInJ1biIsIiR0ZW1wbGF0ZUNhY2hlIiwicHV0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O1FBTUEsSUFBQUEsSUFBQSxHQUFBLEVBQUEsQztRQUNBLElBQUE7QUFBQSxZQUNBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxZQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxZQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUE7QUFBQSxZQUNBSCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxjQUFBLEVBREE7QUFBQSxZQUVBRixJQUFBLENBQUFHLElBQUEsQ0FBQSxjQUFBLEVBRkE7QUFBQSxTQUFBLENBR0EsT0FBQUMsQ0FBQSxFQUFBO0FBQUEsUztRQUVBLElBQUFDLE9BQUEsR0FBQUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBRixJQUFBLENBQUEsQztRQUVBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxHQUFBLEVBQUEsWUFBQTtBQUFBLFlBQ0EsT0FBQUMsTUFBQSxDQURBO0FBQUEsU0FBQSxFO1FDbkJBTixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxVQUFBLEVBQUFFLFFBQUEsRTtRQUNBQSxRQUFBLENBQUFDLE9BQUEsR0FBQTtBQUFBLFlBQUEsYUFBQTtBQUFBLFlBQUEsVUFBQTtBQUFBLFlBQUEsR0FBQTtBQUFBLFNBQUEsQztRQUNBLFNBQUFELFFBQUEsQ0FBQUUsVUFBQSxFQUFBQyxRQUFBLEVBQUFDLENB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QUlBLE9BQUEsMkJBQUEsQ0FKQTtBQUFBLGlCQUFBLENBREE7QUFBQSxhQWpCQTtBQUFBLFM7UUNGQWpHLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQXVWLEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7QUFBQSxZQUFBLFVBQUFDLGNBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUFDLEdBQUEsQ0FBQSwwQkFBQSxFQUFBLDRmQUFBLEVBQUE7QUFBQSxnQkFDQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsZ0NBQUEsRUFBQSxnaEJBQUEsRUFEQTtBQUFBLGdCQUVBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxzQ0FBQSxFQUFBLDJNQUFBLEVBRkE7QUFBQSxnQkFHQUQsY0FBQSxDQUFBQyxHQUFBLENBQUEsMkJBQUEsRUFBQSwwckNBQUEsRUFIQTtBQUFBLGFBQUE7QUFBQSxTQUFBLEUiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdfJywgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZEZvcm0nLCBncmlkRm9ybSk7XG5ncmlkRm9ybS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkRm9ybShncmlkRW50aXR5LCAkdGltZW91dCwgXykge1xuXG4gIGZ1bmN0aW9uIEZvcm0obW9kZWwpIHtcbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcblxuICAgIHRoaXMuZm9ybSA9IFtdO1xuICAgIHRoaXMubW9kZWwgPSB7fTtcbiAgICB0aGlzLnNjaGVtYSA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIEZvcm0ucHJvdG90eXBlID0gbmV3IGdyaWRFbnRpdHkoKTtcblxuICBhbmd1bGFyLmV4dGVuZChGb3JtLnByb3RvdHlwZSwge1xuICAgIGdldEZvcm1JbmZvOiBnZXRGb3JtSW5mbyxcbiAgICBnZXRDb25maWc6IGdldENvbmZpZyxcbiAgICBfZ2V0RW51bVZhbHVlczogX2dldEVudW1WYWx1ZXMsXG4gICAgX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9uczogX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyxcbiAgICBfY3JlYXRlVGl0bGVNYXA6IF9jcmVhdGVUaXRsZU1hcCxcbiAgICBfZ2V0Rm9ybUNvbmZpZzogX2dldEZvcm1Db25maWcsXG4gICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgIF9maWVsZHNUb0Zvcm1Gb3JtYXQ6IF9maWVsZHNUb0Zvcm1Gb3JtYXQsXG4gICAgX2dldEZvcm1CdXR0b25CeVNjaGVtYTogX2dldEZvcm1CdXR0b25CeVNjaGVtYVxuICB9KTtcblxuICByZXR1cm4gRm9ybTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICBmb3JtOiBzZWxmLmZvcm0sXG4gICAgICBtb2RlbDogc2VsZi5tb2RlbCxcbiAgICAgIHNjaGVtYTogc2VsZi5zY2hlbWEsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIGZ1bmN0aW9uIGdldEZvcm1JbmZvKGNhbGxiYWNrKSB7XG4gICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKTtcbiAgICB2YXIgdXJsO1xuXG4gICAgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIG5ld0RhdGEgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShuZXdEYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgIHNlbGYuX2dldEZpZWxkc0Zvcm0oZGF0YSwgZnVuY3Rpb24oZmllbGRzKSB7XG5cbiAgICAgICAgc2VsZi5saW5rcyA9IGRhdGEubGlua3MoKTtcbiAgICAgICAgc2VsZi5zY2hlbWEgPSBzY2hlbWFXaXRob3V0UmVmO1xuICAgICAgICBzZWxmLm1vZGVsID0gc2VsZi5fZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgc2VsZi5fZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFja0Zvcm1Db25maWcpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm9ybUNvbmZpZyhjb25maWcpIHtcbiAgICAgICAgICBzZWxmLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAvKiogYWRkIGJ1dHRvbiB0byBjb25maWcgZm9ybSAqL1xuICAgICAgICAgIHNlbGYuZm9ybSA9IF8udW5pb24oc2VsZi5mb3JtLCBzZWxmLl9nZXRGb3JtQnV0dG9uQnlTY2hlbWEoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLmxpbmtzKCkpKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSlcblxuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBtb2RlbCBmb3IgcmVuZGVyaW5nIGZvcm1cbiAgICpcbiAgICogQHBhcmFtIHJlc291cmNlXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gX2ZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgIHZhciBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykudmFsdWUoKTtcblxuICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICBmaWVsZHNba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG4gICAgICB9KTtcbiAgICAgIC8qKiBjaGVjayBpZiBkYXRhIGFzIGFycmF5IHRoZW4gcmV0dXJuIHN0cmluZyBlbHNlIGFycmF5ICovXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkucHJvcGVydHlWYWx1ZSgnZGF0YScpKSkge1xuICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgKiBAcGFyYW0gZGF0YVxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5fY3JlYXRlVGl0bGVNYXAoZGF0YS5wcm9wZXJ0eSgnZGF0YScpLCBmdW5jdGlvbih0aXRsZU1hcHMpIHtcblxuICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKFxuICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgZGF0YS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKVxuICAgICAgKS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGVudW0gdmFsdWVzIGZvciBzY2hlbWEgd2l0aCBhbGxPZlxuICAgKlxuICAgKiBAcGFyYW0gc2NoZW1hXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbnVtVmFsdWVzKHNjaGVtYSkge1xuICAgIHZhciBlbnVtVmFsdWVzID0ge307XG4gICAgdmFyIHNjaGVtYUxpc3QgPSBzY2hlbWEuYW5kU2NoZW1hcygpLmxlbmd0aCA/IHNjaGVtYS5hbmRTY2hlbWFzKCkgOiBzY2hlbWEuYXNMaXN0KCk7XG5cbiAgICBpZiAoc2NoZW1hTGlzdC5lbnVtVmFsdWVzKCkpIHtcbiAgICAgIGVudW1WYWx1ZXMgPSBzY2hlbWFMaXN0LmVudW1WYWx1ZXMoKVxuICAgIH0gZWxzZSB7XG5cbiAgICAgIHNjaGVtYUxpc3QuZWFjaChmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlLml0ZW1TY2hlbWFzKCkuZW51bVZhbHVlcygpKSB7XG4gICAgICAgICAgZW51bVZhbHVlcyA9IHZhbHVlLml0ZW1TY2hlbWFzKCkuZW51bVZhbHVlcygpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBlbnVtVmFsdWVzO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgIHZhciBkYXRhUmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpO1xuICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcblxuICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2goZGF0YS5yZWxhdGlvbnNoaXBzKCksIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFSZWxhdGlvbnMucHJvcGVydHkoa2V5KS5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoXG4gICAgICAgIGRhdGFBdHRyaWJ1dGVzLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRvY3VtZW50U2NoZW1hXG4gICAgICApWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgdmFyIHNjaGVtYSA9IEpzb25hcnkuY3JlYXRlU2NoZW1hKHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYpO1xuICAgICAgdmFyIHNvdXJjZUVudW0gPSBzZWxmLl9nZXRFbnVtVmFsdWVzKHNjaGVtYSk7XG5cbiAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbihlbnVtSXRlbSkge1xuICAgICAgICB2YXIgdXJsID0gc2VsZi5nZXRSZXNvdXJjZVVybChyZXNvdXJjZUxpbmssIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBlbnVtSXRlbX0pO1xuXG4gICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBlbnVtSXRlbTogZW51bUl0ZW0sXG4gICAgICAgICAgcmVsYXRpb25OYW1lOiBrZXksXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICB9KVxuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlVGl0bGVNYXBzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHNvdXJjZVRpdGxlTWFwcyA9IHNlbGYuX2dldFRpdGxlTWFwc0ZvclJlbGF0aW9ucyhkYXRhKTtcblxuICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKF8ubWFwKHNvdXJjZVRpdGxlTWFwcywgJ3VybCcpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24oaXRlbSkge1xuXG4gICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgLy92YWx1ZTogZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyksXG4gICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKVxuICAgICAgICAgICAgLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNvbmZpZyBmb3IgcmVuZGVyaW5nIGJ1dHRvbnMgZnJvbSBzY2hlbWEgbGlua3NcbiAgICpcbiAgICogQHBhcmFtIGxpbmtzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKGxpbmtzLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICB0eXBlOiAnYnV0dG9uJyxcbiAgICAgICAgdGl0bGU6IHZhbHVlLnRpdGxlLFxuICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgb25DbGljazogJ2VkaXQoJGV2ZW50LCBmb3JtKSdcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdIZWxwZXInLCBoZWxwZXJTcnYpO1xuaGVscGVyU3J2LiRpbmplY3QgPSBbJ18nXTtcbmZ1bmN0aW9uIGhlbHBlclNydigpIHtcblxuICB2YXIgZmFjdG9yeSA9ICB7XG4gICAgcGFyc2VMb2NhdGlvblNlYXJjaDogcGFyc2VMb2NhdGlvblNlYXJjaCxcbiAgICBzZXRMb2NhdGlvblNlYXJjaDogc2V0TG9jYXRpb25TZWFyY2gsXG4gICAgc3RyVG9PYmplY3Q6IHN0clRvT2JqZWN0XG4gIH07XG5cbiAgcmV0dXJuIGZhY3Rvcnk7XG5cbiAgZnVuY3Rpb24gc3RyVG9PYmplY3Qob2JqLCBwYXRoKSB7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvKFxcdyspL2csICcuJDEnKTsgIC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcLi8sICcnKTsgICAgICAgICAgLy8gc3RyaXAgYSBsZWFkaW5nIGRvdFxuICAgIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gYS5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBrID0gYVtpXTtcbiAgICAgIGlmIChrIGluIG9iaikge1xuICAgICAgICBvYmogPSBvYmpba107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2Ugc2VhcmNoIHBhcmFtIHVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VMb2NhdGlvblNlYXJjaCh1cmwpIHtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuICAgIHZhciBwb3MgPSB1cmwuaW5kZXhPZignPycpO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlICc/JyBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBhbmQgc3BsaXQgb3V0IGVhY2ggYXNzaWdubWVudFxuICAgICAgc2VhcmNoUGFyYW1zID0gXy5jaGFpbih1cmwuc2xpY2UodXJsLmluZGV4T2YoJz8nKSArIDEpLnNwbGl0KCcmJykpXG4gICAgICAgIC8vIFNwbGl0IGVhY2ggYXJyYXkgaXRlbSBpbnRvIFtrZXksIHZhbHVlXSBpZ25vcmUgZW1wdHkgc3RyaW5nIGlmIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgaWYgKGl0ZW0pIHJldHVybiBpdGVtLnNwbGl0KCc9Jyk7IH0pXG4gICAgICAgIC8vIFJlbW92ZSB1bmRlZmluZWQgaW4gdGhlIGNhc2UgdGhlIHNlYXJjaCBpcyBlbXB0eVxuICAgICAgICAuY29tcGFjdCgpXG4gICAgICAgIC8vIFR1cm4gW2tleSwgdmFsdWVdIGFycmF5cyBpbnRvIG9iamVjdCBwYXJhbWV0ZXJzXG4gICAgICAgIC5vYmplY3QoKVxuICAgICAgICAvLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBjaGFpbiBvcGVyYXRpb25cbiAgICAgICAgLnZhbHVlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlYXJjaFBhcmFtcyB8fCB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKSB7XG4gICAgdmFyIHNlYXJjaFBhdGg7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG4gICAgdmFyIHJlc3VsdCA9IHVybDtcblxuICAgIGlmIChwb3MgPj0gMCkge1xuICAgICAgcmVzdWx0ID0gdXJsLnNsaWNlKDAsIHBvcyk7XG4gICAgfVxuXG4gICAgc2VhcmNoUGF0aCA9IE9iamVjdC5rZXlzKHNlYXJjaFBhcmFtcykubWFwKGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHNlYXJjaFBhcmFtc1trXSlcbiAgICB9KS5qb2luKCcmJyk7XG5cbiAgICBzZWFyY2hQYXRoID0gc2VhcmNoUGF0aCA/ICc/JyArIHNlYXJjaFBhdGggOiAnJztcblxuICAgIHJldHVybiByZXN1bHQgKyBzZWFyY2hQYXRoO1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkUGFnaW5hdGlvbicsIGdyaWRQYWdpbmF0aW9uKTtcbmdyaWRQYWdpbmF0aW9uLiRpbmplY3QgPSBbJ0hlbHBlcicsICdfJ107XG5mdW5jdGlvbiBncmlkUGFnaW5hdGlvbihIZWxwZXIsIF8pIHtcblxuICBmdW5jdGlvbiBQYWdpbmF0aW9uKCkge1xuICAgIC8qKiBOYW1lIG9mIHRoZSBwYXJhbWV0ZXIgc3RvcmluZyB0aGUgY3VycmVudCBwYWdlIGluZGV4ICovXG4gICAgdGhpcy5wYWdlUGFyYW0gPSAncGFnZSc7XG4gICAgLyoqIFRoZSB6ZXJvLWJhc2VkIGN1cnJlbnQgcGFnZSBudW1iZXIgKi9cbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gMTtcbiAgICAvKiogTnVtYmVyIG9mIHBhZ2VzICovXG4gICAgLy90aGlzLnBhZ2VDb3VudCA9IDA7XG4gICAgLyoqIFRoZSBudW1iZXIgb2YgaXRlbXMgcGVyIHBhZ2UgKi9cbiAgICB0aGlzLnBlclBhZ2UgPSAxO1xuICAgIC8qKiBUb3RhbCBudW1iZXIgb2YgaXRlbXMgKi9cbiAgICB0aGlzLnRvdGFsQ291bnQgPSAyO1xuICB9XG5cbiAgYW5ndWxhci5leHRlbmQoUGFnaW5hdGlvbi5wcm90b3R5cGUsIHtcbiAgICBnZXRQYWdlUGFyYW06IGdldFBhZ2VQYXJhbSxcbiAgICBzZXRUb3RhbENvdW50OiBzZXRUb3RhbENvdW50LFxuICAgIGdldFRvdGFsQ291bnQ6IGdldFRvdGFsQ291bnQsXG4gICAgc2V0UGVyUGFnZTogc2V0UGVyUGFnZSxcbiAgICBnZXRQZXJQYWdlOiBnZXRQZXJQYWdlLFxuICAgIGdldFBhZ2VDb3VudDogZ2V0UGFnZUNvdW50LFxuICAgIHNldEN1cnJlbnRQYWdlOiBzZXRDdXJyZW50UGFnZSxcbiAgICBnZXRDdXJyZW50UGFnZTogZ2V0Q3VycmVudFBhZ2UsXG4gICAgZ2V0T2Zmc2V0OiBnZXRPZmZzZXQsXG4gICAgZ2V0UGFnZVVybDogZ2V0UGFnZVVybFxuICB9KTtcblxuICByZXR1cm4gUGFnaW5hdGlvbjtcblxuICBmdW5jdGlvbiBnZXRQYWdlUGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMucGFnZVBhcmFtO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0VG90YWxDb3VudCh0b3RhbENvdW50KSB7XG4gICAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRvdGFsQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMudG90YWxDb3VudDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFBlclBhZ2UocGVyUGFnZSkge1xuICAgIHRoaXMucGVyUGFnZSA9IHBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQZXJQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLnBlclBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlQ291bnQoKSB7XG4gICAgdmFyIHRvdGFsUGFnZXMgPSB0aGlzLnBlclBhZ2UgPCAxID8gMSA6IE1hdGguY2VpbCh0aGlzLnRvdGFsQ291bnQgLyB0aGlzLnBlclBhZ2UpO1xuICAgIHJldHVybiBNYXRoLm1heCh0b3RhbFBhZ2VzIHx8IDAsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0Q3VycmVudFBhZ2UoY3VycmVudFBhZ2UpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gY3VycmVudFBhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDdXJyZW50UGFnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE9mZnNldCgpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgcmVzdWx0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50UGFnZSB8fCAwLCAxKSAqIHRoaXMucGVyUGFnZSAtIHRoaXMucGVyUGFnZTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYWdlVXJsKHVybCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdmFyIHNlYXJjaFBhcmFtcztcblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW29mZnNldF0nXSA9IHRoaXMuZ2V0T2Zmc2V0KCk7XG4gICAgc2VhcmNoUGFyYW1zW3RoaXMucGFnZVBhcmFtICsgJ1tsaW1pdF0nXSA9IHRoaXMuZ2V0UGVyUGFnZSgpO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ1NvcnRpbmcnLCBzb3J0aW5nU3J2KTtcbnNvcnRpbmdTcnYuJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIHNvcnRpbmdTcnYoSGVscGVyLCBfKSB7XG4gIC8qKlxuICAgKiBAY2xhc3NcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBTb3J0aW5nKCkge1xuICAgIHRoaXMuc29ydFBhcmFtID0gJ3NvcnQnO1xuICB9XG5cbiAgU29ydGluZy5ESVJFQ1RJT05fQVNDID0gJ2FzYyc7XG4gIFNvcnRpbmcuRElSRUNUSU9OX0RFU0MgPSAnZGVzYyc7XG4gIFNvcnRpbmcuZmllbGQgPSB1bmRlZmluZWQ7XG4gIFNvcnRpbmcuZGlyZWN0aW9uID0gJyc7XG4gIFNvcnRpbmcuc29ydEZpZWxkcyA9IFtdO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFNvcnRpbmcucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29sdW1uOiBnZXRDb2x1bW4sXG4gICAgZ2V0RGlyZWN0aW9uQ29sdW1uOiBnZXREaXJlY3Rpb25Db2x1bW4sXG4gICAgc2V0U29ydEZpZWxkczogc2V0U29ydEZpZWxkcyxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIGdldFVybDogZ2V0VXJsXG4gIH0pO1xuXG4gIHJldHVybiBTb3J0aW5nO1xuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldERpcmVjdGlvbkNvbHVtblxuICAgKiBAcGFyYW0gY3VycmVudERpcmVjdGlvblxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldERpcmVjdGlvbkNvbHVtbihjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgaWYgKCFjdXJyZW50RGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gJ2FzYyc7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50RGlyZWN0aW9uID09ICdhc2MnID8gJ2Rlc2MnIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNvbHVtbiBmb3IgZmllbGQgaWYgZmllbGQgaGF2ZSAnLicgdGhlbiBnZXQgZmlyc3QgcGFydFxuICAgKiBGb3IgZXhhbXBsZTogJ3VzZXIubmFtZScgcmV0dXJuICd1c2VyJ1xuICAgKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldENvbHVtblxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfHVuZGVmaW5lZH1cbiAgICovXG4gIGZ1bmN0aW9uIGdldENvbHVtbigpIHtcbiAgICBpZiAodGhpcy5maWVsZCkge1xuICAgICAgaWYgKHRoaXMuZmllbGQuaW5kZXhPZignLicpID49IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmllbGQuc2xpY2UoMCwgdGhpcy5maWVsZC5pbmRleE9mKCcuJykpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5maWVsZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydGluZ1xuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHBhcmFtIGRpcmVjdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgdGhpcy5maWVsZCA9IGZpZWxkO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjc2V0U29ydEZpZWxkc1xuICAgKiBAcGFyYW0gZmllbGRzXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0RmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IGZpZWxkcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZSBTb3J0aW5nI2dldFVybFxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgaWYgKCF0aGlzLmZpZWxkKSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHNlYXJjaFBhcmFtcyA9IEhlbHBlci5wYXJzZUxvY2F0aW9uU2VhcmNoKHVybCk7XG5cbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5zb3J0UGFyYW0gKyAnWycgKyB0aGlzLmZpZWxkICsgJ10nXSA9IHRoaXMuZGlyZWN0aW9uO1xuXG4gICAgcmVzdWx0ID0gSGVscGVyLnNldExvY2F0aW9uU2VhcmNoKHVybCwgc2VhcmNoUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxufVxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZSk7XG5ncmlkVGFibGUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZFBhZ2luYXRpb24nLCAnU29ydGluZycsICckdGltZW91dCcsICdfJ107XG5mdW5jdGlvbiBncmlkVGFibGUoZ3JpZEVudGl0eSwgZ3JpZFBhZ2luYXRpb24sIFNvcnRpbmcsICR0aW1lb3V0LCBfKSB7XG5cbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFRhYmxlKG1vZGVsKSB7XG5cbiAgICB0aGlzLnNldE1vZGVsKG1vZGVsKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7Z3JpZFBhZ2luYXRpb259XG4gICAgICovXG4gICAgdGhpcy5wYWdpbmF0aW9uID0gbmV3IGdyaWRQYWdpbmF0aW9uKCk7XG4gICAgLyoqXG4gICAgICogQHR5cGUge1NvcnRpbmd9XG4gICAgICovXG4gICAgdGhpcy5zb3J0aW5nID0gbmV3IFNvcnRpbmcoKTtcbiAgICB0aGlzLnJvd3MgPSBbXTtcbiAgICB0aGlzLmNvbHVtbnMgPSB7fTtcbiAgICB0aGlzLmxpbmtzID0ge307XG4gIH1cblxuICBUYWJsZS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKFRhYmxlLnByb3RvdHlwZSwge1xuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgIGdldENvbHVtbnNCeVNjaGVtYTogZ2V0Q29sdW1uc0J5U2NoZW1hLFxuICAgIHJvd3NUb1RhYmxlRm9ybWF0OiByb3dzVG9UYWJsZUZvcm1hdCxcbiAgICBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkOiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkLFxuICAgIGdldFNvcnRpbmdQYXJhbVZhbHVlOiBnZXRTb3J0aW5nUGFyYW1WYWx1ZSxcbiAgICBzZXRTb3J0aW5nOiBzZXRTb3J0aW5nLFxuICAgIF9nZXRSb3dzQnlEYXRhOiBfZ2V0Um93c0J5RGF0YVxuICB9KTtcblxuICByZXR1cm4gVGFibGU7XG5cbiAgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgcm93czogc2VsZi5yb3dzLFxuICAgICAgY29sdW1uczogc2VsZi5jb2x1bW5zLFxuICAgICAgbGlua3M6IHNlbGYubGlua3NcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpO1xuICAgIHZhciB1cmw7XG5cbiAgICAvKiogYWRkIHBhZ2UgdG8gdXJsICovXG4gICAgdXJsID0gc2VsZi5wYWdpbmF0aW9uLmdldFBhZ2VVcmwoc2VsZi5nZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcykpO1xuICAgIC8qKiBhZGQgc29ydCB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnNvcnRpbmcuZ2V0VXJsKHVybCk7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZmV0Y2hEYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKGRhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5wYWdpbmF0aW9uLnNldFRvdGFsQ291bnQoZGF0YS5wcm9wZXJ0eSgnbWV0YScpLnByb3BlcnR5VmFsdWUoJ3RvdGFsJykpO1xuXG4gICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICBzZWxmLnJvd3MgPSBzZWxmLnJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLmNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnNCeVNjaGVtYShzY2hlbWFXaXRob3V0UmVmKTtcblxuICAgICAgICBzZWxmLnNvcnRpbmcuc2V0U29ydEZpZWxkcyhfLm1hcChzZWxmLmNvbHVtbnMsICdhdHRyaWJ1dGVOYW1lJykpO1xuXG4gICAgICAgIHNlbGYuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICB0aXRsZTogJ0FjdGlvbnMnLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhzZWxmLmdldENvbmZpZygpKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbikge1xuICAgIGZpZWxkID0gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKTtcbiAgICB0aGlzLnNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFRhYmxlI2dldFNvcnRpbmdQYXJhbUJ5RmllbGRcbiAgICogQHBhcmFtIGZpZWxkXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtQnlGaWVsZChmaWVsZCkge1xuICAgIHZhciByZXN1bHQgPSBmaWVsZDtcbiAgICB2YXIgcmVsID0gdGhpcy5kYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGZpZWxkKTtcblxuICAgIGlmIChyZWwudmFsdWUoKSkge1xuICAgICAgcmVzdWx0ICs9ICcuJyArIHJlbC5zY2hlbWFzKCkucmVsYXRpb25GaWVsZCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHZhbHVlIGZvciBHRVQgc29ydGluZyBwYXJhbVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGZ1bmN0aW9uIGdldFNvcnRpbmdQYXJhbVZhbHVlKCkge1xuICAgIGlmICh0aGlzLnNvcnRpbmcuZGlyZWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTb3J0aW5nUGFyYW1CeUZpZWxkKHRoaXMuc29ydGluZy5maWVsZCkgKyAnXycgKyB0aGlzLnNvcnRpbmcuZGlyZWN0aW9uXG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICAvKipcbiAgICogR2V0IENvbHVtbnMgaW5mbyBieSBzY2hlbWFcbiAgICpcbiAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGNvbHVtbnMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcztcblxuICAgIF8uZm9yRWFjaChjb2x1bW5zLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLyp2YXIgcmVsYXRpb25zaGlwcyA9IHt9O1xuICAgICBpZiAoc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5yZWxhdGlvbnNoaXBzKSB7XG4gICAgIHJlbGF0aW9uc2hpcHMgPSBzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMucHJvcGVydGllcztcbiAgICAgfVxuICAgICBfLmZvckVhY2gocmVsYXRpb25zaGlwcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICB2YWx1ZS5hdHRyaWJ1dGVOYW1lID0ga2V5O1xuICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgIH0pOyovXG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYXJyYXkgSnNvbmFyeSBEYXRhIHRvIHJlc3VsdCBhcnJheSBmb3IgcmVuZGVyaW5nIHRhYmxlXG4gICAqXG4gICAqIEBwYXJhbSByb3dzXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIGZ1bmN0aW9uIHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgdmFyIGRhdGEgPSByb3cub3duO1xuICAgICAgdmFyIHJvd1Jlc3VsdCA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgICBfLmZvckVhY2gocm93LnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgcm93UmVzdWx0W2tleV0gPSBfLm1hcChyZWxhdGlvbiwgZnVuY3Rpb24ocmVsYXRpb25JdGVtKSB7XG4gICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgICAgICAvKiogbmFtZSBhZGRpdGlvbmFsIGZpZWxkKHJlbGF0aW9uIHJvdykgKi9cbiAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcblxuICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1Jlc3VsdC5saW5rcyA9IFtdO1xuICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgIHJvd1Jlc3VsdC5saW5rcy5wdXNoKGxpbmspO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaChyb3dSZXN1bHQpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFycmF5IHJvd3MgYnkgSnNvbmFyeSBEYXRhXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIEpzb25hcnlcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldFJvd3NCeURhdGEoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcbiAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbXMoZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICByb3dzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcbiAgICAgIHZhciByZXMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgdmFyIHRtcFJvdyA9IHtcbiAgICAgICAgICBvd246IHJvdyxcbiAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCkge1xuICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICByZXMucHVzaCh0bXBSb3cpO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHJlcyk7XG4gICAgfVxuXG4gIH1cblxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtZW50aXR5JywgZ3JpZEVudGl0eSk7XG5cbmZ1bmN0aW9uIGdyaWRFbnRpdHkoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJ0hlbHBlcicsICckaW50ZXJ2YWwnLCAnXyddO1xuXG4gIHJldHVybiBwcm92aWRlcjtcblxuICBmdW5jdGlvbiBncmlkRW50aXR5R2V0KEhlbHBlciwgJGludGVydmFsLCBfKSB7XG4gICAgdmFyIG1vZGVsO1xuICAgIHZhciBtZXNzYWdlcyA9IHtcbiAgICAgIHN1Y2Nlc3NEZWxldGVkOiAnU3VjY2Vzc2Z1bGx5IGRlbGV0ZScsXG4gICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgc3VjY2Vzc1VwZGF0ZWQ6ICdTdWNjZXNzZnVsbHkgdXBkYXRlJyxcbiAgICAgIHNlcnZlckVycm9yOiAnT29wcyEgc2VydmVyIGVycm9yJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFbnRpdHkoKSB7XG5cbiAgICAgIEpzb25hcnkuZXh0ZW5kRGF0YSh7XG4gICAgICAgIHJlbGF0aW9uc2hpcHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgICAgfSxcbiAgICAgICAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgnYXR0cmlidXRlcycpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgSnNvbmFyeS5leHRlbmRTY2hlbWEoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhLnByb3BlcnR5VmFsdWUoJ3JlbGF0aW9uRmllbGQnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYUxpc3Qoe1xuICAgICAgICByZWxhdGlvbkZpZWxkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcmVsYXRpb25GaWVsZCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGluZGV4LCBzY2hlbWEpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNjaGVtYS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiAocmVsYXRpb25GaWVsZCA9PSBudWxsIHx8IHZhbHVlIDwgcmVsYXRpb25GaWVsZCkpIHtcbiAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkZpZWxkO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgYW5ndWxhci5leHRlbmQoRW50aXR5LnByb3RvdHlwZSwge1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgICB9LFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBnZXRUeXBlUHJvcGVydHk6IGdldFR5cGVQcm9wZXJ0eSxcbiAgICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zOiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbihqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24oalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEuZGF0YS52YWx1ZSgpLCBzY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc3VsdDtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2VsZi5tZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBzZWxmLmdldFR5cGVQcm9wZXJ0eShcbiAgICAgICAgXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcylcbiAgICAgICk7XG4gICAgICAvL3Jlc3VsdC5kYXRhLnJlbGF0aW9uc2hpcHMgPSBzZWxmLl9nZXRFbXB0eURhdGFSZWxhdGlvbnMoc2NoZW1hV2l0aG91dFJlZiwgZnVsbFNjaGVtYSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWEsIGZ1bGxTY2hlbWEpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWxhdGlvbiA9IHt9O1xuXG4gICAgICB2YXIgcGF0Y2hTY2hlbWEgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgZnVsbFNjaGVtYSk7XG5cbiAgICAgIHZhciBkYXRhU2NoZW1hID0gSnNvbmFyeS5jcmVhdGVTY2hlbWEocGF0Y2hTY2hlbWEpLnByb3BlcnR5U2NoZW1hcygnZGF0YScpO1xuICAgICAgdmFyIGF0dHJpYnV0ZXNTY2hlbWEgPSBkYXRhU2NoZW1hLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpO1xuICAgICAgdmFyIHJlbGF0aW9uc1NjaGVtYSA9IGRhdGFTY2hlbWEucHJvcGVydHlTY2hlbWFzKCdyZWxhdGlvbnNoaXBzJyk7XG5cbiAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnNTY2hlbWEuZGVmaW5lZFByb3BlcnRpZXMoKSwgZnVuY3Rpb24ocmVsYXRpb25OYW1lKSB7XG4gICAgICAgIHZhciByZWxhdGlvblNjaGVtYSA9IHJlbGF0aW9uc1NjaGVtYS5wcm9wZXJ0eVNjaGVtYXMocmVsYXRpb25OYW1lKS5nZXRGdWxsKCkucHJvcGVydHlTY2hlbWFzKCdkYXRhJyk7XG4gICAgICAgIHZhciBhdHRyaWJ1dGVTY2hlbWEgPSBhdHRyaWJ1dGVzU2NoZW1hLnByb3BlcnR5U2NoZW1hcyhyZWxhdGlvbk5hbWUpLmdldEZ1bGwoKTtcblxuICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdID0ge307XG4gICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0ubGlua3MgPSB7fTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZVNjaGVtYS5iYXNpY1R5cGVzKCkudG9TdHJpbmcoKSA9PSAnYXJyYXknKSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5kYXRhID0ge307XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVsYXRpb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGJ5IHVybCBhbmQgY2hlY2sgdHlwZSAoY3JlYXRlIG9yIG90aGVyKVxuICAgICAqIGlmIGNyZWF0ZSAtIGZldGNoIHNjaGVtYSB3aXRoIGNyZWF0ZSBlbXB0eSBkYXRhLFxuICAgICAqIGlmIG90aGVyIGFjdGlvbiAtIGZldGNoIGRhdGEgd2l0aCBzY2hlbWFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hEYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAobW9kZWwucGFyYW1zLnR5cGUgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgIHNlbGYubG9hZFNjaGVtYSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLmRhdGEgPSBkYXRhO1xuXG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSwgc2NoZW1hKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKlxuICAgICAqIEBuYW1lIEVudGl0eSNmZXRjaENvbGxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge2FycmF5fSBsaW5rUmVzb3VyY2VzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmV0Y2hDb2xsZWN0aW9uKGxpbmtSZXNvdXJjZXMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgbG9hZGVkID0gMDtcbiAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICB2YXIgbGlua3M7XG5cbiAgICAgIGxpbmtzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbihkYXRhLCBzY2hlbWEsIHJlcXVlc3QpIHtcbiAgICAgICAgICByZXNvdXJjZXNbdXJsXSA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxvYWRlZCsrO1xuICAgICAgICB9KTtcbiAgICAgICAgdG90YWwrKztcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgaW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b3RhbCA9PT0gbG9hZGVkKSB7XG4gICAgICAgICAgJGludGVydmFsLmNhbmNlbChpbnRlcnZhbCk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc291cmNlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgc2NoZW1hIHdpdGggJHJlZiBsaW5rIHRvIHNjaGVtYSB3aXRob3V0ICRyZWZcbiAgICAgKiBAcGFyYW0gc2NoZW1hXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIHNjaGVtYUZ1bGwpIHtcbiAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gc2NoZW1hO1xuXG4gICAgICBzY2hlbWFXaXRob3V0UmVmID0gX3JlcGxhY2VGcm9tRnVsbChzY2hlbWFXaXRob3V0UmVmLCBzY2hlbWFGdWxsKTtcblxuICAgICAgcmV0dXJuIHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVjdXJzaXZlIGZ1bmN0aW9uIHJlcGxhY2luZyAkcmVmIGZyb20gc2NoZW1hXG4gICAgICogQHBhcmFtIGhheXN0YWNrXG4gICAgICogQHBhcmFtIHNjaGVtYUZ1bGxcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrLCBzY2hlbWFGdWxsKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gaGF5c3RhY2spIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmIGhheXN0YWNrW2tleV0uJHJlZikge1xuICAgICAgICAgICAgaGF5c3RhY2tba2V5XSA9IEhlbHBlci5zdHJUb09iamVjdChzY2hlbWFGdWxsLCBoYXlzdGFja1trZXldLiRyZWYuc3Vic3RyaW5nKDIpKTtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJlxuICAgICAgICAgICAgWydvbmVPZicsICdhbGxPZiddLmluZGV4T2Yoa2V5KSA+PSAwXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBfLmZvckVhY2goaGF5c3RhY2tba2V5XSwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZS4kcmVmKSB7XG4gICAgICAgICAgICAgICAgaGF5c3RhY2tba2V5XVtpbmRleF0gPSBIZWxwZXIuc3RyVG9PYmplY3Qoc2NoZW1hRnVsbCwgdmFsdWUuJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgKGhheXN0YWNrW2tleV0gIT09ICdsaW5rcycpKSB7XG4gICAgICAgICAgICBfcmVwbGFjZUZyb21GdWxsKGhheXN0YWNrW2tleV0sIHNjaGVtYUZ1bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhheXN0YWNrO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBuYW1lIEVudGl0eSNfZ2V0UmVsYXRpb25MaW5rXG4gICAgICogQHBhcmFtIHJlbEl0ZW1cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uTGluayhyZWxJdGVtKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBbXTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsSXRlbS5kYXRhKSkge1xuICAgICAgICB2YXIgbGlua0FycmF5ID0gW107XG4gICAgICAgIF8uZm9yRWFjaChyZWxJdGVtLmRhdGEsIGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZGF0YU9iai5pZH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZSA9IGxpbmtBcnJheTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkocmVsSXRlbS5saW5rcykgJiYgIV8uaXNFbXB0eShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbe1xuICAgICAgICAgICAgdXJsOiBzZWxmLmdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgICAgfV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb3VyY2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rcyBmcm9tIGRhdGEgcmVsYXRpb25zaGlwcyBzZWN0aW9uXG4gICAgICogSU5QVVQ6XG4gICAgICogICBcImRhdGFcIjogW3tcbiAgICAgKiAgICAgIC4uLlxuICAgICAqICAgICAgXCJyZWxhdGlvbnNoaXBzXCI6IHtcbiAgICAgKiAgICAgICAgXCJhdXRob3JcIjoge1xuICAgICAqICAgICAgICAgICBcImxpbmtzXCI6IHtcbiAgICAgKiAgICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vdXNlcnMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICAgIH0sXG4gICAgICogICAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInVzZXJzXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgICB9XG4gICAgICogICAgICB9XG4gICAgICogICB9XVxuICAgICAqIE9VVFBVVDpcbiAgICAgKiAgIFtcbiAgICAgKiAgICAgIGh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL2F1dGhvci85XG4gICAgICogICBdXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSkge1xuXG4gICAgICAgICAgICByZXN1bHQucHVzaChyZWxJdGVtLnVybCk7XG5cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsZSAoYmF0Y2gpIGxvYWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NSZWxhdGlvbnNoaXBzXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2JhdGNoTG9hZERhdGEocm93c1JlbGF0aW9uc2hpcHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuZmV0Y2hDb2xsZWN0aW9uKGdldExpbmtGcm9tUm93c0RhdGFSZWxhdGlvbnMocm93c1JlbGF0aW9uc2hpcHMpLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIF8uZm9yRWFjaChyb3dzUmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocm93LCBrUm93KSB7XG4gICAgICAgICAgcmVzdWx0W2tSb3ddID0gcmVzdWx0W2tSb3ddIHx8IHt9O1xuICAgICAgICAgIF8uZm9yRWFjaChyb3csIGZ1bmN0aW9uKHJlbCwga1JlbCkge1xuICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdID0gcmVzdWx0W2tSb3ddW2tSZWxdIHx8IFtdO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHJlbCwgZnVuY3Rpb24ocmVsSXRlbSwga1JlbEl0ZW0pIHtcbiAgICAgICAgICAgICAgcmVzdWx0W2tSb3ddW2tSZWxdW2tSZWxJdGVtXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KTtcblxuICAgICAgfSk7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWNyZWF0ZScsIGdyaWRBY3Rpb25DcmVhdGUpO1xuZ3JpZEFjdGlvbkNyZWF0ZS4kaW5qZWN0ID0gWyckaHR0cCddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkNyZWF0ZSgkaHR0cCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIG9iai5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgICBzY29wZS5mb3JtID0gZm9ybS5mb3JtO1xuICAgICAgICBzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG5cbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWRlbGV0ZScsIGdyaWRBY3Rpb25EZWxldGUpO1xuZ3JpZEFjdGlvbkRlbGV0ZS4kaW5qZWN0ID0gWyckaHR0cCcsICdncmlkVGFibGUnLCAnZ3JpZEZvcm0nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRUYWJsZSwgZ3JpZEZvcm0pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmXG4gICAgfTtcblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25EZWxldGVTdWNjZXNzLCBhY3Rpb25EZWxldGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVTdWNjZXNzKCkge1xuICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRUYWJsZSkge1xuICAgICAgICBvYmouZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICAgc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAgICAgc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICAgc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIGdyaWRGb3JtKSB7XG4gICAgICAgIHNjb3BlLmhpZGVGb3JtID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NEZWxldGVkJylcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaykge1xuICAgIHZhciB0ZW1wbGF0ZUxpbmsgPSBsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdocmVmJyk7XG4gICAgdmFyIHJlc3VsdExpbmsgPSB0ZW1wbGF0ZUxpbmsucmVwbGFjZSgveyhbXlxceyx9XSopfS9nLCBmdW5jdGlvbihtYXRjaCwgcDEpIHtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgICAgICB0aGlzLmFjdGlvbnNbbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsJyldKG9iaiwgbGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25VcGRhdGVTdWNjZXNzLCBhY3Rpb25VcGRhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IG9iai5nZXRNZXNzYWdlKCdzdWNjZXNzVXBkYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IG9iai5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgnZ3JpZEZvcm0nLCBncmlkRm9ybURpcmVjdGl2ZSk7XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRGb3JtRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgcmVwbGFjZTogdHJ1ZSxcbiAgICBjb250cm9sbGVyOiBncmlkRm9ybURpcmVjdGl2ZUN0cmxcbiAgfTtcblxuICBncmlkRm9ybURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJ2dyaWRGb3JtJywgJ2dyaWQtYWN0aW9ucyddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmVDdHJsKCRzY29wZSwgZ3JpZEZvcm0sIGdyaWRBY3Rpb25zKSB7XG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuXG4gICAgJHNjb3BlLnNjb3BlRm9ybSA9IHtcbiAgICAgIGdyaWRGb3JtOiB7fVxuICAgIH07XG5cbiAgICAkc2NvcGUuc2V0Rm9ybVNjb3BlID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICRzY29wZS5zY29wZUZvcm0gPSBzY29wZTtcbiAgICB9O1xuXG4gICAgdmFyIGZvcm1JbnN0ID0gbmV3IGdyaWRGb3JtKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgZm9ybUluc3QuZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgJHNjb3BlLnNjaGVtYSA9IGZvcm0uc2NoZW1hO1xuICAgICAgJHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAkc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgJHNjb3BlLmxpbmtzID0gZm9ybS5saW5rcztcbiAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uKCRldmVudCwgZm9ybSkge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBmb3JtLmxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5nbyA9IGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgIGdyaWRBY3Rpb25zLmFjdGlvbihmb3JtSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZFRhYmxlJywgJ2dyaWQtYWN0aW9ucyddO1xuXG5mdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmUoZ3JpZFRhYmxlLCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHRpbWVvdXQnLCAnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCR0aW1lb3V0LCAkc2NvcGUpIHtcbiAgICAvKiogQHR5cGUge2dyaWRUYWJsZX0gKi9cbiAgICB2YXIgdGFibGVJbnN0ID0gbmV3IGdyaWRUYWJsZSgkc2NvcGUuZ3JpZE1vZGVsKTtcblxuICAgICRzY29wZS5hbGVydHMgPSBbXTtcbiAgICAkc2NvcGUudGFibGVJbnN0ID0gdGFibGVJbnN0O1xuXG4gICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25CZWZvcmVMb2FkRGF0YScpO1xuXG4gICAgICB0YWJsZUluc3QuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAgICRzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgJHNjb3BlLmNvbHVtbnMgPSB0YWJsZS5jb2x1bW5zO1xuICAgICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcblxuICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgnb25Mb2FkRGF0YScpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKHRhYmxlSW5zdCwgbGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndGFibGVQYWdpbmF0aW9uJywgdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKTtcblxudGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1wYWdpbmF0aW9uLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogdGFibGVQYWdpbmF0aW9uQ3RybFxuICB9O1xuXG4gIHRhYmxlUGFnaW5hdGlvbkN0cmwuJGluamVjdCA9IFsnJHNjb3BlJywgJyRsb2NhdGlvbiddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdGFibGVQYWdpbmF0aW9uQ3RybCgkc2NvcGUsICRsb2NhdGlvbikge1xuXG4gICAgLyoqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn0gKi9cbiAgICB2YXIgcGFnaW5hdGlvbiA9ICRzY29wZS50YWJsZUluc3QucGFnaW5hdGlvbjtcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UoJGxvY2F0aW9uLnNlYXJjaCgpLnBhZ2UpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLiRvbignb25Mb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgJHNjb3BlLnNob3cgPSB0cnVlO1xuICAgICAgJHNjb3BlLnNldFBhZ2luYXRpb24oKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRQYWdpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUudG90YWxJdGVtcyA9IHBhZ2luYXRpb24uZ2V0VG90YWxDb3VudCgpO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJHNjb3BlLml0ZW1zUGVyUGFnZSA9IHBhZ2luYXRpb24uZ2V0UGVyUGFnZSgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUucGFnZUNoYW5nZWQgPSBmdW5jdGlvbihwYWdlTm8pIHtcbiAgICAgIHBhZ2luYXRpb24uc2V0Q3VycmVudFBhZ2UocGFnZU5vKTtcbiAgICAgICRzY29wZS5jdXJyZW50UGFnZSA9IHBhZ2luYXRpb24uZ2V0Q3VycmVudFBhZ2UoKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3BhZ2UnLCBwYWdlTm8pO1xuICAgIH07XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVRoZWFkJywgZ3JpZFRoZWFkRGlyZWN0aXZlKTtcblxuZ3JpZFRoZWFkRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcblxuZnVuY3Rpb24gZ3JpZFRoZWFkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHNjb3BlOiB7XG4gICAgICB0YWJsZUluc3Q6ICc9dGFibGUnXG4gICAgfSxcbiAgICByZXF1aXJlOiAnXmdyaWRUYWJsZScsXG4gICAgdGVtcGxhdGVVcmw6ICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWwnLFxuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgY29udHJvbGxlcjogZ3JpZFRoZWFkQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cikge1xuICAgICAgLy9jb25zb2xlLmxvZyhhdHRyKTtcbiAgICB9XG4gIH07XG5cbiAgZ3JpZFRoZWFkQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGhlYWRDdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge1NvcnRpbmd9ICovXG4gICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkJlZm9yZUxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnc29ydGluZyBiZWZvcmUgbG9hZCcpO1xuICAgICAgc2V0U29ydGluZ0J5U2VhcmNoKCRsb2NhdGlvbi5zZWFyY2goKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9ICRzY29wZS50YWJsZUluc3QuY29sdW1ucztcbiAgICAgICRzY29wZS5zb3J0RmllbGRzID0gc29ydGluZy5zb3J0RmllbGRzO1xuICAgICAgJHNjb3BlLnNldFNvcnRpbmcoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5zZXRTb3J0aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmllbGQgPSBzb3J0aW5nLmdldENvbHVtbigpO1xuXG4gICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgXy53aGVyZSh0aGlzLmNvbHVtbnMsIHsnYXR0cmlidXRlTmFtZSc6IGZpZWxkfSlbMF0uc29ydGluZyA9IHNvcnRpbmcuZGlyZWN0aW9uO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAkc2NvcGUuc29ydEJ5ID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICB2YXIgZGlyZWN0aW9uO1xuXG4gICAgICBjb2x1bW4uc29ydGluZyA9IGRpcmVjdGlvbiA9IHNvcnRpbmcuZ2V0RGlyZWN0aW9uQ29sdW1uKGNvbHVtbi5zb3J0aW5nKTtcbiAgICAgICRzY29wZS50YWJsZUluc3Quc2V0U29ydGluZyhjb2x1bW4uYXR0cmlidXRlTmFtZSwgZGlyZWN0aW9uKTtcbiAgICAgICRsb2NhdGlvbi5zZWFyY2goJ3NvcnQnLCAkc2NvcGUudGFibGVJbnN0LmdldFNvcnRpbmdQYXJhbVZhbHVlKCkpO1xuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFNvcnRpbmdCeVNlYXJjaChmaWVsZHMpIHtcbiAgICAgIHZhciBzb3J0aW5nID0gJHNjb3BlLnRhYmxlSW5zdC5zb3J0aW5nO1xuXG4gICAgICBpZiAoIWZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgdmFyIHBvcyA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0ubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIHZhciBmaWVsZCA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UoMCwgcG9zKTtcbiAgICAgIHZhciBkaXJlY3Rpb24gPSBmaWVsZHNbc29ydGluZy5zb3J0UGFyYW1dLnNsaWNlKHBvcyArIDEpO1xuXG4gICAgICBzb3J0aW5nLnNldFNvcnRpbmcoZmllbGQsIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmRpcmVjdGl2ZSgndm1zR3JpZCcsIHZtc0dyaWREaXJlY3RpdmUpO1xuXG5mdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlKCkge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgdGVtcGxhdGU6ICc8bmctaW5jbHVkZSBzcmM9XCJnZXRUZW1wbGF0ZVVybCgpXCIgLz4nLFxuICAgIHNjb3BlOiB7XG4gICAgICBncmlkTW9kZWw6ICc9Z3JpZE1vZGVsJ1xuICAgIH0sXG4gICAgY29udHJvbGxlcjogdm1zR3JpZERpcmVjdGl2ZUN0cmwsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsLCBhdHRyLCBjdHJsKSB7XG5cbiAgICB9XG4gIH07XG5cbiAgdm1zR3JpZERpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB2bXNHcmlkRGlyZWN0aXZlQ3RybCgkc2NvcGUpIHtcbiAgICAkc2NvcGUuZ2V0VGVtcGxhdGVVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgkc2NvcGUuZ3JpZE1vZGVsLnBhcmFtcy50eXBlKSB7XG4gICAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCc7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoXCJncmlkXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbFwiLFwiPGdyaWQtZm9ybT5cXG4gICAgPHNwYW4gbmctcmVwZWF0PVxcXCJsaW5rIGluIGxpbmtzXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImdvKGxpbmspXFxcIj57e2xpbmsudGl0bGV9fTwvYT5cXG4gICAgPC9zcGFuPlxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuICAgIDwvZGl2PlxcbiAgICA8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XFxcImdyaWRGb3JtXFxcIiBuZy1pbml0PVxcXCJzZXRGb3JtU2NvcGUodGhpcylcXFwiXFxuICAgICAgICAgIHNmLXNjaGVtYT1cXFwic2NoZW1hXFxcIiBzZi1mb3JtPVxcXCJmb3JtXFxcIiBzZi1tb2RlbD1cXFwibW9kZWxcXFwiXFxuICAgICAgICAgIGNsYXNzPVxcXCJmb3JtLWhvcml6b250YWxcXFwiIHJvbGU9XFxcImZvcm1cXFwiIG5nLWlmPVxcXCJoaWRlRm9ybSAhPT0gdHJ1ZVxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2dyaWQtZm9ybT5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0ZW1wbGF0ZXMvZ3JpZC90YWJsZS1oZWFkLmh0bWxcIixcIjx0cj5cXG4gICAgPHRoIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKT49MFxcXCIgY2xhc3M9XFxcInRoLWlubmVyIHNvcnRhYmxlXFxcIiBuZy1jbGljaz1cXFwic29ydEJ5KGNvbHVtbiwgJGV2ZW50KVxcXCI+e3tjb2x1bW4udGl0bGV9fVxcbiAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uc29ydGluZ1xcXCIgY2xhc3M9XFxcIm9yZGVyXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2Ryb3B1cFxcJzogY29sdW1uLnNvcnRpbmc9PVxcJ2Rlc2NcXCd9XFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImNhcmV0XFxcIiBzdHlsZT1cXFwibWFyZ2luOiAwcHggNXB4O1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBuZy1pZj1cXFwic29ydEZpZWxkcy5pbmRleE9mKGNvbHVtbi5hdHRyaWJ1dGVOYW1lKTwwXFxcIiBjbGFzcz1cXFwidGgtaW5uZXJcXFwiPnt7Y29sdW1uLnRpdGxlfX08L2Rpdj5cXG4gICAgPC90aD5cXG48L3RyPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbFwiLFwiPHBhZ2luYXRpb24gbmctaWY9XFxcInNob3dcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPlxcblwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWxcIixcIjxncmlkLXRhYmxlPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPGFsZXJ0IG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gYWxlcnRzXFxcIiB0eXBlPVxcXCJ7e2FsZXJ0LnR5cGV9fVxcXCIgY2xvc2U9XFxcImNsb3NlQWxlcnQoJGluZGV4KVxcXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+XFxuXFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidGFibGUgZ3JpZFxcXCI+XFxuICAgICAgICA8dGhlYWQgdGFibGUtdGhlYWQgdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC90aGVhZD5cXG4gICAgICAgIDx0Ym9keT5cXG4gICAgICAgICAgICA8dHIgbmctcmVwZWF0PVxcXCJyb3cgaW4gcm93c1xcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZCBuZy1yZXBlYXQ9XFxcImNvbHVtbiBpbiBjb2x1bW5zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLWlmPVxcXCJjb2x1bW4uYXR0cmlidXRlTmFtZSAhPT0gXFwnbGlua3NcXCdcXFwiPnt7cm93W2NvbHVtbi5hdHRyaWJ1dGVOYW1lXX19PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lID09IFxcJ2xpbmtzXFwnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gcm93LmxpbmtzXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApO1xcXCIgbmctY2xpY2s9XFxcImVkaXQobGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGRpdiB0YWJsZS1wYWdpbmF0aW9uIHRhYmxlPVxcXCJ0YWJsZUluc3RcXFwiPjwvZGl2PlxcbjwvZ3JpZC10YWJsZT5cXG5cXG48IS0tPHBhZ2luYXRpb24gbmctaWY9XFxcInJvd3NcXFwiIGRpcmVjdGlvbi1saW5rcz1cXFwiZmFsc2VcXFwiIGJvdW5kYXJ5LWxpbmtzPVxcXCJ0cnVlXFxcIiBpdGVtcy1wZXItcGFnZT1cXFwiaXRlbXNQZXJQYWdlXFxcIiB0b3RhbC1pdGVtcz1cXFwidG90YWxJdGVtc1xcXCIgbmctbW9kZWw9XFxcImN1cnJlbnRQYWdlXFxcIiBuZy1jaGFuZ2U9XFxcInBhZ2VDaGFuZ2VkKGN1cnJlbnRQYWdlKVxcXCI+PC9wYWdpbmF0aW9uPi0tPlwiKTt9XSk7Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=