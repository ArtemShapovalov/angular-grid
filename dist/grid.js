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
                });    /*var dataAttributes = data.property('attributes');
    var documentSchema = data.schemas()[0].data.document.raw.value();

    _.forEach(data.relationships(), function(item, key) {

      var resourceLink = item.links.self;
      //var attributeName = dataAttributes.property(key).schemas().relationField();
      var attributeName = dataAttributes.schemas()[0].propertySchemas(key).relationField();
      var schemaAttributeWithoutRef = self._replaceFromFull(
        dataAttributes.schemas()[0].data.value(),
        documentSchema
      )['properties'][key];

      var schema = Jsonary.createSchema(schemaAttributeWithoutRef);
      var sourceEnum = self._getEnumValues(schema);

      _.forEach(sourceEnum, function(enumItem) {
        var url = self.getResourceUrl(resourceLink, {type: self.default.actionGetResource, id: enumItem});

        sourceTitleMaps.push({
          url: url,
          enumItem: enumItem,
          relationName: key,
          attributeName: attributeName
        })
      });

    });
    return sourceTitleMaps;*/
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
                    var schemaWithoutRef = self.mergeRelSchema(data.schemas()[0].data.value(), schema);
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
                var result = [];
                var columns = data.property('data').item(0).schemas().propertySchemas('attributes');
                _.forEach(columns.definedProperties(), function (key) {
                    var value = columns.propertySchemas(key)[0].data.value();
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
                    _.forEach(schema.propertySchemas('data').getFull().propertySchemas('attributes').definedProperties(), function (propertyName) {
                        result.data.attributes[propertyName] = schema.propertySchemas('data').getFull().propertySchemas('attributes').propertySchemas(propertyName).createValue();
                    });
                    /*result.data.attributes = self.getTypeProperty(
        schema.propertySchemas('data').getFull().propertySchemas('attributes')[0].data.value().properties
      );*/
                    //result.data.relationships = self._getEmptyDataRelations(schemaWithoutRef, fullSchema);git
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQtZm9ybS5qcyIsImdyaWQtaGVscGVyLmpzIiwiZ3JpZC1wYWdpbmF0aW9uLmpzIiwiZ3JpZC1zb3J0aW5nLmpzIiwiZ3JpZC10YWJsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdGFibGUtcGFnaW5hdGlvbi5qcyIsImRpcmVjdGl2ZXMvdGFibGUtdGhlYWQuanMiLCJkaXJlY3RpdmVzL3Ztcy1ncmlkLmpzIiwidGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbImRlcHMiLCJhbmd1bGFyIiwibW9kdWxlIiwicHVzaCIsImUiLCJ2bXNHcmlkIiwiZmFjdG9yeSIsImxvZGFzaCIsImdyaWRGb3JtIiwiJGluamVjdCIsImdyaWRFbnRpdHkiLCIkdGltZW91dCIsIl8iLCJGb3JtIiwibW9kZWwiLCJzZXRNb2RlbCIsImZvcm0iLCJzY2hlbWEiLCJsaW5rcyIsInByb3RvdHlwZSIsImV4dGVuZCIsImdldEZvcm1JbmZvIiwiZ2V0Q29uZmlnIiwiX2dldEVudW1WYWx1ZXMiLCJfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9maWVsZHNUb0Zvcm1Gb3JtYXQiLCJfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hIiwic2VsZiIsImNhbGxiYWNrIiwiZ2V0TW9kZWwiLCJ1cmwiLCJnZXRSZXNvdXJjZVVybCIsInBhcmFtcyIsImZldGNoRGF0YSIsImZldGNoRGF0YVN1Y2Nlc3MiLCJkYXRhIiwibmV3RGF0YSIsInByb3BlcnR5Iiwic2NoZW1hV2l0aG91dFJlZiIsIm1lcmdlUmVsU2NoZW1hIiwic2NoZW1hcyIsInZhbHVlIiwiZmllbGRzIiwiY2FsbGJhY2tGb3JtQ29uZmlnIiwiY29uZmlnIiwidW5pb24iLCJ1bmRlZmluZWQiLCJyZXNvdXJjZSIsIm93biIsImZvckVhY2giLCJyZWxhdGlvbnNoaXBzIiwicmVsYXRpb24iLCJrZXkiLCJtYXAiLCJyZWxhdGlvbkl0ZW0iLCJwcm9wZXJ0eVZhbHVlIiwiQXJyYXkiLCJpc0FycmF5IiwicmVzdWx0IiwidGl0bGVNYXBzIiwiYXR0cmlidXRlcyIsInByb3BlcnR5U2NoZW1hcyIsImdldEZ1bGwiLCJkZWZpbmVkUHJvcGVydGllcyIsIm9iaiIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9iYXRjaExvYWREYXRhIiwiYmF0Y2hMb2FkZWQiLCJyZWxhdGlvblJlc291cmNlcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJlbnVtVmFsdWVzIiwiaXRlbXMiLCJzb3VyY2VUaXRsZU1hcHMiLCJyZXNvdXJjZXMiLCJwcm9wZXJ0aWVzIiwicHJvcGVydHlOYW1lIiwicHJvcGVydHlEYXRhIiwiaXNFbXB0eSIsImhyZWYiLCJmZXRjaENvbGxlY3Rpb24iLCJsb2FkUmVzb3VyY2VzIiwiZW51bXMiLCJlbnVtc0RhdGEiLCJzb3VyY2VFbnVtIiwiZW51bUl0ZW0iLCJ0eXBlIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiaWQiLCJyZWxhdGlvbk5hbWUiLCJwYXJlbnRLZXkiLCJhdHRyaWJ1dGVOYW1lIiwicmVsYXRpb25GaWVsZCIsIm5hbWUiLCJ0aXRsZSIsImxpbmsiLCJvbkNsaWNrIiwiaGVscGVyU3J2IiwicGFyc2VMb2NhdGlvblNlYXJjaCIsInNldExvY2F0aW9uU2VhcmNoIiwic3RyVG9PYmplY3QiLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJrIiwic2VhcmNoUGFyYW1zIiwicG9zIiwiaW5kZXhPZiIsImNoYWluIiwic2xpY2UiLCJjb21wYWN0Iiwib2JqZWN0Iiwic2VhcmNoUGF0aCIsIk9iamVjdCIsImtleXMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJqb2luIiwiZ3JpZFBhZ2luYXRpb24iLCJIZWxwZXIiLCJQYWdpbmF0aW9uIiwicGFnZVBhcmFtIiwiY3VycmVudFBhZ2UiLCJwZXJQYWdlIiwidG90YWxDb3VudCIsImdldFBhZ2VQYXJhbSIsInNldFRvdGFsQ291bnQiLCJnZXRUb3RhbENvdW50Iiwic2V0UGVyUGFnZSIsImdldFBlclBhZ2UiLCJnZXRQYWdlQ291bnQiLCJzZXRDdXJyZW50UGFnZSIsImdldEN1cnJlbnRQYWdlIiwiZ2V0T2Zmc2V0IiwiZ2V0UGFnZVVybCIsInRvdGFsUGFnZXMiLCJNYXRoIiwiY2VpbCIsIm1heCIsInNvcnRpbmdTcnYiLCJTb3J0aW5nIiwic29ydFBhcmFtIiwiRElSRUNUSU9OX0FTQyIsIkRJUkVDVElPTl9ERVNDIiwiZmllbGQiLCJkaXJlY3Rpb24iLCJzb3J0RmllbGRzIiwiZ2V0Q29sdW1uIiwiZ2V0RGlyZWN0aW9uQ29sdW1uIiwic2V0U29ydEZpZWxkcyIsInNldFNvcnRpbmciLCJnZXRVcmwiLCJjdXJyZW50RGlyZWN0aW9uIiwiZ3JpZFRhYmxlIiwiVGFibGUiLCJwYWdpbmF0aW9uIiwic29ydGluZyIsInJvd3MiLCJjb2x1bW5zIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Q29sdW1uc0J5U2NoZW1hIiwicm93c1RvVGFibGVGb3JtYXQiLCJnZXRTb3J0aW5nUGFyYW1CeUZpZWxkIiwiZ2V0U29ydGluZ1BhcmFtVmFsdWUiLCJfZ2V0Um93c0J5RGF0YSIsInJlbCIsInJvdyIsInJvd1Jlc3VsdCIsImZvck93biIsInJlcyIsInRtcFJvdyIsInByb3ZpZGVyIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW50ZXJ2YWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiRW50aXR5IiwiSnNvbmFyeSIsImV4dGVuZERhdGEiLCJleHRlbmRTY2hlbWEiLCJleHRlbmRTY2hlbWFMaXN0IiwiZWFjaCIsInNldE1lc3NhZ2UiLCJnZXRNZXNzYWdlIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VHlwZVByb3BlcnR5IiwiX2dldEVtcHR5RGF0YSIsIl9nZXRFbXB0eURhdGFSZWxhdGlvbnMiLCJfcmVwbGFjZUZyb21GdWxsIiwiX2dldFJlbGF0aW9uTGluayIsIk1vZGVsIiwicGFyYW0iLCJtZXNzYWdlIiwiZ2V0RGF0YSIsImpEYXRhIiwicmVxdWVzdCIsImRvY3VtZW50IiwicmF3IiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsInRtcE9iaiIsImNyZWF0ZVZhbHVlIiwiZnVsbFNjaGVtYSIsInBhdGNoU2NoZW1hIiwiZGF0YVNjaGVtYSIsImNyZWF0ZVNjaGVtYSIsImF0dHJpYnV0ZXNTY2hlbWEiLCJyZWxhdGlvbnNTY2hlbWEiLCJyZWxhdGlvblNjaGVtYSIsImF0dHJpYnV0ZVNjaGVtYSIsImJhc2ljVHlwZXMiLCJ0b1N0cmluZyIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsInNjaGVtYUZ1bGwiLCJoYXlzdGFjayIsImhhc093blByb3BlcnR5IiwiJHJlZiIsInN1YnN0cmluZyIsInJlbGF0aW9ucyIsInJlbEl0ZW0iLCJyZWxLZXkiLCJsaW5rQXJyYXkiLCJkYXRhT2JqIiwiZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyIsInJvd3NSZWxhdGlvbnNoaXBzIiwia1JvdyIsImtSZWwiLCJrUmVsSXRlbSIsImdyaWRBY3Rpb25DcmVhdGUiLCIkaHR0cCIsInNjb3BlIiwibWV0aG9kIiwiJGJyb2FkY2FzdCIsInNjb3BlRm9ybSIsIiR2YWxpZCIsInRoZW4iLCJhY3Rpb25DcmVhdGVTdWNjZXNzIiwiYWN0aW9uQ3JlYXRlRXJyb3IiLCJhbGVydHMiLCJtc2ciLCJzdGF0dXNUZXh0IiwiZ3JpZEFjdGlvbkRlbGV0ZSIsImFjdGlvbkRlbGV0ZVN1Y2Nlc3MiLCJhY3Rpb25EZWxldGVFcnJvciIsInRhYmxlIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiZm9ybUluc3QiLCJncmlkTW9kZWwiLCIkZGlnZXN0IiwiZWRpdCIsIiRldmVudCIsImdvIiwiY2xvc2VBbGVydCIsInNwbGljZSIsImdyaWRUYWJsZURpcmVjdGl2ZSIsImdyaWRUYWJsZURpcmVjdGl2ZUN0cmwiLCJ0YWJsZUluc3QiLCJ0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUiLCJyZXF1aXJlIiwidGVtcGxhdGVVcmwiLCJ0YWJsZVBhZ2luYXRpb25DdHJsIiwiJG9uIiwic2VhcmNoIiwicGFnZSIsInNob3ciLCJzZXRQYWdpbmF0aW9uIiwidG90YWxJdGVtcyIsIml0ZW1zUGVyUGFnZSIsInBhZ2VDaGFuZ2VkIiwicGFnZU5vIiwiZ3JpZFRoZWFkRGlyZWN0aXZlIiwiZ3JpZFRoZWFkQ3RybCIsImVsZW1lbnQiLCJhdHRyIiwiY29uc29sZSIsImxvZyIsInNldFNvcnRpbmdCeVNlYXJjaCIsIndoZXJlIiwic29ydEJ5IiwiY29sdW1uIiwibGFzdEluZGV4T2YiLCJ2bXNHcmlkRGlyZWN0aXZlIiwidGVtcGxhdGUiLCJ2bXNHcmlkRGlyZWN0aXZlQ3RybCIsImVsIiwiY3RybCIsImdldFRlbXBsYXRlVXJsIiwicnVuIiwiJHRlbXBsYXRlQ2FjaGUiLCJwdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FBRUFDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsWUFDQSxPQUFBQyxNQUFBLENBREE7QUFBQSxTQUFBLEU7UUNuQkFOLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFVBQUEsRUFBQUUsUUFBQSxFO1FBQ0FBLFFBQUEsQ0FBQUMsT0FBQSxHQUFBO0FBQUEsWUFBQSxhQUFBO0FBQUEsWUFBQSxVQUFBO0FBQUEsWUFBQSxHQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQUQsUUFBQSxDQUFBRSxVQUFBLEVBQUFDLFFBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsWUFFQSxTQUFBQyxJQUFBLENBQUFDLEtBQUEsRUFBQTtBQUFBLGdCQUNBLEtBQUFDLFFBQUEsQ0FBQUQsS0FBQSxFQURBO0FBQUEsZ0JBR0EsS0FBQUUsSUFBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLGdCQUlBLEtBQUFGLEtBQUEsR0FBQSxFQUFBLENBSkE7QUFBQSxnQkFLQSxLQUFBRyxNQUFBLEdBQUEsRUFBQSxDQUxBO0FBQUEsZ0JBTUEsS0FBQUMsS0FBQSxHQUFBLEVBQUEsQ0FOQTtBQUFBLGFBRkE7QUFBQSxZQVdBTCxJQUFBLENBQUFNLFNBQUEsR0FBQSxJQUFBVCxVQUFBLEVBQUEsQ0FYQTtBQUFBLFlBYUFULE9BQUEsQ0FBQW1CLE1BQUEsQ0FBQVAsSUFBQSxDQUFBTSxTQUFBLEVBQUE7QUFBQSxnQkFDQUUsV0FBQSxFQUFBQSxXQURBO0FBQUEsZ0JBRUFDLFNBQUEsRUFBQUEsU0FGQTtBQUFBLGdCQUdBQyxjQUFBLEVBQUFBLGNBSEE7QUFBQSxnQkFJQUMseUJBQUEsRUFBQUEseUJBSkE7QUFBQSxnQkFLQUMsZUFBQSxFQUFBQSxlQUxBO0FBQUEsZ0JBTUFDLGNBQUEsRUFBQUEsY0FOQTtBQUFBLGdCQU9BQyxjQUFBLEVBQUFBLGNBUEE7QUFBQSxnQkFRQUMsbUJBQUEsRUFBQUEsbUJBUkE7QUFBQSxnQkFTQUMsc0JBQUEsRUFBQUEsc0JBVEE7QUFBQSxhQUFBLEVBYkE7QUFBQSxZQXlCQSxPQUFBaEIsSUFBQSxDQXpCQTtBQUFBLFlBMkJBLFNBQUFTLFNBQUEsR0FBQTtBQUFBLGdCQUNBLElBQUFRLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxnQkFFQSxPQUFBO0FBQUEsb0JBQ0FkLElBQUEsRUFBQWMsSUFBQSxDQUFBZCxJQURBO0FBQUEsb0JBRUFGLEtBQUEsRUFBQWdCLElBQUEsQ0FBQWhCLEtBRkE7QUFBQSxvQkFHQUcsTUFBQSxFQUFBYSxJQUFBLENBQUFiLE1BSEE7QUFBQSxvQkFJQUMsS0FBQSxFQUFBWSxJQUFBLENBQUFaLEtBSkE7QUFBQSxpQkFBQSxDQUZBO0FBQUEsYUEzQkE7QUFBQSxZQXlDQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBRyxXQUFBLENBQUFVLFFBQUEsRUFBQTtBQUFBLGdCQUVBO0FBQUEsb0JBQUFELElBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBaEIsS0FBQSxHQUFBZ0IsSUFBQSxDQUFBRSxRQUFBLEVBQUEsQ0FIQTtBQUFBLGdCQUlBLElBQUFDLEdBQUEsQ0FKQTtBQUFBLGdCQU1BQSxHQUFBLEdBQUFILElBQUEsQ0FBQUksY0FBQSxDQUFBcEIsS0FBQSxDQUFBbUIsR0FBQSxFQUFBbkIsS0FBQSxDQUFBcUIsTUFBQSxDQUFBLENBTkE7QUFBQSxnQkFRQXhCLFFBQUEsQ0FBQSxZQUFBO0FBQUEsb0JBQ0FtQixJQUFBLENBQUFNLFNBQUEsQ0FBQUgsR0FBQSxFQUFBSSxnQkFBQSxFQURBO0FBQUEsaUJBQUEsRUFSQTtBQUFBLGdCQVlBLFNBQUFBLGdCQUFBLENBQUFDLElBQUEsRUFBQXJCLE1BQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFzQixPQUFBLEdBQUFELElBQUEsQ0FBQUUsUUFBQSxDQUFBLE1BQUEsRUFBQUEsUUFBQSxDQUFBLFlBQUEsQ0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQUMsZ0JBQUEsR0FBQVgsSUFBQSxDQUFBWSxjQUFBLENBQUFILE9BQUEsQ0FBQUksT0FBQSxHQUFBLENBQUEsRUFBQUwsSUFBQSxDQUFBTSxLQUFBLEVBQUEsRUFBQTNCLE1BQUEsQ0FBQSxDQUZBO0FBQUEsb0JBSUFhLElBQUEsQ0FBQUgsY0FBQSxDQUFBVyxJQUFBLEVBQUEsVUFBQU8sTUFBQSxFQUFBO0FBQUEsd0JBRUFmLElBQUEsQ0FBQVosS0FBQSxHQUFBb0IsSUFBQSxDQUFBcEIsS0FBQSxFQUFBLENBRkE7QUFBQSx3QkFHQVksSUFBQSxDQUFBYixNQUFBLEdBQUF3QixnQkFBQSxDQUhBO0FBQUEsd0JBSUFYLElBQUEsQ0FBQWhCLEtBQUEsR0FBQWdCLElBQUEsQ0FBQUYsbUJBQUEsQ0FBQWlCLE1BQUEsQ0FBQSxDQUpBO0FBQUEsd0JBTUFmLElBQUEsQ0FBQUosY0FBQSxDQUFBWSxJQUFBLEVBQUFRLGtCQUFBLEVBTkE7QUFBQSx3QkFRQSxTQUFBQSxrQkFBQSxDQUFBQyxNQUFBLEVBQUE7QUFBQSw0QkFDQWpCLElBQUEsQ0FBQWQsSUFBQSxHQUFBK0IsTUFBQSxDQURBO0FBQUEsNEJBSUE7QUFBQSw0QkFBQWpCLElBQUEsQ0FBQWQsSUFBQSxHQUFBSixDQUFBLENBQUFvQyxLQUFBLENBQUFsQixJQUFBLENBQUFkLElBQUEsRUFBQWMsSUFBQSxDQUFBRCxzQkFBQSxDQUFBUyxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLEVBQUF0QixLQUFBLEVBQUEsQ0FBQSxDQUFBLENBSkE7QUFBQSw0QkFNQSxJQUFBYSxRQUFBLEtBQUFrQixTQUFBLEVBQUE7QUFBQSxnQ0FDQWxCLFFBQUEsQ0FBQUQsSUFBQSxDQUFBUixTQUFBLEVBQUEsRUFEQTtBQUFBLDZCQU5BO0FBQUEseUJBUkE7QUFBQSxxQkFBQSxFQUpBO0FBQUEsaUJBWkE7QUFBQSxhQXpDQTtBQUFBLFlBd0ZBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBTSxtQkFBQSxDQUFBc0IsUUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQVosSUFBQSxHQUFBWSxRQUFBLENBQUFDLEdBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUFOLE1BQUEsR0FBQVAsSUFBQSxDQUFBRSxRQUFBLENBQUEsWUFBQSxFQUFBSSxLQUFBLEVBQUEsQ0FGQTtBQUFBLGdCQUlBaEMsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBRixRQUFBLENBQUFHLGFBQUEsRUFBQSxVQUFBQyxRQUFBLEVBQUFDLEdBQUEsRUFBQTtBQUFBLG9CQUNBVixNQUFBLENBQUFVLEdBQUEsSUFBQTNDLENBQUEsQ0FBQTRDLEdBQUEsQ0FBQUYsUUFBQSxFQUFBLFVBQUFHLFlBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLFlBQUEsQ0FBQWpCLFFBQUEsQ0FBQSxNQUFBLEVBQUFrQixhQUFBLENBQUEsSUFBQSxDQUFBLENBREE7QUFBQSxxQkFBQSxDQUFBLENBREE7QUFBQSxvQkFLQTtBQUFBLHdCQUFBLENBQUFDLEtBQUEsQ0FBQUMsT0FBQSxDQUFBdEIsSUFBQSxDQUFBRSxRQUFBLENBQUEsZUFBQSxFQUFBQSxRQUFBLENBQUFlLEdBQUEsRUFBQUcsYUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQUE7QUFBQSx3QkFDQWIsTUFBQSxDQUFBVSxHQUFBLElBQUFWLE1BQUEsQ0FBQVUsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEscUJBTEE7QUFBQSxpQkFBQSxFQUpBO0FBQUEsZ0JBY0EsT0FBQVYsTUFBQSxDQWRBO0FBQUEsYUF4RkE7QUFBQSxZQStHQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBQW5CLGNBQUEsQ0FBQVksSUFBQSxFQUFBUCxRQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBRCxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsZ0JBR0EsSUFBQStCLE1BQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxnQkFLQS9CLElBQUEsQ0FBQUwsZUFBQSxDQUFBYSxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQSxVQUFBc0IsU0FBQSxFQUFBO0FBQUEsb0JBTUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx3QkFBQUMsVUFBQSxHQUFBekIsSUFBQSxDQUFBSyxPQUFBLEdBQUFxQixlQUFBLENBQUEsTUFBQSxFQUFBQyxPQUFBLEdBQUFELGVBQUEsQ0FBQSxZQUFBLEVBQUFFLGlCQUFBLEVBQUEsQ0FOQTtBQUFBLG9CQVFBdEQsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBVyxVQUFBLEVBQUEsVUFBQVIsR0FBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQVksR0FBQSxHQUFBLEVBQUFaLEdBQUEsRUFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx3QkFHQSxJQUFBTyxTQUFBLENBQUFQLEdBQUEsQ0FBQSxFQUFBO0FBQUEsNEJBQ0FZLEdBQUEsQ0FBQUMsUUFBQSxHQUFBTixTQUFBLENBQUFQLEdBQUEsQ0FBQSxDQURBO0FBQUEseUJBSEE7QUFBQSx3QkFNQU0sTUFBQSxDQUFBMUQsSUFBQSxDQUFBZ0UsR0FBQSxFQU5BO0FBQUEscUJBQUEsRUFSQTtBQUFBLG9CQWlCQXhELFFBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0FvQixRQUFBLENBQUE4QixNQUFBLEVBREE7QUFBQSxxQkFBQSxFQWpCQTtBQUFBLGlCQUFBLEVBTEE7QUFBQSxhQS9HQTtBQUFBLFlBNElBLFNBQUFsQyxjQUFBLENBQUFXLElBQUEsRUFBQVAsUUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUQsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUFlLE1BQUEsQ0FGQTtBQUFBLGdCQUdBLElBQUF3QixRQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsZ0JBS0F4QixNQUFBLEdBQUFQLElBQUEsQ0FBQUUsUUFBQSxDQUFBLE1BQUEsQ0FBQSxDQUxBO0FBQUEsZ0JBTUE2QixRQUFBLENBQUFsRSxJQUFBLENBQUEyQixJQUFBLENBQUF3QyxvQkFBQSxDQUFBaEMsSUFBQSxDQUFBRSxRQUFBLENBQUEsTUFBQSxDQUFBLENBQUEsRUFOQTtBQUFBLGdCQVFBVixJQUFBLENBQUF5QyxjQUFBLENBQUFGLFFBQUEsRUFBQUcsV0FBQSxFQVJBO0FBQUEsZ0JBVUEsU0FBQUEsV0FBQSxDQUFBQyxpQkFBQSxFQUFBO0FBQUEsb0JBRUEsSUFBQVosTUFBQSxHQUFBO0FBQUEsd0JBQ0FWLEdBQUEsRUFBQU4sTUFEQTtBQUFBLHdCQUVBUSxhQUFBLEVBQUF6QyxDQUFBLENBQUE4RCxTQUFBLENBQUFELGlCQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsVUFBQUUsQ0FBQSxFQUFBO0FBQUEsNEJBQ0EvRCxDQUFBLENBQUF3QyxPQUFBLENBQUF1QixDQUFBLEVBQUEsVUFBQUMsSUFBQSxFQUFBQyxLQUFBLEVBQUE7QUFBQSxnQ0FDQUYsQ0FBQSxDQUFBRSxLQUFBLElBQUFELElBQUEsQ0FBQXRDLElBQUEsQ0FEQTtBQUFBLDZCQUFBLEVBREE7QUFBQSw0QkFJQSxPQUFBcUMsQ0FBQSxDQUpBO0FBQUEseUJBQUEsQ0FGQTtBQUFBLHFCQUFBLENBRkE7QUFBQSxvQkFZQTVDLFFBQUEsQ0FBQThCLE1BQUEsRUFaQTtBQUFBLGlCQVZBO0FBQUEsYUE1SUE7QUFBQSxZQThLQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQUF0QyxjQUFBLENBQUFlLElBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUF3QyxVQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBR0F4QyxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLEVBQUF1QyxLQUFBLENBQUEsVUFBQUYsS0FBQSxFQUFBakMsS0FBQSxFQUFBO0FBQUEsb0JBQ0FrQyxVQUFBLENBQUEzRSxJQUFBLENBQUF5QyxLQUFBLENBQUFjLGFBQUEsQ0FBQSxJQUFBLENBQUEsRUFEQTtBQUFBLGlCQUFBLEVBSEE7QUFBQSxnQkFPQSxPQUFBb0IsVUFBQSxDQVBBO0FBQUEsYUE5S0E7QUFBQSxZQXdMQSxTQUFBdEQseUJBQUEsQ0FBQWMsSUFBQSxFQUFBUCxRQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBRCxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQWtELGVBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBQyxTQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsZ0JBS0EzQyxJQUFBLENBQUFFLFFBQUEsQ0FBQSxlQUFBLEVBQUEwQyxVQUFBLENBQUEsVUFBQUMsWUFBQSxFQUFBQyxZQUFBLEVBQUE7QUFBQSxvQkFFQSxJQUFBLENBQUF4RSxDQUFBLENBQUF5RSxPQUFBLENBQUFELFlBQUEsQ0FBQWxFLEtBQUEsQ0FBQSxVQUFBLENBQUEsQ0FBQSxFQUFBO0FBQUEsd0JBQ0ErRCxTQUFBLENBQUE5RSxJQUFBLENBQUE7QUFBQSw0QkFDQThCLEdBQUEsRUFBQW1ELFlBQUEsQ0FBQWxFLEtBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBb0UsSUFEQTtBQUFBLDRCQUVBaEQsSUFBQSxFQUFBOEMsWUFGQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFGQTtBQUFBLGlCQUFBLEVBTEE7QUFBQSxnQkFnQkF0RCxJQUFBLENBQUF5RCxlQUFBLENBQUEzRSxDQUFBLENBQUE0QyxHQUFBLENBQUF5QixTQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsVUFBQU8sYUFBQSxFQUFBO0FBQUEsb0JBRUE1RSxDQUFBLENBQUF3QyxPQUFBLENBQUE2QixTQUFBLEVBQUEsVUFBQVEsS0FBQSxFQUFBO0FBQUEsd0JBRUEsSUFBQUwsWUFBQSxHQUFBSyxLQUFBLENBQUFuRCxJQUFBLENBRkE7QUFBQSx3QkFHQSxJQUFBb0QsU0FBQSxHQUFBRixhQUFBLENBQUFDLEtBQUEsQ0FBQXhELEdBQUEsRUFBQUssSUFBQSxDQUhBO0FBQUEsd0JBS0EsSUFBQXFELFVBQUEsR0FBQTdELElBQUEsQ0FBQVAsY0FBQSxDQUFBbUUsU0FBQSxDQUFBLENBTEE7QUFBQSx3QkFPQTlFLENBQUEsQ0FBQXdDLE9BQUEsQ0FBQXVDLFVBQUEsRUFBQSxVQUFBQyxRQUFBLEVBQUE7QUFBQSw0QkFDQSxJQUFBM0QsR0FBQSxHQUFBSCxJQUFBLENBQUFJLGNBQUEsQ0FBQWtELFlBQUEsQ0FBQWxFLEtBQUEsQ0FBQSxVQUFBLEVBQUEsQ0FBQSxFQUFBb0UsSUFBQSxFQUFBO0FBQUEsZ0NBQUFPLElBQUEsRUFBQS9ELElBQUEsQ0FBQWdFLE9BQUEsQ0FBQUMsaUJBQUE7QUFBQSxnQ0FBQUMsRUFBQSxFQUFBSixRQUFBO0FBQUEsNkJBQUEsQ0FBQSxDQURBO0FBQUEsNEJBR0FaLGVBQUEsQ0FBQTdFLElBQUEsQ0FBQTtBQUFBLGdDQUNBOEIsR0FBQSxFQUFBQSxHQURBO0FBQUEsZ0NBRUEyRCxRQUFBLEVBQUFBLFFBRkE7QUFBQSxnQ0FHQUssWUFBQSxFQUFBYixZQUFBLENBQUFjLFNBQUEsRUFIQTtBQUFBLGdDQUlBQyxhQUFBLEVBQUFmLFlBQUEsQ0FBQXpDLE9BQUEsR0FBQXlELGFBQUEsRUFKQTtBQUFBLDZCQUFBLEVBSEE7QUFBQSx5QkFBQSxFQVBBO0FBQUEscUJBQUEsRUFGQTtBQUFBLG9CQXFCQXJFLFFBQUEsQ0FBQWlELGVBQUEsRUFyQkE7QUFBQSxpQkFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLDZCQWhCQTtBQUFBLGFBeExBO0FBQUEsWUFzUUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQUF2RCxlQUFBLENBQUFhLElBQUEsRUFBQVAsUUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUQsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLGdCQUdBQSxJQUFBLENBQUFOLHlCQUFBLENBQUFjLElBQUEsRUFBQSxVQUFBMEMsZUFBQSxFQUFBO0FBQUEsb0JBRUFsRCxJQUFBLENBQUF5RCxlQUFBLENBQUEzRSxDQUFBLENBQUE0QyxHQUFBLENBQUF3QixlQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsVUFBQUMsU0FBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQW5CLFNBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx3QkFHQWxELENBQUEsQ0FBQXdDLE9BQUEsQ0FBQTRCLGVBQUEsRUFBQSxVQUFBSixJQUFBLEVBQUE7QUFBQSw0QkFFQSxJQUFBLENBQUFkLFNBQUEsQ0FBQWMsSUFBQSxDQUFBcUIsWUFBQSxDQUFBLEVBQUE7QUFBQSxnQ0FDQW5DLFNBQUEsQ0FBQWMsSUFBQSxDQUFBcUIsWUFBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLDZCQUZBO0FBQUEsNEJBTUFuQyxTQUFBLENBQUFjLElBQUEsQ0FBQXFCLFlBQUEsRUFBQTlGLElBQUEsQ0FBQTtBQUFBLGdDQUNBeUMsS0FBQSxFQUFBZ0MsSUFBQSxDQUFBZ0IsUUFEQTtBQUFBLGdDQUdBO0FBQUEsZ0NBQUFTLElBQUEsRUFBQXBCLFNBQUEsQ0FBQUwsSUFBQSxDQUFBM0MsR0FBQSxFQUFBSyxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLEVBQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQ0FrQixhQURBLENBQ0FrQixJQUFBLENBQUF1QixhQURBLEtBQ0F2QixJQUFBLENBQUFnQixRQUpBO0FBQUEsNkJBQUEsRUFOQTtBQUFBLHlCQUFBLEVBSEE7QUFBQSx3QkFpQkE3RCxRQUFBLENBQUErQixTQUFBLEVBakJBO0FBQUEscUJBQUEsRUFGQTtBQUFBLGlCQUFBLEVBSEE7QUFBQSxhQXRRQTtBQUFBLFlBd1NBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBakMsc0JBQUEsQ0FBQVgsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQTJDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxnQkFFQWpELENBQUEsQ0FBQXdDLE9BQUEsQ0FBQWxDLEtBQUEsRUFBQSxVQUFBMEIsS0FBQSxFQUFBO0FBQUEsb0JBQ0FpQixNQUFBLENBQUExRCxJQUFBLENBQUE7QUFBQSx3QkFDQTBGLElBQUEsRUFBQSxRQURBO0FBQUEsd0JBRUFTLEtBQUEsRUFBQTFELEtBQUEsQ0FBQTBELEtBRkE7QUFBQSx3QkFHQUMsSUFBQSxFQUFBM0QsS0FIQTtBQUFBLHdCQUlBNEQsT0FBQSxFQUFBLG9CQUpBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQUFBLEVBRkE7QUFBQSxnQkFVQSxPQUFBM0MsTUFBQSxDQVZBO0FBQUEsYUF4U0E7QUFBQSxTO1FDRkE1RCxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxRQUFBLEVBQUFtRyxTQUFBLEU7UUFDQUEsU0FBQSxDQUFBaEcsT0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLEM7UUFDQSxTQUFBZ0csU0FBQSxHQUFBO0FBQUEsWUFFQSxJQUFBbkcsT0FBQSxHQUFBO0FBQUEsZ0JBQ0FvRyxtQkFBQSxFQUFBQSxtQkFEQTtBQUFBLGdCQUVBQyxpQkFBQSxFQUFBQSxpQkFGQTtBQUFBLGdCQUdBQyxXQUFBLEVBQUFBLFdBSEE7QUFBQSxhQUFBLENBRkE7QUFBQSxZQVFBLE9BQUF0RyxPQUFBLENBUkE7QUFBQSxZQVVBLFNBQUFzRyxXQUFBLENBQUF6QyxHQUFBLEVBQUEwQyxJQUFBLEVBQUE7QUFBQSxnQkFDQUEsSUFBQSxHQUFBQSxJQUFBLENBQUFDLE9BQUEsQ0FBQSxXQUFBLEVBQUEsS0FBQSxDQUFBLENBREE7QUFBQSxnQkFFQTtBQUFBLGdCQUFBRCxJQUFBLEdBQUFBLElBQUEsQ0FBQUMsT0FBQSxDQUFBLFVBQUEsRUFBQSxLQUFBLENBQUEsQ0FGQTtBQUFBLGdCQUdBO0FBQUEsZ0JBQUFELElBQUEsR0FBQUEsSUFBQSxDQUFBQyxPQUFBLENBQUEsS0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUhBO0FBQUEsZ0JBSUE7QUFBQSxvQkFBQUMsQ0FBQSxHQUFBRixJQUFBLENBQUFHLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FKQTtBQUFBLGdCQUtBLEtBQUEsSUFBQUMsQ0FBQSxHQUFBLENBQUEsRUFBQXRDLENBQUEsR0FBQW9DLENBQUEsQ0FBQUcsTUFBQSxDQUFBLENBQUFELENBQUEsR0FBQXRDLENBQUEsRUFBQSxFQUFBc0MsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQUUsQ0FBQSxHQUFBSixDQUFBLENBQUFFLENBQUEsQ0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQUUsQ0FBQSxJQUFBaEQsR0FBQSxFQUFBO0FBQUEsd0JBQ0FBLEdBQUEsR0FBQUEsR0FBQSxDQUFBZ0QsQ0FBQSxDQUFBLENBREE7QUFBQSxxQkFBQSxNQUVBO0FBQUEsd0JBQ0EsT0FEQTtBQUFBLHFCQUpBO0FBQUEsaUJBTEE7QUFBQSxnQkFhQSxPQUFBaEQsR0FBQSxDQWJBO0FBQUEsYUFWQTtBQUFBLFlBK0JBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBQXVDLG1CQUFBLENBQUF6RSxHQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBbUYsWUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQUMsR0FBQSxHQUFBcEYsR0FBQSxDQUFBcUYsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUZBO0FBQUEsZ0JBSUEsSUFBQUQsR0FBQSxJQUFBLENBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsb0JBQUFELFlBQUEsR0FBQXhHLENBQUEsQ0FBQTJHLEtBQUEsQ0FBQXRGLEdBQUEsQ0FBQXVGLEtBQUEsQ0FBQXZGLEdBQUEsQ0FBQXFGLE9BQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQSxFQUFBTixLQUFBLENBQUEsR0FBQSxDQUFBO0FBQUEsQ0FFQXhELEdBRkEsQ0FFQSxVQUFBb0IsSUFBQSxFQUFBO0FBQUEsd0JBQUEsSUFBQUEsSUFBQTtBQUFBLDRCQUFBLE9BQUFBLElBQUEsQ0FBQW9DLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQTtBQUFBLHFCQUZBO0FBQUEsQ0FJQVMsT0FKQTtBQUFBLENBTUFDLE1BTkE7QUFBQSxDQVFBOUUsS0FSQSxFQUFBLENBRkE7QUFBQSxpQkFKQTtBQUFBLGdCQWlCQSxPQUFBd0UsWUFBQSxJQUFBLEVBQUEsQ0FqQkE7QUFBQSxhQS9CQTtBQUFBLFlBbURBLFNBQUFULGlCQUFBLENBQUExRSxHQUFBLEVBQUFtRixZQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBTyxVQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBTixHQUFBLEdBQUFwRixHQUFBLENBQUFxRixPQUFBLENBQUEsR0FBQSxDQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBekQsTUFBQSxHQUFBNUIsR0FBQSxDQUhBO0FBQUEsZ0JBS0EsSUFBQW9GLEdBQUEsSUFBQSxDQUFBLEVBQUE7QUFBQSxvQkFDQXhELE1BQUEsR0FBQTVCLEdBQUEsQ0FBQXVGLEtBQUEsQ0FBQSxDQUFBLEVBQUFILEdBQUEsQ0FBQSxDQURBO0FBQUEsaUJBTEE7QUFBQSxnQkFTQU0sVUFBQSxHQUFBQyxNQUFBLENBQUFDLElBQUEsQ0FBQVQsWUFBQSxFQUFBNUQsR0FBQSxDQUFBLFVBQUEyRCxDQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBVyxrQkFBQSxDQUFBVixZQUFBLENBQUFELENBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxpQkFBQSxFQUVBWSxJQUZBLENBRUEsR0FGQSxDQUFBLENBVEE7QUFBQSxnQkFhQUosVUFBQSxHQUFBQSxVQUFBLEdBQUEsTUFBQUEsVUFBQSxHQUFBLEVBQUEsQ0FiQTtBQUFBLGdCQWVBLE9BQUE5RCxNQUFBLEdBQUE4RCxVQUFBLENBZkE7QUFBQSxhQW5EQTtBQUFBLFM7UUNGQTFILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLGdCQUFBLEVBQUEwSCxjQUFBLEU7UUFDQUEsY0FBQSxDQUFBdkgsT0FBQSxHQUFBO0FBQUEsWUFBQSxRQUFBO0FBQUEsWUFBQSxHQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQXVILGNBQUEsQ0FBQUMsTUFBQSxFQUFBckgsQ0FBQSxFQUFBO0FBQUEsWUFFQSxTQUFBc0gsVUFBQSxHQUFBO0FBQUEsZ0JBRUE7QUFBQSxxQkFBQUMsU0FBQSxHQUFBLE1BQUEsQ0FGQTtBQUFBLGdCQUlBO0FBQUEscUJBQUFDLFdBQUEsR0FBQSxDQUFBLENBSkE7QUFBQSxnQkFRQTtBQUFBO0FBQUE7QUFBQSxxQkFBQUMsT0FBQSxHQUFBLENBQUEsQ0FSQTtBQUFBLGdCQVVBO0FBQUEscUJBQUFDLFVBQUEsR0FBQSxDQUFBLENBVkE7QUFBQSxhQUZBO0FBQUEsWUFlQXJJLE9BQUEsQ0FBQW1CLE1BQUEsQ0FBQThHLFVBQUEsQ0FBQS9HLFNBQUEsRUFBQTtBQUFBLGdCQUNBb0gsWUFBQSxFQUFBQSxZQURBO0FBQUEsZ0JBRUFDLGFBQUEsRUFBQUEsYUFGQTtBQUFBLGdCQUdBQyxhQUFBLEVBQUFBLGFBSEE7QUFBQSxnQkFJQUMsVUFBQSxFQUFBQSxVQUpBO0FBQUEsZ0JBS0FDLFVBQUEsRUFBQUEsVUFMQTtBQUFBLGdCQU1BQyxZQUFBLEVBQUFBLFlBTkE7QUFBQSxnQkFPQUMsY0FBQSxFQUFBQSxjQVBBO0FBQUEsZ0JBUUFDLGNBQUEsRUFBQUEsY0FSQTtBQUFBLGdCQVNBQyxTQUFBLEVBQUFBLFNBVEE7QUFBQSxnQkFVQUMsVUFBQSxFQUFBQSxVQVZBO0FBQUEsYUFBQSxFQWZBO0FBQUEsWUE0QkEsT0FBQWQsVUFBQSxDQTVCQTtBQUFBLFlBOEJBLFNBQUFLLFlBQUEsR0FBQTtBQUFBLGdCQUNBLE9BQUEsS0FBQUosU0FBQSxDQURBO0FBQUEsYUE5QkE7QUFBQSxZQWtDQSxTQUFBSyxhQUFBLENBQUFGLFVBQUEsRUFBQTtBQUFBLGdCQUNBLEtBQUFBLFVBQUEsR0FBQUEsVUFBQSxDQURBO0FBQUEsYUFsQ0E7QUFBQSxZQXNDQSxTQUFBRyxhQUFBLEdBQUE7QUFBQSxnQkFDQSxPQUFBLEtBQUFILFVBQUEsQ0FEQTtBQUFBLGFBdENBO0FBQUEsWUEwQ0EsU0FBQUksVUFBQSxDQUFBTCxPQUFBLEVBQUE7QUFBQSxnQkFDQSxLQUFBQSxPQUFBLEdBQUFBLE9BQUEsQ0FEQTtBQUFBLGFBMUNBO0FBQUEsWUE4Q0EsU0FBQU0sVUFBQSxHQUFBO0FBQUEsZ0JBQ0EsT0FBQSxLQUFBTixPQUFBLENBREE7QUFBQSxhQTlDQTtBQUFBLFlBa0RBLFNBQUFPLFlBQUEsR0FBQTtBQUFBLGdCQUNBLElBQUFLLFVBQUEsR0FBQSxLQUFBWixPQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUEsR0FBQWEsSUFBQSxDQUFBQyxJQUFBLENBQUEsS0FBQWIsVUFBQSxHQUFBLEtBQUFELE9BQUEsQ0FBQSxDQURBO0FBQUEsZ0JBRUEsT0FBQWEsSUFBQSxDQUFBRSxHQUFBLENBQUFILFVBQUEsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQUFBLENBRkE7QUFBQSxhQWxEQTtBQUFBLFlBdURBLFNBQUFKLGNBQUEsQ0FBQVQsV0FBQSxFQUFBO0FBQUEsZ0JBQ0EsS0FBQUEsV0FBQSxHQUFBQSxXQUFBLENBREE7QUFBQSxhQXZEQTtBQUFBLFlBMkRBLFNBQUFVLGNBQUEsR0FBQTtBQUFBLGdCQUNBLE9BQUEsS0FBQVYsV0FBQSxDQURBO0FBQUEsYUEzREE7QUFBQSxZQStEQSxTQUFBVyxTQUFBLEdBQUE7QUFBQSxnQkFDQSxJQUFBbEYsTUFBQSxDQURBO0FBQUEsZ0JBR0FBLE1BQUEsR0FBQXFGLElBQUEsQ0FBQUUsR0FBQSxDQUFBLEtBQUFoQixXQUFBLElBQUEsQ0FBQSxFQUFBLENBQUEsSUFBQSxLQUFBQyxPQUFBLEdBQUEsS0FBQUEsT0FBQSxDQUhBO0FBQUEsZ0JBS0EsT0FBQXhFLE1BQUEsQ0FMQTtBQUFBLGFBL0RBO0FBQUEsWUF1RUEsU0FBQW1GLFVBQUEsQ0FBQS9HLEdBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUE0QixNQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBdUQsWUFBQSxDQUZBO0FBQUEsZ0JBSUFBLFlBQUEsR0FBQWEsTUFBQSxDQUFBdkIsbUJBQUEsQ0FBQXpFLEdBQUEsQ0FBQSxDQUpBO0FBQUEsZ0JBTUFtRixZQUFBLENBQUEsS0FBQWUsU0FBQSxHQUFBLFVBQUEsSUFBQSxLQUFBWSxTQUFBLEVBQUEsQ0FOQTtBQUFBLGdCQU9BM0IsWUFBQSxDQUFBLEtBQUFlLFNBQUEsR0FBQSxTQUFBLElBQUEsS0FBQVEsVUFBQSxFQUFBLENBUEE7QUFBQSxnQkFTQTlFLE1BQUEsR0FBQW9FLE1BQUEsQ0FBQXRCLGlCQUFBLENBQUExRSxHQUFBLEVBQUFtRixZQUFBLENBQUEsQ0FUQTtBQUFBLGdCQVdBLE9BQUF2RCxNQUFBLENBWEE7QUFBQSxhQXZFQTtBQUFBLFM7UUNGQTVELE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFNBQUEsRUFBQStJLFVBQUEsRTtRQUNBQSxVQUFBLENBQUE1SSxPQUFBLEdBQUE7QUFBQSxZQUFBLFFBQUE7QUFBQSxZQUFBLEdBQUE7QUFBQSxTQUFBLEM7UUFDQSxTQUFBNEksVUFBQSxDQUFBcEIsTUFBQSxFQUFBckgsQ0FBQSxFQUFBO0FBQUEsWUFLQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBMEksT0FBQSxHQUFBO0FBQUEsZ0JBQ0EsS0FBQUMsU0FBQSxHQUFBLE1BQUEsQ0FEQTtBQUFBLGFBTEE7QUFBQSxZQVNBRCxPQUFBLENBQUFFLGFBQUEsR0FBQSxLQUFBLENBVEE7QUFBQSxZQVVBRixPQUFBLENBQUFHLGNBQUEsR0FBQSxNQUFBLENBVkE7QUFBQSxZQVdBSCxPQUFBLENBQUFJLEtBQUEsR0FBQXpHLFNBQUEsQ0FYQTtBQUFBLFlBWUFxRyxPQUFBLENBQUFLLFNBQUEsR0FBQSxFQUFBLENBWkE7QUFBQSxZQWFBTCxPQUFBLENBQUFNLFVBQUEsR0FBQSxFQUFBLENBYkE7QUFBQSxZQWVBM0osT0FBQSxDQUFBbUIsTUFBQSxDQUFBa0ksT0FBQSxDQUFBbkksU0FBQSxFQUFBO0FBQUEsZ0JBQ0EwSSxTQUFBLEVBQUFBLFNBREE7QUFBQSxnQkFFQUMsa0JBQUEsRUFBQUEsa0JBRkE7QUFBQSxnQkFHQUMsYUFBQSxFQUFBQSxhQUhBO0FBQUEsZ0JBSUFDLFVBQUEsRUFBQUEsVUFKQTtBQUFBLGdCQUtBQyxNQUFBLEVBQUFBLE1BTEE7QUFBQSxhQUFBLEVBZkE7QUFBQSxZQXVCQSxPQUFBWCxPQUFBLENBdkJBO0FBQUEsWUE4QkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBUSxrQkFBQSxDQUFBSSxnQkFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQSxDQUFBQSxnQkFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxLQUFBLENBREE7QUFBQSxpQkFEQTtBQUFBLGdCQUlBLE9BQUFBLGdCQUFBLElBQUEsS0FBQSxHQUFBLE1BQUEsR0FBQSxFQUFBLENBSkE7QUFBQSxhQTlCQTtBQUFBLFlBNkNBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBQUwsU0FBQSxHQUFBO0FBQUEsZ0JBQ0EsSUFBQSxLQUFBSCxLQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBLEtBQUFBLEtBQUEsQ0FBQXBDLE9BQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSxLQUFBb0MsS0FBQSxDQUFBbEMsS0FBQSxDQUFBLENBQUEsRUFBQSxLQUFBa0MsS0FBQSxDQUFBcEMsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLG9CQUtBLE9BQUEsS0FBQW9DLEtBQUEsQ0FMQTtBQUFBLGlCQURBO0FBQUEsZ0JBU0EsT0FBQXpHLFNBQUEsQ0FUQTtBQUFBLGFBN0NBO0FBQUEsWUE4REE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBK0csVUFBQSxDQUFBTixLQUFBLEVBQUFDLFNBQUEsRUFBQTtBQUFBLGdCQUNBLEtBQUFELEtBQUEsR0FBQUEsS0FBQSxDQURBO0FBQUEsZ0JBRUEsS0FBQUMsU0FBQSxHQUFBQSxTQUFBLENBRkE7QUFBQSxhQTlEQTtBQUFBLFlBdUVBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQUFJLGFBQUEsQ0FBQWxILE1BQUEsRUFBQTtBQUFBLGdCQUNBLEtBQUErRyxVQUFBLEdBQUEvRyxNQUFBLENBREE7QUFBQSxhQXZFQTtBQUFBLFlBZ0ZBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBQW9ILE1BQUEsQ0FBQWhJLEdBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUE0QixNQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBdUQsWUFBQSxDQUZBO0FBQUEsZ0JBSUEsSUFBQSxDQUFBLEtBQUFzQyxLQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBekgsR0FBQSxDQURBO0FBQUEsaUJBSkE7QUFBQSxnQkFRQW1GLFlBQUEsR0FBQWEsTUFBQSxDQUFBdkIsbUJBQUEsQ0FBQXpFLEdBQUEsQ0FBQSxDQVJBO0FBQUEsZ0JBVUFtRixZQUFBLENBQUEsS0FBQW1DLFNBQUEsR0FBQSxHQUFBLEdBQUEsS0FBQUcsS0FBQSxHQUFBLEdBQUEsSUFBQSxLQUFBQyxTQUFBLENBVkE7QUFBQSxnQkFZQTlGLE1BQUEsR0FBQW9FLE1BQUEsQ0FBQXRCLGlCQUFBLENBQUExRSxHQUFBLEVBQUFtRixZQUFBLENBQUEsQ0FaQTtBQUFBLGdCQWNBLE9BQUF2RCxNQUFBLENBZEE7QUFBQSxhQWhGQTtBQUFBLFM7UUNGQTVELE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLFdBQUEsRUFBQTZKLFNBQUEsRTtRQUNBQSxTQUFBLENBQUExSixPQUFBLEdBQUE7QUFBQSxZQUFBLGFBQUE7QUFBQSxZQUFBLGdCQUFBO0FBQUEsWUFBQSxTQUFBO0FBQUEsWUFBQSxVQUFBO0FBQUEsWUFBQSxHQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQTBKLFNBQUEsQ0FBQXpKLFVBQUEsRUFBQXNILGNBQUEsRUFBQXNCLE9BQUEsRUFBQTNJLFFBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsWUFNQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBd0osS0FBQSxDQUFBdEosS0FBQSxFQUFBO0FBQUEsZ0JBRUEsS0FBQUMsUUFBQSxDQUFBRCxLQUFBLEVBRkE7QUFBQSxnQkFNQTtBQUFBO0FBQUE7QUFBQSxxQkFBQXVKLFVBQUEsR0FBQSxJQUFBckMsY0FBQSxFQUFBLENBTkE7QUFBQSxnQkFVQTtBQUFBO0FBQUE7QUFBQSxxQkFBQXNDLE9BQUEsR0FBQSxJQUFBaEIsT0FBQSxFQUFBLENBVkE7QUFBQSxnQkFXQSxLQUFBaUIsSUFBQSxHQUFBLEVBQUEsQ0FYQTtBQUFBLGdCQVlBLEtBQUFDLE9BQUEsR0FBQSxFQUFBLENBWkE7QUFBQSxnQkFhQSxLQUFBdEosS0FBQSxHQUFBLEVBQUEsQ0FiQTtBQUFBLGFBTkE7QUFBQSxZQXNCQWtKLEtBQUEsQ0FBQWpKLFNBQUEsR0FBQSxJQUFBVCxVQUFBLEVBQUEsQ0F0QkE7QUFBQSxZQXdCQVQsT0FBQSxDQUFBbUIsTUFBQSxDQUFBZ0osS0FBQSxDQUFBakosU0FBQSxFQUFBO0FBQUEsZ0JBQ0FHLFNBQUEsRUFBQUEsU0FEQTtBQUFBLGdCQUVBbUosWUFBQSxFQUFBQSxZQUZBO0FBQUEsZ0JBR0FDLGtCQUFBLEVBQUFBLGtCQUhBO0FBQUEsZ0JBSUFDLGlCQUFBLEVBQUFBLGlCQUpBO0FBQUEsZ0JBS0FDLHNCQUFBLEVBQUFBLHNCQUxBO0FBQUEsZ0JBTUFDLG9CQUFBLEVBQUFBLG9CQU5BO0FBQUEsZ0JBT0FiLFVBQUEsRUFBQUEsVUFQQTtBQUFBLGdCQVFBYyxjQUFBLEVBQUFBLGNBUkE7QUFBQSxhQUFBLEVBeEJBO0FBQUEsWUFtQ0EsT0FBQVYsS0FBQSxDQW5DQTtBQUFBLFlBcUNBLFNBQUE5SSxTQUFBLEdBQUE7QUFBQSxnQkFDQSxJQUFBUSxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsZ0JBRUEsT0FBQTtBQUFBLG9CQUNBeUksSUFBQSxFQUFBekksSUFBQSxDQUFBeUksSUFEQTtBQUFBLG9CQUVBQyxPQUFBLEVBQUExSSxJQUFBLENBQUEwSSxPQUZBO0FBQUEsb0JBR0F0SixLQUFBLEVBQUFZLElBQUEsQ0FBQVosS0FIQTtBQUFBLGlCQUFBLENBRkE7QUFBQSxhQXJDQTtBQUFBLFlBOENBLFNBQUF1SixZQUFBLENBQUExSSxRQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLG9CQUFBRCxJQUFBLEdBQUEsSUFBQSxDQUZBO0FBQUEsZ0JBR0EsSUFBQWhCLEtBQUEsR0FBQWdCLElBQUEsQ0FBQUUsUUFBQSxFQUFBLENBSEE7QUFBQSxnQkFJQSxJQUFBQyxHQUFBLENBSkE7QUFBQSxnQkFPQTtBQUFBLGdCQUFBQSxHQUFBLEdBQUFILElBQUEsQ0FBQXVJLFVBQUEsQ0FBQXJCLFVBQUEsQ0FBQWxILElBQUEsQ0FBQUksY0FBQSxDQUFBcEIsS0FBQSxDQUFBbUIsR0FBQSxFQUFBbkIsS0FBQSxDQUFBcUIsTUFBQSxDQUFBLENBQUEsQ0FQQTtBQUFBLGdCQVNBO0FBQUEsZ0JBQUFGLEdBQUEsR0FBQUgsSUFBQSxDQUFBd0ksT0FBQSxDQUFBTCxNQUFBLENBQUFoSSxHQUFBLENBQUEsQ0FUQTtBQUFBLGdCQVdBdEIsUUFBQSxDQUFBLFlBQUE7QUFBQSxvQkFDQW1CLElBQUEsQ0FBQU0sU0FBQSxDQUFBSCxHQUFBLEVBQUFJLGdCQUFBLEVBREE7QUFBQSxpQkFBQSxFQVhBO0FBQUEsZ0JBZUEsU0FBQUEsZ0JBQUEsQ0FBQUMsSUFBQSxFQUFBckIsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQXdCLGdCQUFBLEdBQUFYLElBQUEsQ0FBQVksY0FBQSxDQUFBSixJQUFBLENBQUFLLE9BQUEsR0FBQSxDQUFBLEVBQUFMLElBQUEsQ0FBQU0sS0FBQSxFQUFBLEVBQUEzQixNQUFBLENBQUEsQ0FEQTtBQUFBLG9CQUdBYSxJQUFBLENBQUF1SSxVQUFBLENBQUE3QixhQUFBLENBQUFsRyxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLEVBQUFrQixhQUFBLENBQUEsT0FBQSxDQUFBLEVBSEE7QUFBQSxvQkFLQTVCLElBQUEsQ0FBQWdKLGNBQUEsQ0FBQXhJLElBQUEsRUFBQSxVQUFBaUksSUFBQSxFQUFBO0FBQUEsd0JBRUF6SSxJQUFBLENBQUF5SSxJQUFBLEdBQUF6SSxJQUFBLENBQUE2SSxpQkFBQSxDQUFBSixJQUFBLENBQUEsQ0FGQTtBQUFBLHdCQUdBekksSUFBQSxDQUFBWixLQUFBLEdBQUFvQixJQUFBLENBQUFwQixLQUFBLEVBQUEsQ0FIQTtBQUFBLHdCQUlBWSxJQUFBLENBQUEwSSxPQUFBLEdBQUExSSxJQUFBLENBQUE0SSxrQkFBQSxDQUFBcEksSUFBQSxDQUFBLENBSkE7QUFBQSx3QkFNQVIsSUFBQSxDQUFBd0ksT0FBQSxDQUFBUCxhQUFBLENBQUFuSixDQUFBLENBQUE0QyxHQUFBLENBQUExQixJQUFBLENBQUEwSSxPQUFBLEVBQUEsZUFBQSxDQUFBLEVBTkE7QUFBQSx3QkFRQTFJLElBQUEsQ0FBQTBJLE9BQUEsQ0FBQXJLLElBQUEsQ0FBQTtBQUFBLDRCQUNBbUcsS0FBQSxFQUFBLFNBREE7QUFBQSw0QkFFQVQsSUFBQSxFQUFBLFFBRkE7QUFBQSw0QkFHQU0sYUFBQSxFQUFBLE9BSEE7QUFBQSx5QkFBQSxFQVJBO0FBQUEsd0JBY0EsSUFBQXBFLFFBQUEsS0FBQWtCLFNBQUEsRUFBQTtBQUFBLDRCQUNBbEIsUUFBQSxDQUFBRCxJQUFBLENBQUFSLFNBQUEsRUFBQSxFQURBO0FBQUEseUJBZEE7QUFBQSxxQkFBQSxFQUxBO0FBQUEsaUJBZkE7QUFBQSxhQTlDQTtBQUFBLFlBeUZBLFNBQUEwSSxVQUFBLENBQUFOLEtBQUEsRUFBQUMsU0FBQSxFQUFBO0FBQUEsZ0JBQ0FELEtBQUEsR0FBQSxLQUFBa0Isc0JBQUEsQ0FBQWxCLEtBQUEsQ0FBQSxDQURBO0FBQUEsZ0JBRUEsS0FBQVksT0FBQSxDQUFBTixVQUFBLENBQUFOLEtBQUEsRUFBQUMsU0FBQSxFQUZBO0FBQUEsYUF6RkE7QUFBQSxZQW1HQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQUFpQixzQkFBQSxDQUFBbEIsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQTdGLE1BQUEsR0FBQTZGLEtBQUEsQ0FEQTtBQUFBLGdCQUdBO0FBQUEsb0JBQUFxQixHQUFBLEdBQUEsS0FBQXpJLElBQUEsQ0FBQUUsUUFBQSxDQUFBLE1BQUEsRUFBQW9DLElBQUEsQ0FBQSxDQUFBLEVBQUFwQyxRQUFBLENBQUEsZUFBQSxFQUFBQSxRQUFBLENBQUFrSCxLQUFBLEVBQUEvRyxPQUFBLEdBQUF5RCxhQUFBLEVBQUEsQ0FIQTtBQUFBLGdCQUtBLElBQUEyRSxHQUFBLEVBQUE7QUFBQSxvQkFDQWxILE1BQUEsSUFBQSxNQUFBa0gsR0FBQSxDQURBO0FBQUEsaUJBTEE7QUFBQSxnQkFTQSxPQUFBbEgsTUFBQSxDQVRBO0FBQUEsYUFuR0E7QUFBQSxZQW1IQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBZ0gsb0JBQUEsR0FBQTtBQUFBLGdCQUNBLElBQUEsS0FBQVAsT0FBQSxDQUFBWCxTQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBLEtBQUFpQixzQkFBQSxDQUFBLEtBQUFOLE9BQUEsQ0FBQVosS0FBQSxJQUFBLEdBQUEsR0FBQSxLQUFBWSxPQUFBLENBQUFYLFNBQUEsQ0FEQTtBQUFBLGlCQURBO0FBQUEsZ0JBSUEsT0FBQSxJQUFBLENBSkE7QUFBQSxhQW5IQTtBQUFBLFlBaUlBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQUFlLGtCQUFBLENBQUFwSSxJQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBdUIsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUEyRyxPQUFBLEdBQUFsSSxJQUFBLENBQUFFLFFBQUEsQ0FBQSxNQUFBLEVBQUFvQyxJQUFBLENBQUEsQ0FBQSxFQUFBakMsT0FBQSxHQUFBcUIsZUFBQSxDQUFBLFlBQUEsQ0FBQSxDQUZBO0FBQUEsZ0JBR0FwRCxDQUFBLENBQUF3QyxPQUFBLENBQUFvSCxPQUFBLENBQUF0RyxpQkFBQSxFQUFBLEVBQUEsVUFBQVgsR0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQVgsS0FBQSxHQUFBNEgsT0FBQSxDQUFBeEcsZUFBQSxDQUFBVCxHQUFBLEVBQUEsQ0FBQSxFQUFBakIsSUFBQSxDQUFBTSxLQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBQSxLQUFBLENBQUF1RCxhQUFBLEdBQUE1QyxHQUFBLENBRkE7QUFBQSxvQkFHQU0sTUFBQSxDQUFBMUQsSUFBQSxDQUFBeUMsS0FBQSxFQUhBO0FBQUEsaUJBQUEsRUFIQTtBQUFBLGdCQWtCQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQUFpQixNQUFBLENBbEJBO0FBQUEsYUFqSUE7QUFBQSxZQTRKQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBQThHLGlCQUFBLENBQUFKLElBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUExRyxNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBRUFqRCxDQUFBLENBQUF3QyxPQUFBLENBQUFtSCxJQUFBLEVBQUEsVUFBQVMsR0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQTFJLElBQUEsR0FBQTBJLEdBQUEsQ0FBQTdILEdBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUE4SCxTQUFBLEdBQUEzSSxJQUFBLENBQUFFLFFBQUEsQ0FBQSxZQUFBLEVBQUFJLEtBQUEsRUFBQSxDQUZBO0FBQUEsb0JBSUFoQyxDQUFBLENBQUF3QyxPQUFBLENBQUE0SCxHQUFBLENBQUEzSCxhQUFBLEVBQUEsVUFBQUMsUUFBQSxFQUFBQyxHQUFBLEVBQUE7QUFBQSx3QkFDQTBILFNBQUEsQ0FBQTFILEdBQUEsSUFBQTNDLENBQUEsQ0FBQTRDLEdBQUEsQ0FBQUYsUUFBQSxFQUFBLFVBQUFHLFlBQUEsRUFBQTtBQUFBLDRCQUVBO0FBQUEsZ0NBQUFpRyxLQUFBLEdBQUFzQixHQUFBLENBQUE3SCxHQUFBLENBQUFSLE9BQUEsR0FBQXFCLGVBQUEsQ0FBQSxlQUFBLEVBQUFBLGVBQUEsQ0FBQVQsR0FBQSxFQUFBNkMsYUFBQSxFQUFBLENBRkE7QUFBQSw0QkFJQTtBQUFBLGdDQUFBc0QsS0FBQSxFQUFBO0FBQUEsZ0NBQ0EsT0FBQWpHLFlBQUEsQ0FBQWpCLFFBQUEsQ0FBQSxNQUFBLEVBQUFBLFFBQUEsQ0FBQSxZQUFBLEVBQUFrQixhQUFBLENBQUFnRyxLQUFBLENBQUEsQ0FEQTtBQUFBLDZCQUpBO0FBQUEsNEJBT0EsT0FBQWpHLFlBQUEsQ0FBQWpCLFFBQUEsQ0FBQSxNQUFBLEVBQUFrQixhQUFBLENBQUEsSUFBQSxDQUFBLENBUEE7QUFBQSx5QkFBQSxFQVNBcUUsSUFUQSxDQVNBLElBVEEsQ0FBQSxDQURBO0FBQUEscUJBQUEsRUFKQTtBQUFBLG9CQWlCQWtELFNBQUEsQ0FBQS9KLEtBQUEsR0FBQSxFQUFBLENBakJBO0FBQUEsb0JBa0JBTixDQUFBLENBQUFzSyxNQUFBLENBQUE1SSxJQUFBLENBQUFwQixLQUFBLEVBQUEsRUFBQSxVQUFBcUYsSUFBQSxFQUFBO0FBQUEsd0JBQ0EwRSxTQUFBLENBQUEvSixLQUFBLENBQUFmLElBQUEsQ0FBQW9HLElBQUEsRUFEQTtBQUFBLHFCQUFBLEVBbEJBO0FBQUEsb0JBcUJBMUMsTUFBQSxDQUFBMUQsSUFBQSxDQUFBOEssU0FBQSxFQXJCQTtBQUFBLGlCQUFBLEVBRkE7QUFBQSxnQkF5QkEsT0FBQXBILE1BQUEsQ0F6QkE7QUFBQSxhQTVKQTtBQUFBLFlBOExBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBaUgsY0FBQSxDQUFBeEksSUFBQSxFQUFBUCxRQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBRCxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQXlJLElBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBbEcsUUFBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLGdCQUlBL0IsSUFBQSxDQUFBRSxRQUFBLENBQUEsTUFBQSxFQUFBdUMsS0FBQSxDQUFBLFVBQUFGLEtBQUEsRUFBQWpDLEtBQUEsRUFBQTtBQUFBLG9CQUVBeUIsUUFBQSxDQUFBbEUsSUFBQSxDQUFBMkIsSUFBQSxDQUFBd0Msb0JBQUEsQ0FBQTFCLEtBQUEsQ0FBQSxFQUZBO0FBQUEsb0JBSUEySCxJQUFBLENBQUFwSyxJQUFBLENBQUF5QyxLQUFBLEVBSkE7QUFBQSxpQkFBQSxFQUpBO0FBQUEsZ0JBV0FkLElBQUEsQ0FBQXlDLGNBQUEsQ0FBQUYsUUFBQSxFQUFBRyxXQUFBLEVBWEE7QUFBQSxnQkFhQSxTQUFBQSxXQUFBLENBQUFDLGlCQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBMEcsR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUdBdkssQ0FBQSxDQUFBd0MsT0FBQSxDQUFBbUgsSUFBQSxFQUFBLFVBQUFTLEdBQUEsRUFBQW5HLEtBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUF1RyxNQUFBLEdBQUE7QUFBQSw0QkFDQWpJLEdBQUEsRUFBQTZILEdBREE7QUFBQSw0QkFFQTNILGFBQUEsRUFBQXpDLENBQUEsQ0FBQThELFNBQUEsQ0FBQUQsaUJBQUEsQ0FBQUksS0FBQSxDQUFBLEVBQUEsVUFBQUYsQ0FBQSxFQUFBO0FBQUEsZ0NBQ0EvRCxDQUFBLENBQUF3QyxPQUFBLENBQUF1QixDQUFBLEVBQUEsVUFBQUMsSUFBQSxFQUFBQyxLQUFBLEVBQUE7QUFBQSxvQ0FDQUYsQ0FBQSxDQUFBRSxLQUFBLElBQUFELElBQUEsQ0FBQXRDLElBQUEsQ0FEQTtBQUFBLGlDQUFBLEVBREE7QUFBQSxnQ0FJQSxPQUFBcUMsQ0FBQSxDQUpBO0FBQUEsNkJBQUEsQ0FGQTtBQUFBLHlCQUFBLENBREE7QUFBQSx3QkFXQXdHLEdBQUEsQ0FBQWhMLElBQUEsQ0FBQWlMLE1BQUEsRUFYQTtBQUFBLHFCQUFBLEVBSEE7QUFBQSxvQkFpQkFySixRQUFBLENBQUFvSixHQUFBLEVBakJBO0FBQUEsaUJBYkE7QUFBQSxhQTlMQTtBQUFBLFM7UUNGQWxMLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQW1MLFFBQUEsQ0FBQSxhQUFBLEVBQUEzSyxVQUFBLEU7UUFFQSxTQUFBQSxVQUFBLEdBQUE7QUFBQSxZQUVBLElBQUEySyxRQUFBLEdBQUEsRUFDQUMsSUFBQSxFQUFBQyxhQURBLEVBQUEsQ0FGQTtBQUFBLFlBTUFBLGFBQUEsQ0FBQTlLLE9BQUEsR0FBQTtBQUFBLGdCQUFBLFFBQUE7QUFBQSxnQkFBQSxXQUFBO0FBQUEsZ0JBQUEsR0FBQTtBQUFBLGFBQUEsQ0FOQTtBQUFBLFlBUUEsT0FBQTRLLFFBQUEsQ0FSQTtBQUFBLFlBVUEsU0FBQUUsYUFBQSxDQUFBdEQsTUFBQSxFQUFBdUQsU0FBQSxFQUFBNUssQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUUsS0FBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQTJLLFFBQUEsR0FBQTtBQUFBLG9CQUNBQyxjQUFBLEVBQUEscUJBREE7QUFBQSxvQkFFQUMsY0FBQSxFQUFBLHFCQUZBO0FBQUEsb0JBR0FDLGNBQUEsRUFBQSxxQkFIQTtBQUFBLG9CQUlBQyxXQUFBLEVBQUEsb0JBSkE7QUFBQSxpQkFBQSxDQUZBO0FBQUEsZ0JBYUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQUMsTUFBQSxHQUFBO0FBQUEsb0JBRUFDLE9BQUEsQ0FBQUMsVUFBQSxDQUFBO0FBQUEsd0JBQ0EzSSxhQUFBLEVBQUEsWUFBQTtBQUFBLDRCQUNBLE9BQUEsS0FBQUssYUFBQSxDQUFBLGVBQUEsQ0FBQSxDQURBO0FBQUEseUJBREE7QUFBQSx3QkFJQUssVUFBQSxFQUFBLFlBQUE7QUFBQSw0QkFDQSxPQUFBLEtBQUFMLGFBQUEsQ0FBQSxZQUFBLENBQUEsQ0FEQTtBQUFBLHlCQUpBO0FBQUEscUJBQUEsRUFGQTtBQUFBLG9CQVdBcUksT0FBQSxDQUFBRSxZQUFBLENBQUE7QUFBQSx3QkFDQTdGLGFBQUEsRUFBQSxZQUFBO0FBQUEsNEJBQ0EsT0FBQSxLQUFBOUQsSUFBQSxDQUFBb0IsYUFBQSxDQUFBLGVBQUEsQ0FBQSxDQURBO0FBQUEseUJBREE7QUFBQSxxQkFBQSxFQVhBO0FBQUEsb0JBZ0JBcUksT0FBQSxDQUFBRyxnQkFBQSxDQUFBO0FBQUEsd0JBQ0E5RixhQUFBLEVBQUEsWUFBQTtBQUFBLDRCQUNBLElBQUFBLGFBQUEsR0FBQSxJQUFBLENBREE7QUFBQSw0QkFFQSxLQUFBbkMsT0FBQSxHQUFBa0ksSUFBQSxDQUFBLFVBQUF0SCxLQUFBLEVBQUE1RCxNQUFBLEVBQUE7QUFBQSxnQ0FDQSxJQUFBMkIsS0FBQSxHQUFBM0IsTUFBQSxDQUFBbUYsYUFBQSxFQUFBLENBREE7QUFBQSxnQ0FFQSxJQUFBeEQsS0FBQSxJQUFBLElBQUEsSUFBQSxDQUFBd0QsYUFBQSxJQUFBLElBQUEsSUFBQXhELEtBQUEsR0FBQXdELGFBQUEsQ0FBQSxFQUFBO0FBQUEsb0NBQ0FBLGFBQUEsR0FBQXhELEtBQUEsQ0FEQTtBQUFBLGlDQUZBO0FBQUEsNkJBQUEsRUFGQTtBQUFBLDRCQVFBLE9BQUF3RCxhQUFBLENBUkE7QUFBQSx5QkFEQTtBQUFBLHFCQUFBLEVBaEJBO0FBQUEsaUJBYkE7QUFBQSxnQkFpREE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFBOUQsSUFBQSxHQUFBLEVBQUEsQ0FqREE7QUFBQSxnQkFtREFyQyxPQUFBLENBQUFtQixNQUFBLENBQUEwSyxNQUFBLENBQUEzSyxTQUFBLEVBQUE7QUFBQSxvQkFDQTJFLE9BQUEsRUFBQSxFQUNBQyxpQkFBQSxFQUFBLE1BREEsRUFEQTtBQUFBLG9CQUlBaEQsTUFBQSxFQUFBLEVBSkE7QUFBQSxvQkFLQWhDLFFBQUEsRUFBQUEsUUFMQTtBQUFBLG9CQU1BaUIsUUFBQSxFQUFBQSxRQU5BO0FBQUEsb0JBT0FvSyxVQUFBLEVBQUFBLFVBUEE7QUFBQSxvQkFRQUMsVUFBQSxFQUFBQSxVQVJBO0FBQUEsb0JBU0FqSyxTQUFBLEVBQUFBLFNBVEE7QUFBQSxvQkFVQW1ELGVBQUEsRUFBQUEsZUFWQTtBQUFBLG9CQVdBK0csUUFBQSxFQUFBQSxRQVhBO0FBQUEsb0JBWUFDLFVBQUEsRUFBQUEsVUFaQTtBQUFBLG9CQWFBckssY0FBQSxFQUFBQSxjQWJBO0FBQUEsb0JBY0FRLGNBQUEsRUFBQUEsY0FkQTtBQUFBLG9CQWVBOEosZUFBQSxFQUFBQSxlQWZBO0FBQUEsb0JBZ0JBQyxhQUFBLEVBQUFBLGFBaEJBO0FBQUEsb0JBaUJBQyxzQkFBQSxFQUFBQSxzQkFqQkE7QUFBQSxvQkFrQkFwSSxvQkFBQSxFQUFBQSxvQkFsQkE7QUFBQSxvQkFtQkFxSSxnQkFBQSxFQUFBQSxnQkFuQkE7QUFBQSxvQkFvQkFDLGdCQUFBLEVBQUFBLGdCQXBCQTtBQUFBLG9CQXFCQXJJLGNBQUEsRUFBQUEsY0FyQkE7QUFBQSxpQkFBQSxFQW5EQTtBQUFBLGdCQTJFQSxPQUFBdUgsTUFBQSxDQTNFQTtBQUFBLGdCQTZFQSxTQUFBL0ssUUFBQSxDQUFBOEwsS0FBQSxFQUFBO0FBQUEsb0JBQ0EvTCxLQUFBLEdBQUErTCxLQUFBLENBREE7QUFBQSxpQkE3RUE7QUFBQSxnQkFpRkEsU0FBQTdLLFFBQUEsR0FBQTtBQUFBLG9CQUNBLE9BQUFsQixLQUFBLENBREE7QUFBQSxpQkFqRkE7QUFBQSxnQkFxRkEsU0FBQXVMLFVBQUEsQ0FBQVMsS0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQXJCLFFBQUEsQ0FBQXFCLEtBQUEsQ0FBQSxDQURBO0FBQUEsaUJBckZBO0FBQUEsZ0JBeUZBLFNBQUFWLFVBQUEsQ0FBQVUsS0FBQSxFQUFBQyxPQUFBLEVBQUE7QUFBQSxvQkFDQXRCLFFBQUEsQ0FBQXFCLEtBQUEsSUFBQUMsT0FBQSxDQURBO0FBQUEsaUJBekZBO0FBQUEsZ0JBb0dBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQUE3SyxjQUFBLENBQUFELEdBQUEsRUFBQUUsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQTBCLE1BQUEsR0FBQTVCLEdBQUEsQ0FEQTtBQUFBLG9CQUdBLElBQUFFLE1BQUEsQ0FBQWUsUUFBQSxFQUFBO0FBQUEsd0JBQ0FXLE1BQUEsR0FBQTVCLEdBQUEsR0FBQSxHQUFBLEdBQUFFLE1BQUEsQ0FBQWUsUUFBQSxDQURBO0FBQUEscUJBSEE7QUFBQSxvQkFPQSxJQUFBZixNQUFBLENBQUEwRCxJQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBMUQsTUFBQSxDQUFBMEQsSUFBQSxLQUFBLFFBQUEsSUFBQTFELE1BQUEsQ0FBQTBELElBQUEsS0FBQSxNQUFBLEVBQUE7QUFBQSw0QkFDQWhDLE1BQUEsSUFBQSxNQUFBMUIsTUFBQSxDQUFBMEQsSUFBQSxHQUFBLEdBQUEsR0FBQTFELE1BQUEsQ0FBQTZELEVBQUEsQ0FEQTtBQUFBLHlCQUFBLE1BRUEsSUFBQTdELE1BQUEsQ0FBQTBELElBQUEsS0FBQSxRQUFBLEVBQUE7QUFBQSw0QkFDQWhDLE1BQUEsSUFBQSw2QkFBQSxDQURBO0FBQUEseUJBSEE7QUFBQSxxQkFQQTtBQUFBLG9CQWNBLE9BQUFBLE1BQUEsQ0FkQTtBQUFBLGlCQXBHQTtBQUFBLGdCQTJIQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQXlJLFFBQUEsQ0FBQXJLLEdBQUEsRUFBQUYsUUFBQSxFQUFBO0FBQUEsb0JBR0E7QUFBQSxvQkFBQWdLLE9BQUEsQ0FBQWlCLE9BQUEsQ0FBQS9LLEdBQUEsRUFBQSxVQUFBZ0wsS0FBQSxFQUFBQyxPQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBNUssSUFBQSxHQUFBMkssS0FBQSxDQURBO0FBQUEsd0JBRUEsSUFBQWhNLE1BQUEsR0FBQWdNLEtBQUEsQ0FBQXpLLFFBQUEsQ0FBQSxNQUFBLEVBQUFHLE9BQUEsR0FBQSxDQUFBLEVBQUFMLElBQUEsQ0FBQTZLLFFBQUEsQ0FBQUMsR0FBQSxDQUFBeEssS0FBQSxFQUFBLENBRkE7QUFBQSx3QkFJQSxJQUFBYixRQUFBLEtBQUFrQixTQUFBLEVBQUE7QUFBQSw0QkFDQWxCLFFBQUEsQ0FBQU8sSUFBQSxFQUFBckIsTUFBQSxFQUFBaU0sT0FBQSxFQURBO0FBQUEseUJBSkE7QUFBQSxxQkFBQSxFQUhBO0FBQUEsaUJBM0hBO0FBQUEsZ0JBK0lBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQVgsVUFBQSxDQUFBdEssR0FBQSxFQUFBRixRQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLHdCQUFBRCxJQUFBLEdBQUEsSUFBQSxDQUZBO0FBQUEsb0JBSUFpSyxPQUFBLENBQUFzQixTQUFBLENBQUFwTCxHQUFBLEVBQUEsVUFBQXFMLE9BQUEsRUFBQTtBQUFBLHdCQUVBLElBQUFyTSxNQUFBLEdBQUFxTSxPQUFBLENBQUFoTCxJQUFBLENBQUE2SyxRQUFBLENBQUFDLEdBQUEsQ0FBQXhLLEtBQUEsRUFBQSxDQUZBO0FBQUEsd0JBR0EsSUFBQU4sSUFBQSxHQUFBeUosT0FBQSxDQUFBd0IsTUFBQSxDQUFBekwsSUFBQSxDQUFBMkssYUFBQSxDQUFBYSxPQUFBLENBQUEsQ0FBQSxDQUhBO0FBQUEsd0JBSUFoTCxJQUFBLENBQUE2SyxRQUFBLENBQUFsTCxHQUFBLEdBQUFILElBQUEsQ0FBQUUsUUFBQSxHQUFBQyxHQUFBLENBSkE7QUFBQSx3QkFLQUssSUFBQSxDQUFBa0wsU0FBQSxDQUFBRixPQUFBLEVBTEE7QUFBQSx3QkFPQSxJQUFBdkwsUUFBQSxLQUFBa0IsU0FBQSxFQUFBO0FBQUEsNEJBQ0FsQixRQUFBLENBQUFPLElBQUEsRUFBQXJCLE1BQUEsRUFEQTtBQUFBLHlCQVBBO0FBQUEscUJBQUEsRUFKQTtBQUFBLGlCQS9JQTtBQUFBLGdCQWlLQSxTQUFBdUwsZUFBQSxDQUFBckksR0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQXNKLE1BQUEsR0FBQXRKLEdBQUEsQ0FEQTtBQUFBLG9CQUVBdkQsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBcUssTUFBQSxFQUFBLFVBQUE3SyxLQUFBLEVBQUFXLEdBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFYLEtBQUEsQ0FBQWlELElBQUEsRUFBQTtBQUFBLDRCQUNBLFFBQUFqRCxLQUFBLENBQUFpRCxJQUFBO0FBQUEsNEJBQ0EsS0FBQSxRQUFBO0FBQUEsZ0NBQ0E0SCxNQUFBLENBQUFsSyxHQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsZ0NBRUEsTUFIQTtBQUFBLDRCQUlBLEtBQUEsUUFBQTtBQUFBLGdDQUNBa0ssTUFBQSxDQUFBbEssR0FBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLGdDQUVBLE1BTkE7QUFBQSw0QkFPQSxLQUFBLE9BQUE7QUFBQSxnQ0FDQWtLLE1BQUEsQ0FBQWxLLEdBQUEsSUFBQSxFQUFBLENBREE7QUFBQSxnQ0FFQSxNQVRBO0FBQUEsNEJBVUEsS0FBQSxTQUFBO0FBQUEsZ0NBQ0FrSyxNQUFBLENBQUFsSyxHQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsZ0NBRUEsTUFaQTtBQUFBLDZCQURBO0FBQUEseUJBREE7QUFBQSxxQkFBQSxFQUZBO0FBQUEsb0JBb0JBLE9BQUFrSyxNQUFBLENBcEJBO0FBQUEsaUJBaktBO0FBQUEsZ0JBZ01BO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQWhCLGFBQUEsQ0FBQXhMLE1BQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFhLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBK0IsTUFBQSxDQUZBO0FBQUEsb0JBSUFBLE1BQUEsR0FBQTVDLE1BQUEsQ0FBQXlNLFdBQUEsRUFBQSxDQUpBO0FBQUEsb0JBS0E3SixNQUFBLENBQUF2QixJQUFBLENBQUF5QixVQUFBLEdBQUEsRUFBQSxDQUxBO0FBQUEsb0JBT0FuRCxDQUFBLENBQUF3QyxPQUFBLENBQUFuQyxNQUFBLENBQUErQyxlQUFBLENBQUEsTUFBQSxFQUFBQyxPQUFBLEdBQUFELGVBQUEsQ0FBQSxZQUFBLEVBQUFFLGlCQUFBLEVBQUEsRUFBQSxVQUFBaUIsWUFBQSxFQUFBO0FBQUEsd0JBQ0F0QixNQUFBLENBQUF2QixJQUFBLENBQUF5QixVQUFBLENBQUFvQixZQUFBLElBQUFsRSxNQUFBLENBQUErQyxlQUFBLENBQUEsTUFBQSxFQUFBQyxPQUFBLEdBQUFELGVBQUEsQ0FBQSxZQUFBLEVBQUFBLGVBQUEsQ0FBQW1CLFlBQUEsRUFBQXVJLFdBQUEsRUFBQSxDQURBO0FBQUEscUJBQUEsRUFQQTtBQUFBLG9CQWdCQTtBQUFBO0FBQUE7QUFBQTtBQUFBLDJCQUFBN0osTUFBQSxDQWhCQTtBQUFBLGlCQWhNQTtBQUFBLGdCQW1OQSxTQUFBNkksc0JBQUEsQ0FBQXpMLE1BQUEsRUFBQTBNLFVBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUE3TCxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQXdCLFFBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxvQkFJQSxJQUFBc0ssV0FBQSxHQUFBOUwsSUFBQSxDQUFBWSxjQUFBLENBQUF6QixNQUFBLEVBQUEwTSxVQUFBLENBQUEsQ0FKQTtBQUFBLG9CQU1BLElBQUFFLFVBQUEsR0FBQTlCLE9BQUEsQ0FBQStCLFlBQUEsQ0FBQUYsV0FBQSxFQUFBNUosZUFBQSxDQUFBLE1BQUEsQ0FBQSxDQU5BO0FBQUEsb0JBT0EsSUFBQStKLGdCQUFBLEdBQUFGLFVBQUEsQ0FBQTdKLGVBQUEsQ0FBQSxZQUFBLENBQUEsQ0FQQTtBQUFBLG9CQVFBLElBQUFnSyxlQUFBLEdBQUFILFVBQUEsQ0FBQTdKLGVBQUEsQ0FBQSxlQUFBLENBQUEsQ0FSQTtBQUFBLG9CQVVBcEQsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBNEssZUFBQSxDQUFBOUosaUJBQUEsRUFBQSxFQUFBLFVBQUErQixZQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBZ0ksY0FBQSxHQUFBRCxlQUFBLENBQUFoSyxlQUFBLENBQUFpQyxZQUFBLEVBQUFoQyxPQUFBLEdBQUFELGVBQUEsQ0FBQSxNQUFBLENBQUEsQ0FEQTtBQUFBLHdCQUVBLElBQUFrSyxlQUFBLEdBQUFILGdCQUFBLENBQUEvSixlQUFBLENBQUFpQyxZQUFBLEVBQUFoQyxPQUFBLEVBQUEsQ0FGQTtBQUFBLHdCQUlBWCxRQUFBLENBQUEyQyxZQUFBLElBQUEsRUFBQSxDQUpBO0FBQUEsd0JBS0EzQyxRQUFBLENBQUEyQyxZQUFBLEVBQUEvRSxLQUFBLEdBQUEsRUFBQSxDQUxBO0FBQUEsd0JBTUEsSUFBQWdOLGVBQUEsQ0FBQUMsVUFBQSxHQUFBQyxRQUFBLE1BQUEsT0FBQSxFQUFBO0FBQUEsNEJBQ0E5SyxRQUFBLENBQUEyQyxZQUFBLEVBQUEzRCxJQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEseUJBQUEsTUFFQTtBQUFBLDRCQUNBZ0IsUUFBQSxDQUFBMkMsWUFBQSxFQUFBM0QsSUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHlCQVJBO0FBQUEscUJBQUEsRUFWQTtBQUFBLG9CQXVCQSxPQUFBZ0IsUUFBQSxDQXZCQTtBQUFBLGlCQW5OQTtBQUFBLGdCQW9QQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBbEIsU0FBQSxDQUFBSCxHQUFBLEVBQUFGLFFBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFELElBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSxvQkFJQSxJQUFBaEIsS0FBQSxDQUFBcUIsTUFBQSxDQUFBMEQsSUFBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLHdCQUNBL0QsSUFBQSxDQUFBeUssVUFBQSxDQUFBdEssR0FBQSxFQUFBSSxnQkFBQSxFQURBO0FBQUEscUJBQUEsTUFFQTtBQUFBLHdCQUNBUCxJQUFBLENBQUF3SyxRQUFBLENBQUFySyxHQUFBLEVBQUFJLGdCQUFBLEVBREE7QUFBQSxxQkFOQTtBQUFBLG9CQVVBLFNBQUFBLGdCQUFBLENBQUFDLElBQUEsRUFBQXJCLE1BQUEsRUFBQTtBQUFBLHdCQUNBYSxJQUFBLENBQUFRLElBQUEsR0FBQUEsSUFBQSxDQURBO0FBQUEsd0JBR0EsSUFBQVAsUUFBQSxLQUFBa0IsU0FBQSxFQUFBO0FBQUEsNEJBQ0FsQixRQUFBLENBQUFPLElBQUEsRUFBQXJCLE1BQUEsRUFEQTtBQUFBLHlCQUhBO0FBQUEscUJBVkE7QUFBQSxpQkFwUEE7QUFBQSxnQkE4UUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQXNFLGVBQUEsQ0FBQThJLGFBQUEsRUFBQXRNLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFELElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBd00sTUFBQSxHQUFBLENBQUEsQ0FGQTtBQUFBLG9CQUdBLElBQUFDLEtBQUEsR0FBQSxDQUFBLENBSEE7QUFBQSxvQkFJQSxJQUFBdEosU0FBQSxHQUFBLEVBQUEsQ0FKQTtBQUFBLG9CQUtBLElBQUEvRCxLQUFBLENBTEE7QUFBQSxvQkFPQUEsS0FBQSxHQUFBTixDQUFBLENBQUE0TixJQUFBLENBQUFILGFBQUEsQ0FBQSxDQVBBO0FBQUEsb0JBU0F6TixDQUFBLENBQUF3QyxPQUFBLENBQUFsQyxLQUFBLEVBQUEsVUFBQWUsR0FBQSxFQUFBO0FBQUEsd0JBRUFILElBQUEsQ0FBQXdLLFFBQUEsQ0FBQXJLLEdBQUEsRUFBQSxVQUFBSyxJQUFBLEVBQUFyQixNQUFBLEVBQUFpTSxPQUFBLEVBQUE7QUFBQSw0QkFDQWpJLFNBQUEsQ0FBQWhELEdBQUEsSUFBQTtBQUFBLGdDQUNBSyxJQUFBLEVBQUFBLElBREE7QUFBQSxnQ0FFQXJCLE1BQUEsRUFBQUEsTUFGQTtBQUFBLGdDQUdBaU0sT0FBQSxFQUFBQSxPQUhBO0FBQUEsNkJBQUEsQ0FEQTtBQUFBLDRCQU1Bb0IsTUFBQSxHQU5BO0FBQUEseUJBQUEsRUFGQTtBQUFBLHdCQVVBQyxLQUFBLEdBVkE7QUFBQSxxQkFBQSxFQVRBO0FBQUEsb0JBc0JBLElBQUFFLFFBQUEsR0FBQWpELFNBQUEsQ0FBQSxZQUFBO0FBQUEsd0JBQ0EsSUFBQStDLEtBQUEsS0FBQUQsTUFBQSxFQUFBO0FBQUEsNEJBQ0E5QyxTQUFBLENBQUFrRCxNQUFBLENBQUFELFFBQUEsRUFEQTtBQUFBLDRCQUVBLElBQUExTSxRQUFBLEtBQUFrQixTQUFBLEVBQUE7QUFBQSxnQ0FDQWxCLFFBQUEsQ0FBQWtELFNBQUEsRUFEQTtBQUFBLDZCQUZBO0FBQUEseUJBREE7QUFBQSxxQkFBQSxFQU9BLEdBUEEsQ0FBQSxDQXRCQTtBQUFBLGlCQTlRQTtBQUFBLGdCQW9UQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQXZDLGNBQUEsQ0FBQXpCLE1BQUEsRUFBQTBOLFVBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFsTSxnQkFBQSxHQUFBeEIsTUFBQSxDQURBO0FBQUEsb0JBR0F3QixnQkFBQSxHQUFBa0ssZ0JBQUEsQ0FBQWxLLGdCQUFBLEVBQUFrTSxVQUFBLENBQUEsQ0FIQTtBQUFBLG9CQUtBLE9BQUFsTSxnQkFBQSxDQUxBO0FBQUEsaUJBcFRBO0FBQUEsZ0JBa1VBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBa0ssZ0JBQUEsQ0FBQWlDLFFBQUEsRUFBQUQsVUFBQSxFQUFBO0FBQUEsb0JBQ0EsU0FBQXBMLEdBQUEsSUFBQXFMLFFBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFBLFFBQUEsQ0FBQUMsY0FBQSxDQUFBdEwsR0FBQSxDQUFBLEVBQUE7QUFBQSw0QkFDQSxJQUFBLE9BQUFxTCxRQUFBLENBQUFyTCxHQUFBLENBQUEsS0FBQSxRQUFBLElBQUEsQ0FBQUksS0FBQSxDQUFBQyxPQUFBLENBQUFnTCxRQUFBLENBQUFyTCxHQUFBLENBQUEsQ0FBQSxJQUFBcUwsUUFBQSxDQUFBckwsR0FBQSxFQUFBdUwsSUFBQSxFQUFBO0FBQUEsZ0NBQ0FGLFFBQUEsQ0FBQXJMLEdBQUEsSUFBQTBFLE1BQUEsQ0FBQXJCLFdBQUEsQ0FBQStILFVBQUEsRUFBQUMsUUFBQSxDQUFBckwsR0FBQSxFQUFBdUwsSUFBQSxDQUFBQyxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLGdDQUVBcEMsZ0JBQUEsQ0FBQWlDLFFBQUEsQ0FBQXJMLEdBQUEsQ0FBQSxFQUFBb0wsVUFBQSxFQUZBO0FBQUEsNkJBQUEsTUFHQSxJQUNBLE9BQUFDLFFBQUEsQ0FBQXJMLEdBQUEsQ0FBQSxLQUFBLFFBQUEsSUFDQUksS0FBQSxDQUFBQyxPQUFBLENBQUFnTCxRQUFBLENBQUFyTCxHQUFBLENBQUEsQ0FEQSxJQUVBO0FBQUEsb0NBQUEsT0FBQTtBQUFBLG9DQUFBLE9BQUE7QUFBQSxrQ0FBQStELE9BQUEsQ0FBQS9ELEdBQUEsS0FBQSxDQUhBLEVBSUE7QUFBQSxnQ0FDQTNDLENBQUEsQ0FBQXdDLE9BQUEsQ0FBQXdMLFFBQUEsQ0FBQXJMLEdBQUEsQ0FBQSxFQUFBLFVBQUFYLEtBQUEsRUFBQWlDLEtBQUEsRUFBQTtBQUFBLG9DQUNBLElBQUFqQyxLQUFBLENBQUFrTSxJQUFBLEVBQUE7QUFBQSx3Q0FDQUYsUUFBQSxDQUFBckwsR0FBQSxFQUFBc0IsS0FBQSxJQUFBb0QsTUFBQSxDQUFBckIsV0FBQSxDQUFBK0gsVUFBQSxFQUFBL0wsS0FBQSxDQUFBa00sSUFBQSxDQUFBQyxTQUFBLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLHdDQUVBcEMsZ0JBQUEsQ0FBQWlDLFFBQUEsQ0FBQXJMLEdBQUEsQ0FBQSxFQUFBb0wsVUFBQSxFQUZBO0FBQUEscUNBREE7QUFBQSxpQ0FBQSxFQURBO0FBQUEsNkJBUkE7QUFBQSw0QkFnQkEsSUFBQSxPQUFBQyxRQUFBLENBQUFyTCxHQUFBLENBQUEsS0FBQSxRQUFBLElBQUEsQ0FBQUksS0FBQSxDQUFBQyxPQUFBLENBQUFnTCxRQUFBLENBQUFyTCxHQUFBLENBQUEsQ0FBQSxJQUFBcUwsUUFBQSxDQUFBckwsR0FBQSxNQUFBLE9BQUEsRUFBQTtBQUFBLGdDQUNBb0osZ0JBQUEsQ0FBQWlDLFFBQUEsQ0FBQXJMLEdBQUEsQ0FBQSxFQUFBb0wsVUFBQSxFQURBO0FBQUEsNkJBaEJBO0FBQUEseUJBREE7QUFBQSxxQkFEQTtBQUFBLG9CQXVCQSxPQUFBQyxRQUFBLENBdkJBO0FBQUEsaUJBbFVBO0FBQUEsZ0JBa1dBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUFBdEssb0JBQUEsQ0FBQWhDLElBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFSLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBa04sU0FBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQW5MLE1BQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxvQkFLQSxJQUFBbUwsU0FBQSxHQUFBMU0sSUFBQSxDQUFBRSxRQUFBLENBQUEsZUFBQSxFQUFBSSxLQUFBLEVBQUEsRUFBQTtBQUFBLHdCQUNBaEMsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBNEwsU0FBQSxFQUFBLFVBQUFDLE9BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsNEJBQ0FyTCxNQUFBLENBQUFxTCxNQUFBLElBQUFwTixJQUFBLENBQUE4SyxnQkFBQSxDQUFBcUMsT0FBQSxDQUFBLENBREE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBTEE7QUFBQSxvQkFVQSxPQUFBcEwsTUFBQSxDQVZBO0FBQUEsaUJBbFdBO0FBQUEsZ0JBc1lBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQStJLGdCQUFBLENBQUFxQyxPQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBbk4sSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFvQixRQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsb0JBSUEsSUFBQVMsS0FBQSxDQUFBQyxPQUFBLENBQUFxTCxPQUFBLENBQUEzTSxJQUFBLENBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUE2TSxTQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsd0JBRUF2TyxDQUFBLENBQUF3QyxPQUFBLENBQUE2TCxPQUFBLENBQUEzTSxJQUFBLEVBQUEsVUFBQThNLE9BQUEsRUFBQTtBQUFBLDRCQUNBRCxTQUFBLENBQUFoUCxJQUFBLENBQUE7QUFBQSxnQ0FDQThCLEdBQUEsRUFBQUgsSUFBQSxDQUFBSSxjQUFBLENBQUErTSxPQUFBLENBQUEvTixLQUFBLENBQUFZLElBQUEsRUFBQTtBQUFBLG9DQUFBK0QsSUFBQSxFQUFBL0QsSUFBQSxDQUFBZ0UsT0FBQSxDQUFBQyxpQkFBQTtBQUFBLG9DQUFBQyxFQUFBLEVBQUFvSixPQUFBLENBQUFwSixFQUFBO0FBQUEsaUNBQUEsQ0FEQTtBQUFBLDZCQUFBLEVBREE7QUFBQSx5QkFBQSxFQUZBO0FBQUEsd0JBT0E5QyxRQUFBLEdBQUFpTSxTQUFBLENBUEE7QUFBQSxxQkFBQSxNQVNBO0FBQUEsd0JBQ0EsSUFBQSxDQUFBdk8sQ0FBQSxDQUFBeUUsT0FBQSxDQUFBNEosT0FBQSxDQUFBL04sS0FBQSxDQUFBLElBQUEsQ0FBQU4sQ0FBQSxDQUFBeUUsT0FBQSxDQUFBNEosT0FBQSxDQUFBM00sSUFBQSxDQUFBLEVBQUE7QUFBQSw0QkFDQVksUUFBQSxHQUFBLENBQUE7QUFBQSxvQ0FDQWpCLEdBQUEsRUFBQUgsSUFBQSxDQUFBSSxjQUFBLENBQUErTSxPQUFBLENBQUEvTixLQUFBLENBQUFZLElBQUEsRUFBQTtBQUFBLHdDQUFBK0QsSUFBQSxFQUFBL0QsSUFBQSxDQUFBZ0UsT0FBQSxDQUFBQyxpQkFBQTtBQUFBLHdDQUFBQyxFQUFBLEVBQUFpSixPQUFBLENBQUEzTSxJQUFBLENBQUEwRCxFQUFBO0FBQUEscUNBQUEsQ0FEQTtBQUFBLGlDQUFBLENBQUEsQ0FEQTtBQUFBLHlCQUFBLE1BSUE7QUFBQSw0QkFDQTlDLFFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSx5QkFMQTtBQUFBLHFCQWJBO0FBQUEsb0JBc0JBLE9BQUFBLFFBQUEsQ0F0QkE7QUFBQSxpQkF0WUE7QUFBQSxnQkFxYkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQW1NLDRCQUFBLENBQUFDLGlCQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBekwsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUdBakQsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBa00saUJBQUEsRUFBQSxVQUFBdEUsR0FBQSxFQUFBO0FBQUEsd0JBQ0FwSyxDQUFBLENBQUF3QyxPQUFBLENBQUE0SCxHQUFBLEVBQUEsVUFBQUQsR0FBQSxFQUFBO0FBQUEsNEJBQ0FuSyxDQUFBLENBQUF3QyxPQUFBLENBQUEySCxHQUFBLEVBQUEsVUFBQWtFLE9BQUEsRUFBQTtBQUFBLGdDQUVBcEwsTUFBQSxDQUFBMUQsSUFBQSxDQUFBOE8sT0FBQSxDQUFBaE4sR0FBQSxFQUZBO0FBQUEsNkJBQUEsRUFEQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFBQSxFQUhBO0FBQUEsb0JBYUEsT0FBQTRCLE1BQUEsQ0FiQTtBQUFBLGlCQXJiQTtBQUFBLGdCQTJjQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBQVUsY0FBQSxDQUFBK0ssaUJBQUEsRUFBQXZOLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFELElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxvQkFHQUEsSUFBQSxDQUFBeUQsZUFBQSxDQUFBOEosNEJBQUEsQ0FBQUMsaUJBQUEsQ0FBQSxFQUFBLFVBQUFySyxTQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBcEIsTUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHdCQUdBakQsQ0FBQSxDQUFBd0MsT0FBQSxDQUFBa00saUJBQUEsRUFBQSxVQUFBdEUsR0FBQSxFQUFBdUUsSUFBQSxFQUFBO0FBQUEsNEJBQ0ExTCxNQUFBLENBQUEwTCxJQUFBLElBQUExTCxNQUFBLENBQUEwTCxJQUFBLEtBQUEsRUFBQSxDQURBO0FBQUEsNEJBRUEzTyxDQUFBLENBQUF3QyxPQUFBLENBQUE0SCxHQUFBLEVBQUEsVUFBQUQsR0FBQSxFQUFBeUUsSUFBQSxFQUFBO0FBQUEsZ0NBQ0EzTCxNQUFBLENBQUEwTCxJQUFBLEVBQUFDLElBQUEsSUFBQTNMLE1BQUEsQ0FBQTBMLElBQUEsRUFBQUMsSUFBQSxLQUFBLEVBQUEsQ0FEQTtBQUFBLGdDQUVBNU8sQ0FBQSxDQUFBd0MsT0FBQSxDQUFBMkgsR0FBQSxFQUFBLFVBQUFrRSxPQUFBLEVBQUFRLFFBQUEsRUFBQTtBQUFBLG9DQUNBNUwsTUFBQSxDQUFBMEwsSUFBQSxFQUFBQyxJQUFBLEVBQUFDLFFBQUEsSUFBQXhLLFNBQUEsQ0FBQWdLLE9BQUEsQ0FBQWhOLEdBQUEsQ0FBQSxDQURBO0FBQUEsaUNBQUEsRUFGQTtBQUFBLDZCQUFBLEVBRkE7QUFBQSx5QkFBQSxFQUhBO0FBQUEsd0JBYUFGLFFBQUEsQ0FBQThCLE1BQUEsRUFiQTtBQUFBLHFCQUFBLEVBSEE7QUFBQSxpQkEzY0E7QUFBQSxhQVZBO0FBQUEsUztRQ0ZBNUQsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxPQUFBLENBQUEsb0JBQUEsRUFBQW9QLGdCQUFBLEU7UUFDQUEsZ0JBQUEsQ0FBQWpQLE9BQUEsR0FBQSxDQUFBLE9BQUEsQ0FBQSxDO1FBQ0EsU0FBQWlQLGdCQUFBLENBQUFDLEtBQUEsRUFBQTtBQUFBLFlBQ0EsT0FBQSxVQUFBeEwsR0FBQSxFQUFBb0MsSUFBQSxFQUFBcUosS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQXpOLE1BQUEsR0FBQTtBQUFBLG9CQUNBME4sTUFBQSxFQUFBdEosSUFBQSxDQUFBc0osTUFEQTtBQUFBLG9CQUVBNU4sR0FBQSxFQUFBc0UsSUFBQSxDQUFBakIsSUFGQTtBQUFBLG9CQUdBaEQsSUFBQSxFQUFBc04sS0FBQSxDQUFBOU8sS0FIQTtBQUFBLGlCQUFBLENBREE7QUFBQSxnQkFPQThPLEtBQUEsQ0FBQUUsVUFBQSxDQUFBLG9CQUFBLEVBUEE7QUFBQSxnQkFRQSxJQUFBLENBQUFGLEtBQUEsQ0FBQUcsU0FBQSxDQUFBdlAsUUFBQSxDQUFBd1AsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxLQUFBLENBREE7QUFBQSxpQkFSQTtBQUFBLGdCQVlBTCxLQUFBLENBQUF4TixNQUFBLEVBQUE4TixJQUFBLENBQUFDLG1CQUFBLEVBQUFDLGlCQUFBLEVBWkE7QUFBQSxnQkFjQSxTQUFBRCxtQkFBQSxHQUFBO0FBQUEsb0JBQ0EvTCxHQUFBLENBQUE5QyxXQUFBLENBQUEsVUFBQUwsSUFBQSxFQUFBO0FBQUEsd0JBQ0E0TyxLQUFBLENBQUEzTyxNQUFBLEdBQUFELElBQUEsQ0FBQUMsTUFBQSxDQURBO0FBQUEsd0JBRUEyTyxLQUFBLENBQUE1TyxJQUFBLEdBQUFBLElBQUEsQ0FBQUEsSUFBQSxDQUZBO0FBQUEsd0JBR0E0TyxLQUFBLENBQUE5TyxLQUFBLEdBQUFFLElBQUEsQ0FBQUYsS0FBQSxDQUhBO0FBQUEsd0JBS0E4TyxLQUFBLENBQUFRLE1BQUEsQ0FBQWpRLElBQUEsQ0FBQTtBQUFBLDRCQUNBMEYsSUFBQSxFQUFBLFNBREE7QUFBQSw0QkFFQXdLLEdBQUEsRUFBQWxNLEdBQUEsQ0FBQWtJLFVBQUEsQ0FBQSxnQkFBQSxDQUZBO0FBQUEseUJBQUEsRUFMQTtBQUFBLHFCQUFBLEVBREE7QUFBQSxpQkFkQTtBQUFBLGdCQTJCQSxTQUFBOEQsaUJBQUEsQ0FBQWhGLEdBQUEsRUFBQTtBQUFBLG9CQUNBeUUsS0FBQSxDQUFBUSxNQUFBLENBQUFqUSxJQUFBLENBQUE7QUFBQSx3QkFDQTBGLElBQUEsRUFBQSxRQURBO0FBQUEsd0JBRUF3SyxHQUFBLEVBQUFsRixHQUFBLENBQUFtRixVQUFBLElBQUFuTSxHQUFBLENBQUFrSSxVQUFBLENBQUEsYUFBQSxDQUZBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQTNCQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFM7UUNGQXBNLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQUksT0FBQSxDQUFBLG9CQUFBLEVBQUFpUSxnQkFBQSxFO1FBQ0FBLGdCQUFBLENBQUE5UCxPQUFBLEdBQUE7QUFBQSxZQUFBLE9BQUE7QUFBQSxZQUFBLFdBQUE7QUFBQSxZQUFBLFVBQUE7QUFBQSxTQUFBLEM7UUFDQSxTQUFBOFAsZ0JBQUEsQ0FBQVosS0FBQSxFQUFBeEYsU0FBQSxFQUFBM0osUUFBQSxFQUFBO0FBQUEsWUFDQSxPQUFBLFVBQUEyRCxHQUFBLEVBQUFvQyxJQUFBLEVBQUFxSixLQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBek4sTUFBQSxHQUFBO0FBQUEsb0JBQ0EwTixNQUFBLEVBQUF0SixJQUFBLENBQUFzSixNQURBO0FBQUEsb0JBRUE1TixHQUFBLEVBQUFzRSxJQUFBLENBQUFqQixJQUZBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQU1BcUssS0FBQSxDQUFBeE4sTUFBQSxFQUFBOE4sSUFBQSxDQUFBTyxtQkFBQSxFQUFBQyxpQkFBQSxFQU5BO0FBQUEsZ0JBUUEsU0FBQUQsbUJBQUEsR0FBQTtBQUFBLG9CQUNBLElBQUFyTSxHQUFBLFlBQUFnRyxTQUFBLEVBQUE7QUFBQSx3QkFDQWhHLEdBQUEsQ0FBQXNHLFlBQUEsQ0FBQSxVQUFBaUcsS0FBQSxFQUFBO0FBQUEsNEJBQ0FkLEtBQUEsQ0FBQXJGLElBQUEsR0FBQW1HLEtBQUEsQ0FBQW5HLElBQUEsQ0FEQTtBQUFBLDRCQUVBcUYsS0FBQSxDQUFBcEYsT0FBQSxHQUFBa0csS0FBQSxDQUFBbEcsT0FBQSxDQUZBO0FBQUEsNEJBR0FvRixLQUFBLENBQUExTyxLQUFBLEdBQUF3UCxLQUFBLENBQUF4UCxLQUFBLENBSEE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBQUEsTUFNQSxJQUFBaUQsR0FBQSxZQUFBM0QsUUFBQSxFQUFBO0FBQUEsd0JBQ0FvUCxLQUFBLENBQUFlLFFBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxxQkFQQTtBQUFBLG9CQVdBZixLQUFBLENBQUFRLE1BQUEsQ0FBQWpRLElBQUEsQ0FBQTtBQUFBLHdCQUNBMEYsSUFBQSxFQUFBLFNBREE7QUFBQSx3QkFFQXdLLEdBQUEsRUFBQWxNLEdBQUEsQ0FBQWtJLFVBQUEsQ0FBQSxnQkFBQSxDQUZBO0FBQUEscUJBQUEsRUFYQTtBQUFBLGlCQVJBO0FBQUEsZ0JBMEJBLFNBQUFvRSxpQkFBQSxDQUFBdEYsR0FBQSxFQUFBO0FBQUEsb0JBQ0F5RSxLQUFBLENBQUFRLE1BQUEsQ0FBQWpRLElBQUEsQ0FBQTtBQUFBLHdCQUNBMEYsSUFBQSxFQUFBLFFBREE7QUFBQSx3QkFFQXdLLEdBQUEsRUFBQWxGLEdBQUEsQ0FBQW1GLFVBQUEsSUFBQW5NLEdBQUEsQ0FBQWtJLFVBQUEsQ0FBQSxhQUFBLENBRkE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBMUJBO0FBQUEsYUFBQSxDQURBO0FBQUEsUztRQ0ZBcE0sT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBSSxPQUFBLENBQUEsa0JBQUEsRUFBQXNRLGNBQUEsRTtRQUNBQSxjQUFBLENBQUFuUSxPQUFBLEdBQUEsQ0FBQSxXQUFBLENBQUEsQztRQUNBLFNBQUFtUSxjQUFBLENBQUFDLFNBQUEsRUFBQTtBQUFBLFlBQ0EsT0FBQSxVQUFBMU0sR0FBQSxFQUFBb0MsSUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQXVLLFlBQUEsR0FBQXZLLElBQUEsQ0FBQXdLLFVBQUEsQ0FBQXpPLElBQUEsQ0FBQW9CLGFBQUEsQ0FBQSxNQUFBLENBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUFzTixVQUFBLEdBQUFGLFlBQUEsQ0FBQWhLLE9BQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQW1LLEtBQUEsRUFBQUMsRUFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQTNLLElBQUEsQ0FBQTRLLFdBQUEsQ0FBQXpOLGFBQUEsQ0FBQXdOLEVBQUEsQ0FBQSxDQURBO0FBQUEsaUJBQUEsQ0FBQSxDQUZBO0FBQUEsZ0JBTUFMLFNBQUEsQ0FBQTVPLEdBQUEsQ0FBQStPLFVBQUEsRUFOQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFM7UUNEQTtBQUFBLFFBQUEvUSxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFtTCxRQUFBLENBQUEsY0FBQSxFQUFBK0YsV0FBQSxFO1FBQ0FBLFdBQUEsQ0FBQTNRLE9BQUEsR0FBQSxFQUFBLEM7UUFDQSxTQUFBMlEsV0FBQSxHQUFBO0FBQUEsWUFFQSxJQUFBL0YsUUFBQSxHQUFBO0FBQUEsZ0JBQ0FnRyxPQUFBLEVBQUEsRUFEQTtBQUFBLGdCQUVBL0YsSUFBQSxFQUFBZ0csY0FGQTtBQUFBLGFBQUEsQ0FGQTtBQUFBLFlBT0FBLGNBQUEsQ0FBQTdRLE9BQUEsR0FBQTtBQUFBLGdCQUFBLGtCQUFBO0FBQUEsZ0JBQUEsb0JBQUE7QUFBQSxnQkFBQSxvQkFBQTtBQUFBLGdCQUFBLG9CQUFBO0FBQUEsYUFBQSxDQVBBO0FBQUEsWUFRQSxPQUFBNEssUUFBQSxDQVJBO0FBQUEsWUFVQSxTQUFBaUcsY0FBQSxDQUFBQyxVQUFBLEVBQUFDLFlBQUEsRUFBQUMsWUFBQSxFQUFBQyxZQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLHFCQUFBTCxPQUFBLEdBQUE7QUFBQSxvQkFDQU0sVUFBQSxFQUFBSixVQURBO0FBQUEsb0JBRUFLLFVBQUEsRUFBQUwsVUFGQTtBQUFBLG9CQUdBTSxRQUFBLEVBQUFOLFVBSEE7QUFBQSxvQkFJQU8sSUFBQSxFQUFBUCxVQUpBO0FBQUEsb0JBS0FRLE1BQUEsRUFBQVAsWUFMQTtBQUFBLG9CQU1BUSxNQUFBLEVBQUFQLFlBTkE7QUFBQSxvQkFPQWxFLE1BQUEsRUFBQW1FLFlBUEE7QUFBQSxpQkFBQSxDQUZBO0FBQUEsZ0JBV0EsT0FBQTtBQUFBLG9CQUNBTyxNQUFBLEVBQUEsVUFBQTlOLEdBQUEsRUFBQW9DLElBQUEsRUFBQXFKLEtBQUEsRUFBQTtBQUFBLHdCQUNBLEtBQUF5QixPQUFBLENBQUE5SyxJQUFBLENBQUF3SyxVQUFBLENBQUF6TyxJQUFBLENBQUFvQixhQUFBLENBQUEsS0FBQSxDQUFBLEVBQUFTLEdBQUEsRUFBQW9DLElBQUEsRUFBQXFKLEtBQUEsRUFEQTtBQUFBLHFCQUFBLENBRUFzQyxJQUZBLENBRUEsSUFGQSxDQURBO0FBQUEsaUJBQUEsQ0FYQTtBQUFBLGFBVkE7QUFBQSxTO1FDSEFqUyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLE9BQUEsQ0FBQSxvQkFBQSxFQUFBNlIsZ0JBQUEsRTtRQUNBQSxnQkFBQSxDQUFBMVIsT0FBQSxHQUFBO0FBQUEsWUFBQSxPQUFBO0FBQUEsWUFBQSxhQUFBO0FBQUEsU0FBQSxDO1FBQ0EsU0FBQTBSLGdCQUFBLENBQUF4QyxLQUFBLEVBQUFqUCxVQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsVUFBQXlELEdBQUEsRUFBQW9DLElBQUEsRUFBQXFKLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUF6TixNQUFBLEdBQUE7QUFBQSxvQkFDQTBOLE1BQUEsRUFBQXRKLElBQUEsQ0FBQXNKLE1BREE7QUFBQSxvQkFFQTVOLEdBQUEsRUFBQXNFLElBQUEsQ0FBQWpCLElBRkE7QUFBQSxvQkFHQWhELElBQUEsRUFBQXNOLEtBQUEsQ0FBQTlPLEtBSEE7QUFBQSxpQkFBQSxDQURBO0FBQUEsZ0JBT0E4TyxLQUFBLENBQUFFLFVBQUEsQ0FBQSxvQkFBQSxFQVBBO0FBQUEsZ0JBUUEsSUFBQSxDQUFBRixLQUFBLENBQUFHLFNBQUEsQ0FBQXZQLFFBQUEsQ0FBQXdQLE1BQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUEsS0FBQSxDQURBO0FBQUEsaUJBUkE7QUFBQSxnQkFZQUwsS0FBQSxDQUFBeE4sTUFBQSxFQUFBOE4sSUFBQSxDQUFBbUMsbUJBQUEsRUFBQUMsaUJBQUEsRUFaQTtBQUFBLGdCQWNBLFNBQUFELG1CQUFBLEdBQUE7QUFBQSxvQkFDQWpPLEdBQUEsQ0FBQTlDLFdBQUEsQ0FBQSxVQUFBTCxJQUFBLEVBQUE7QUFBQSx3QkFDQTRPLEtBQUEsQ0FBQTNPLE1BQUEsR0FBQUQsSUFBQSxDQUFBQyxNQUFBLENBREE7QUFBQSx3QkFFQTJPLEtBQUEsQ0FBQTVPLElBQUEsR0FBQUEsSUFBQSxDQUFBQSxJQUFBLENBRkE7QUFBQSx3QkFHQTRPLEtBQUEsQ0FBQTlPLEtBQUEsR0FBQUUsSUFBQSxDQUFBRixLQUFBLENBSEE7QUFBQSx3QkFJQThPLEtBQUEsQ0FBQVEsTUFBQSxDQUFBalEsSUFBQSxDQUFBO0FBQUEsNEJBQ0EwRixJQUFBLEVBQUEsU0FEQTtBQUFBLDRCQUVBd0ssR0FBQSxFQUFBbE0sR0FBQSxDQUFBa0ksVUFBQSxDQUFBLGdCQUFBLENBRkE7QUFBQSx5QkFBQSxFQUpBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQWRBO0FBQUEsZ0JBMEJBLFNBQUFnRyxpQkFBQSxDQUFBbEgsR0FBQSxFQUFBO0FBQUEsb0JBQ0F5RSxLQUFBLENBQUFRLE1BQUEsQ0FBQWpRLElBQUEsQ0FBQTtBQUFBLHdCQUNBMEYsSUFBQSxFQUFBLFFBREE7QUFBQSx3QkFFQXdLLEdBQUEsRUFBQWxGLEdBQUEsQ0FBQW1GLFVBQUEsSUFBQW5NLEdBQUEsQ0FBQWtJLFVBQUEsQ0FBQSxhQUFBLENBRkE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBMUJBO0FBQUEsYUFBQSxDQURBO0FBQUEsUztRQ0ZBcE0sT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBb1MsU0FBQSxDQUFBLFVBQUEsRUFBQUMsaUJBQUEsRTtRQUdBO0FBQUEsaUJBQUFBLGlCQUFBLEdBQUE7QUFBQSxZQUNBLElBQUFELFNBQUEsR0FBQTtBQUFBLGdCQUNBRSxRQUFBLEVBQUEsR0FEQTtBQUFBLGdCQUVBMUwsT0FBQSxFQUFBLElBRkE7QUFBQSxnQkFHQTJMLFVBQUEsRUFBQUMscUJBSEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQU9BQSxxQkFBQSxDQUFBalMsT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLFVBQUE7QUFBQSxnQkFBQSxjQUFBO0FBQUEsYUFBQSxDQVBBO0FBQUEsWUFTQSxPQUFBNlIsU0FBQSxDQVRBO0FBQUEsWUFXQSxTQUFBSSxxQkFBQSxDQUFBQyxNQUFBLEVBQUFuUyxRQUFBLEVBQUE0USxXQUFBLEVBQUE7QUFBQSxnQkFDQXVCLE1BQUEsQ0FBQXZDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxnQkFHQXVDLE1BQUEsQ0FBQTVDLFNBQUEsR0FBQSxFQUNBdlAsUUFBQSxFQUFBLEVBREEsRUFBQSxDQUhBO0FBQUEsZ0JBT0FtUyxNQUFBLENBQUFDLFlBQUEsR0FBQSxVQUFBaEQsS0FBQSxFQUFBO0FBQUEsb0JBQ0ErQyxNQUFBLENBQUE1QyxTQUFBLEdBQUFILEtBQUEsQ0FEQTtBQUFBLGlCQUFBLENBUEE7QUFBQSxnQkFXQSxJQUFBaUQsUUFBQSxHQUFBLElBQUFyUyxRQUFBLENBQUFtUyxNQUFBLENBQUFHLFNBQUEsQ0FBQSxDQVhBO0FBQUEsZ0JBYUFELFFBQUEsQ0FBQXhSLFdBQUEsQ0FBQSxVQUFBTCxJQUFBLEVBQUE7QUFBQSxvQkFDQTJSLE1BQUEsQ0FBQTFSLE1BQUEsR0FBQUQsSUFBQSxDQUFBQyxNQUFBLENBREE7QUFBQSxvQkFFQTBSLE1BQUEsQ0FBQTNSLElBQUEsR0FBQUEsSUFBQSxDQUFBQSxJQUFBLENBRkE7QUFBQSxvQkFHQTJSLE1BQUEsQ0FBQTdSLEtBQUEsR0FBQUUsSUFBQSxDQUFBRixLQUFBLENBSEE7QUFBQSxvQkFJQTZSLE1BQUEsQ0FBQXpSLEtBQUEsR0FBQUYsSUFBQSxDQUFBRSxLQUFBLENBSkE7QUFBQSxvQkFLQXlSLE1BQUEsQ0FBQUksT0FBQSxHQUxBO0FBQUEsaUJBQUEsRUFiQTtBQUFBLGdCQXFCQUosTUFBQSxDQUFBSyxJQUFBLEdBQUEsVUFBQUMsTUFBQSxFQUFBalMsSUFBQSxFQUFBO0FBQUEsb0JBQ0FvUSxXQUFBLENBQUFhLE1BQUEsQ0FBQVksUUFBQSxFQUFBN1IsSUFBQSxDQUFBdUYsSUFBQSxFQUFBb00sTUFBQSxFQURBO0FBQUEsaUJBQUEsQ0FyQkE7QUFBQSxnQkF5QkFBLE1BQUEsQ0FBQU8sRUFBQSxHQUFBLFVBQUEzTSxJQUFBLEVBQUE7QUFBQSxvQkFDQTZLLFdBQUEsQ0FBQWEsTUFBQSxDQUFBWSxRQUFBLEVBQUF0TSxJQUFBLEVBQUFvTSxNQUFBLEVBREE7QUFBQSxpQkFBQSxDQXpCQTtBQUFBLGdCQTZCQUEsTUFBQSxDQUFBUSxVQUFBLEdBQUEsVUFBQXRPLEtBQUEsRUFBQTtBQUFBLG9CQUNBOE4sTUFBQSxDQUFBdkMsTUFBQSxDQUFBZ0QsTUFBQSxDQUFBdk8sS0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLGlCQUFBLENBN0JBO0FBQUEsYUFYQTtBQUFBLFM7UUNIQTVFLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLE1BQUEsRUFBQW9TLFNBQUEsQ0FBQSxXQUFBLEVBQUFlLGtCQUFBLEU7UUFFQUEsa0JBQUEsQ0FBQTVTLE9BQUEsR0FBQTtBQUFBLFlBQUEsV0FBQTtBQUFBLFlBQUEsY0FBQTtBQUFBLFNBQUEsQztRQUVBLFNBQUE0UyxrQkFBQSxDQUFBbEosU0FBQSxFQUFBaUgsV0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBa0IsU0FBQSxHQUFBO0FBQUEsZ0JBQ0FFLFFBQUEsRUFBQSxHQURBO0FBQUEsZ0JBRUFDLFVBQUEsRUFBQWEsc0JBRkE7QUFBQSxhQUFBLENBREE7QUFBQSxZQU1BQSxzQkFBQSxDQUFBN1MsT0FBQSxHQUFBO0FBQUEsZ0JBQUEsVUFBQTtBQUFBLGdCQUFBLFFBQUE7QUFBQSxhQUFBLENBTkE7QUFBQSxZQVFBLE9BQUE2UixTQUFBLENBUkE7QUFBQSxZQVVBLFNBQUFnQixzQkFBQSxDQUFBM1MsUUFBQSxFQUFBZ1MsTUFBQSxFQUFBO0FBQUEsZ0JBRUE7QUFBQSxvQkFBQVksU0FBQSxHQUFBLElBQUFwSixTQUFBLENBQUF3SSxNQUFBLENBQUFHLFNBQUEsQ0FBQSxDQUZBO0FBQUEsZ0JBSUFILE1BQUEsQ0FBQXZDLE1BQUEsR0FBQSxFQUFBLENBSkE7QUFBQSxnQkFLQXVDLE1BQUEsQ0FBQVksU0FBQSxHQUFBQSxTQUFBLENBTEE7QUFBQSxnQkFPQTVTLFFBQUEsQ0FBQSxZQUFBO0FBQUEsb0JBQ0FnUyxNQUFBLENBQUE3QyxVQUFBLENBQUEsa0JBQUEsRUFEQTtBQUFBLG9CQUdBeUQsU0FBQSxDQUFBOUksWUFBQSxDQUFBLFVBQUFpRyxLQUFBLEVBQUE7QUFBQSx3QkFDQWlDLE1BQUEsQ0FBQXBJLElBQUEsR0FBQW1HLEtBQUEsQ0FBQW5HLElBQUEsQ0FEQTtBQUFBLHdCQUVBb0ksTUFBQSxDQUFBbkksT0FBQSxHQUFBa0csS0FBQSxDQUFBbEcsT0FBQSxDQUZBO0FBQUEsd0JBR0FtSSxNQUFBLENBQUF6UixLQUFBLEdBQUF3UCxLQUFBLENBQUF4UCxLQUFBLENBSEE7QUFBQSx3QkFLQXlSLE1BQUEsQ0FBQTdDLFVBQUEsQ0FBQSxZQUFBLEVBTEE7QUFBQSxxQkFBQSxFQUhBO0FBQUEsaUJBQUEsRUFQQTtBQUFBLGdCQW9CQTZDLE1BQUEsQ0FBQUssSUFBQSxHQUFBLFVBQUF6TSxJQUFBLEVBQUE7QUFBQSxvQkFDQTZLLFdBQUEsQ0FBQWEsTUFBQSxDQUFBc0IsU0FBQSxFQUFBaE4sSUFBQSxFQUFBb00sTUFBQSxFQURBO0FBQUEsaUJBQUEsQ0FwQkE7QUFBQSxnQkF3QkFBLE1BQUEsQ0FBQVEsVUFBQSxHQUFBLFVBQUF0TyxLQUFBLEVBQUE7QUFBQSxvQkFDQThOLE1BQUEsQ0FBQXZDLE1BQUEsQ0FBQWdELE1BQUEsQ0FBQXZPLEtBQUEsRUFBQSxDQUFBLEVBREE7QUFBQSxpQkFBQSxDQXhCQTtBQUFBLGFBVkE7QUFBQSxTO1FDSkE1RSxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFvUyxTQUFBLENBQUEsaUJBQUEsRUFBQWtCLHdCQUFBLEU7UUFFQUEsd0JBQUEsQ0FBQS9TLE9BQUEsR0FBQSxFQUFBLEM7UUFFQSxTQUFBK1Msd0JBQUEsR0FBQTtBQUFBLFlBQ0EsSUFBQWxCLFNBQUEsR0FBQTtBQUFBLGdCQUNBMUMsS0FBQSxFQUFBLEVBQ0EyRCxTQUFBLEVBQUEsUUFEQSxFQURBO0FBQUEsZ0JBSUFFLE9BQUEsRUFBQSxZQUpBO0FBQUEsZ0JBS0FDLFdBQUEsRUFBQSxzQ0FMQTtBQUFBLGdCQU1BbEIsUUFBQSxFQUFBLEdBTkE7QUFBQSxnQkFPQUMsVUFBQSxFQUFBa0IsbUJBUEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQVdBQSxtQkFBQSxDQUFBbFQsT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLFdBQUE7QUFBQSxhQUFBLENBWEE7QUFBQSxZQWFBLE9BQUE2UixTQUFBLENBYkE7QUFBQSxZQWVBLFNBQUFxQixtQkFBQSxDQUFBaEIsTUFBQSxFQUFBOUIsU0FBQSxFQUFBO0FBQUEsZ0JBR0E7QUFBQSxvQkFBQXhHLFVBQUEsR0FBQXNJLE1BQUEsQ0FBQVksU0FBQSxDQUFBbEosVUFBQSxDQUhBO0FBQUEsZ0JBS0FzSSxNQUFBLENBQUFpQixHQUFBLENBQUEsa0JBQUEsRUFBQSxZQUFBO0FBQUEsb0JBQ0F2SixVQUFBLENBQUF4QixjQUFBLENBQUFnSSxTQUFBLENBQUFnRCxNQUFBLEdBQUFDLElBQUEsRUFEQTtBQUFBLGlCQUFBLEVBTEE7QUFBQSxnQkFTQW5CLE1BQUEsQ0FBQWlCLEdBQUEsQ0FBQSxZQUFBLEVBQUEsWUFBQTtBQUFBLG9CQUNBakIsTUFBQSxDQUFBb0IsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLG9CQUVBcEIsTUFBQSxDQUFBcUIsYUFBQSxHQUZBO0FBQUEsaUJBQUEsRUFUQTtBQUFBLGdCQWNBckIsTUFBQSxDQUFBcUIsYUFBQSxHQUFBLFlBQUE7QUFBQSxvQkFDQXJCLE1BQUEsQ0FBQXNCLFVBQUEsR0FBQTVKLFVBQUEsQ0FBQTVCLGFBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUFrSyxNQUFBLENBQUF2SyxXQUFBLEdBQUFpQyxVQUFBLENBQUF2QixjQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUdBNkosTUFBQSxDQUFBdUIsWUFBQSxHQUFBN0osVUFBQSxDQUFBMUIsVUFBQSxFQUFBLENBSEE7QUFBQSxpQkFBQSxDQWRBO0FBQUEsZ0JBb0JBZ0ssTUFBQSxDQUFBd0IsV0FBQSxHQUFBLFVBQUFDLE1BQUEsRUFBQTtBQUFBLG9CQUNBL0osVUFBQSxDQUFBeEIsY0FBQSxDQUFBdUwsTUFBQSxFQURBO0FBQUEsb0JBRUF6QixNQUFBLENBQUF2SyxXQUFBLEdBQUFpQyxVQUFBLENBQUF2QixjQUFBLEVBQUEsQ0FGQTtBQUFBLG9CQUdBK0gsU0FBQSxDQUFBZ0QsTUFBQSxDQUFBLE1BQUEsRUFBQU8sTUFBQSxFQUhBO0FBQUEsaUJBQUEsQ0FwQkE7QUFBQSxhQWZBO0FBQUEsUztRQ0pBblUsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBb1MsU0FBQSxDQUFBLFlBQUEsRUFBQStCLGtCQUFBLEU7UUFFQUEsa0JBQUEsQ0FBQTVULE9BQUEsR0FBQSxFQUFBLEM7UUFFQSxTQUFBNFQsa0JBQUEsR0FBQTtBQUFBLFlBQ0EsSUFBQS9CLFNBQUEsR0FBQTtBQUFBLGdCQUNBMUMsS0FBQSxFQUFBLEVBQ0EyRCxTQUFBLEVBQUEsUUFEQSxFQURBO0FBQUEsZ0JBSUFFLE9BQUEsRUFBQSxZQUpBO0FBQUEsZ0JBS0FDLFdBQUEsRUFBQSxnQ0FMQTtBQUFBLGdCQU1BbEIsUUFBQSxFQUFBLEdBTkE7QUFBQSxnQkFPQUMsVUFBQSxFQUFBNkIsYUFQQTtBQUFBLGdCQVFBL04sSUFBQSxFQUFBLFVBQUFxSixLQUFBLEVBQUEyRSxPQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLGlCQVJBO0FBQUEsYUFBQSxDQURBO0FBQUEsWUFjQUYsYUFBQSxDQUFBN1QsT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLFdBQUE7QUFBQSxhQUFBLENBZEE7QUFBQSxZQWdCQSxPQUFBNlIsU0FBQSxDQWhCQTtBQUFBLFlBa0JBLFNBQUFnQyxhQUFBLENBQUEzQixNQUFBLEVBQUE5QixTQUFBLEVBQUE7QUFBQSxnQkFHQTtBQUFBLG9CQUFBdkcsT0FBQSxHQUFBcUksTUFBQSxDQUFBWSxTQUFBLENBQUFqSixPQUFBLENBSEE7QUFBQSxnQkFLQXFJLE1BQUEsQ0FBQWlCLEdBQUEsQ0FBQSxrQkFBQSxFQUFBLFlBQUE7QUFBQSxvQkFDQWEsT0FBQSxDQUFBQyxHQUFBLENBQUEscUJBQUEsRUFEQTtBQUFBLG9CQUVBQyxrQkFBQSxDQUFBOUQsU0FBQSxDQUFBZ0QsTUFBQSxFQUFBLEVBRkE7QUFBQSxpQkFBQSxFQUxBO0FBQUEsZ0JBVUFsQixNQUFBLENBQUFpQixHQUFBLENBQUEsWUFBQSxFQUFBLFlBQUE7QUFBQSxvQkFDQWpCLE1BQUEsQ0FBQW5JLE9BQUEsR0FBQW1JLE1BQUEsQ0FBQVksU0FBQSxDQUFBL0ksT0FBQSxDQURBO0FBQUEsb0JBRUFtSSxNQUFBLENBQUEvSSxVQUFBLEdBQUFVLE9BQUEsQ0FBQVYsVUFBQSxDQUZBO0FBQUEsb0JBR0ErSSxNQUFBLENBQUEzSSxVQUFBLEdBSEE7QUFBQSxpQkFBQSxFQVZBO0FBQUEsZ0JBZ0JBMkksTUFBQSxDQUFBM0ksVUFBQSxHQUFBLFlBQUE7QUFBQSxvQkFDQSxJQUFBTixLQUFBLEdBQUFZLE9BQUEsQ0FBQVQsU0FBQSxFQUFBLENBREE7QUFBQSxvQkFHQSxJQUFBSCxLQUFBLEVBQUE7QUFBQSx3QkFDQTlJLENBQUEsQ0FBQWdVLEtBQUEsQ0FBQSxLQUFBcEssT0FBQSxFQUFBLEVBQUEsaUJBQUFkLEtBQUEsRUFBQSxFQUFBLENBQUEsRUFBQVksT0FBQSxHQUFBQSxPQUFBLENBQUFYLFNBQUEsQ0FEQTtBQUFBLHFCQUhBO0FBQUEsaUJBQUEsQ0FoQkE7QUFBQSxnQkF3QkFnSixNQUFBLENBQUFrQyxNQUFBLEdBQUEsVUFBQUMsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQW5MLFNBQUEsQ0FEQTtBQUFBLG9CQUdBbUwsTUFBQSxDQUFBeEssT0FBQSxHQUFBWCxTQUFBLEdBQUFXLE9BQUEsQ0FBQVIsa0JBQUEsQ0FBQWdMLE1BQUEsQ0FBQXhLLE9BQUEsQ0FBQSxDQUhBO0FBQUEsb0JBSUFxSSxNQUFBLENBQUFZLFNBQUEsQ0FBQXZKLFVBQUEsQ0FBQThLLE1BQUEsQ0FBQTNPLGFBQUEsRUFBQXdELFNBQUEsRUFKQTtBQUFBLG9CQUtBa0gsU0FBQSxDQUFBZ0QsTUFBQSxDQUFBLE1BQUEsRUFBQWxCLE1BQUEsQ0FBQVksU0FBQSxDQUFBMUksb0JBQUEsRUFBQSxFQUxBO0FBQUEsaUJBQUEsQ0F4QkE7QUFBQSxnQkFpQ0EsU0FBQThKLGtCQUFBLENBQUE5UixNQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBeUgsT0FBQSxHQUFBcUksTUFBQSxDQUFBWSxTQUFBLENBQUFqSixPQUFBLENBREE7QUFBQSxvQkFHQSxJQUFBLENBQUF6SCxNQUFBLENBQUF5SCxPQUFBLENBQUFmLFNBQUEsQ0FBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQSxLQUFBLENBREE7QUFBQSxxQkFIQTtBQUFBLG9CQU1BLElBQUFsQyxHQUFBLEdBQUF4RSxNQUFBLENBQUF5SCxPQUFBLENBQUFmLFNBQUEsRUFBQXdMLFdBQUEsQ0FBQSxHQUFBLENBQUEsQ0FOQTtBQUFBLG9CQU9BLElBQUFyTCxLQUFBLEdBQUE3RyxNQUFBLENBQUF5SCxPQUFBLENBQUFmLFNBQUEsRUFBQS9CLEtBQUEsQ0FBQSxDQUFBLEVBQUFILEdBQUEsQ0FBQSxDQVBBO0FBQUEsb0JBUUEsSUFBQXNDLFNBQUEsR0FBQTlHLE1BQUEsQ0FBQXlILE9BQUEsQ0FBQWYsU0FBQSxFQUFBL0IsS0FBQSxDQUFBSCxHQUFBLEdBQUEsQ0FBQSxDQUFBLENBUkE7QUFBQSxvQkFVQWlELE9BQUEsQ0FBQU4sVUFBQSxDQUFBTixLQUFBLEVBQUFDLFNBQUEsRUFWQTtBQUFBLGlCQWpDQTtBQUFBLGFBbEJBO0FBQUEsUztRQ0pBMUosT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBb1MsU0FBQSxDQUFBLFNBQUEsRUFBQTBDLGdCQUFBLEU7UUFFQSxTQUFBQSxnQkFBQSxHQUFBO0FBQUEsWUFDQSxJQUFBMUMsU0FBQSxHQUFBO0FBQUEsZ0JBQ0FFLFFBQUEsRUFBQSxHQURBO0FBQUEsZ0JBRUF5QyxRQUFBLEVBQUEsdUNBRkE7QUFBQSxnQkFHQXJGLEtBQUEsRUFBQSxFQUNBa0QsU0FBQSxFQUFBLFlBREEsRUFIQTtBQUFBLGdCQU1BTCxVQUFBLEVBQUF5QyxvQkFOQTtBQUFBLGdCQU9BM08sSUFBQSxFQUFBLFVBQUFxSixLQUFBLEVBQUF1RixFQUFBLEVBQUFYLElBQUEsRUFBQVksSUFBQSxFQUFBO0FBQUEsaUJBUEE7QUFBQSxhQUFBLENBREE7QUFBQSxZQWFBRixvQkFBQSxDQUFBelUsT0FBQSxHQUFBLENBQUEsUUFBQSxDQUFBLENBYkE7QUFBQSxZQWVBLE9BQUE2UixTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBNEMsb0JBQUEsQ0FBQXZDLE1BQUEsRUFBQTtBQUFBLGdCQUNBQSxNQUFBLENBQUEwQyxjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUExQyxNQUFBLENBQUFHLFNBQUEsQ0FBQTNRLE1BQUEsQ0FBQTBELElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBakJBO0FBQUEsUztRQ0ZBNUYsT0FBQSxDQUFBQyxNQUFBLENBQUEsTUFBQSxFQUFBb1YsR0FBQSxDQUFBO0FBQUEsWUFBQSxnQkFBQTtBQUFBLFlBQUEsVUFBQUMsY0FBQSxFQUFBO0FBQUEsZ0JBQUFBLGNBQUEsQ0FBQUMsR0FBQSxDQUFBLDBCQUFBLEVBQUEsNGZBQUEsRUFBQTtBQUFBLGdCQUNBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLGdoQkFBQSxFQURBO0FBQUEsZ0JBRUFELGNBQUEsQ0FBQUMsR0FBQSxDQUFBLHNDQUFBLEVBQUEsMk1BQUEsRUFGQTtBQUFBLGdCQUdBRCxjQUFBLENBQUFDLEdBQUEsQ0FBQSwyQkFBQSxFQUFBLDByQ0FBQSxFQUhBO0FBQUEsYUFBQTtBQUFBLFNBQUEsRSIsImZpbGUiOiJncmlkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBWbXNHcmlkIHYwLjEuMSAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkKVxuICogQ29weXJpZ2h0IDIwMTUgVmVydGFNZWRpYSwgSW5jLlxuICogTGljZW5zZWQgdW5kZXIgTUlUIChodHRwczovL2dpdGh1Yi5jb20vVmVydGFNZWRpYS9hbmd1bGFyLWdyaWQvbWFzdGVyL0xJQ0VOU0UpXG4gKi9cblxudmFyIGRlcHMgPSBbXTtcbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCdzY2hlbWFGb3JtJyk7XG4gIGRlcHMucHVzaCgnc2NoZW1hRm9ybScpO1xufSBjYXRjaCAoZSkge31cblxudHJ5IHtcbiAgYW5ndWxhci5tb2R1bGUoJ3VpLmJvb3RzdHJhcCcpO1xuICBkZXBzLnB1c2goJ3VpLmJvb3RzdHJhcCcpO1xufSBjYXRjaCAoZSkge31cblxudmFyIHZtc0dyaWQgPSBhbmd1bGFyLm1vZHVsZSgnZ3JpZCcsIGRlcHMpO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGxvZGFzaDtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkRm9ybScsIGdyaWRGb3JtKTtcbmdyaWRGb3JtLiRpbmplY3QgPSBbJ2dyaWQtZW50aXR5JywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRGb3JtKGdyaWRFbnRpdHksICR0aW1lb3V0LCBfKSB7XG5cbiAgZnVuY3Rpb24gRm9ybShtb2RlbCkge1xuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuXG4gICAgdGhpcy5mb3JtID0gW107XG4gICAgdGhpcy5tb2RlbCA9IHt9O1xuICAgIHRoaXMuc2NoZW1hID0ge307XG4gICAgdGhpcy5saW5rcyA9IHt9O1xuICB9XG5cbiAgRm9ybS5wcm90b3R5cGUgPSBuZXcgZ3JpZEVudGl0eSgpO1xuXG4gIGFuZ3VsYXIuZXh0ZW5kKEZvcm0ucHJvdG90eXBlLCB7XG4gICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgIGdldENvbmZpZzogZ2V0Q29uZmlnLFxuICAgIF9nZXRFbnVtVmFsdWVzOiBfZ2V0RW51bVZhbHVlcyxcbiAgICBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zOiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zLFxuICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgIF9nZXRGb3JtQ29uZmlnOiBfZ2V0Rm9ybUNvbmZpZyxcbiAgICBfZ2V0RmllbGRzRm9ybTogX2dldEZpZWxkc0Zvcm0sXG4gICAgX2ZpZWxkc1RvRm9ybUZvcm1hdDogX2ZpZWxkc1RvRm9ybUZvcm1hdCxcbiAgICBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hOiBfZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hXG4gIH0pO1xuXG4gIHJldHVybiBGb3JtO1xuXG4gIGZ1bmN0aW9uIGdldENvbmZpZygpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZvcm06IHNlbGYuZm9ybSxcbiAgICAgIG1vZGVsOiBzZWxmLm1vZGVsLFxuICAgICAgc2NoZW1hOiBzZWxmLnNjaGVtYSxcbiAgICAgIGxpbmtzOiBzZWxmLmxpbmtzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Rm9ybUluZm8oY2FsbGJhY2spIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gc2VsZi5nZXRNb2RlbCgpO1xuICAgIHZhciB1cmw7XG5cbiAgICB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgbmV3RGF0YSA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzZWxmLm1lcmdlUmVsU2NoZW1hKG5ld0RhdGEuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgc2NoZW1hKTtcblxuICAgICAgc2VsZi5fZ2V0RmllbGRzRm9ybShkYXRhLCBmdW5jdGlvbihmaWVsZHMpIHtcblxuICAgICAgICBzZWxmLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICBzZWxmLnNjaGVtYSA9IHNjaGVtYVdpdGhvdXRSZWY7XG4gICAgICAgIHNlbGYubW9kZWwgPSBzZWxmLl9maWVsZHNUb0Zvcm1Gb3JtYXQoZmllbGRzKTtcblxuICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2FsbGJhY2tGb3JtQ29uZmlnKGNvbmZpZykge1xuICAgICAgICAgIHNlbGYuZm9ybSA9IGNvbmZpZztcblxuICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgc2VsZi5mb3JtID0gXy51bmlvbihzZWxmLmZvcm0sIHNlbGYuX2dldEZvcm1CdXR0b25CeVNjaGVtYShkYXRhLnByb3BlcnR5KCdkYXRhJykubGlua3MoKSkpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9KVxuXG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IG1vZGVsIGZvciByZW5kZXJpbmcgZm9ybVxuICAgKlxuICAgKiBAcGFyYW0gcmVzb3VyY2VcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBfZmllbGRzVG9Gb3JtRm9ybWF0KHJlc291cmNlKSB7XG4gICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgdmFyIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS52YWx1ZSgpO1xuXG4gICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpb25JdGVtLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKTtcbiAgICAgIH0pO1xuICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHkoa2V5KS5wcm9wZXJ0eVZhbHVlKCdkYXRhJykpKSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gZmllbGRzW2tleV1bMF07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGZvcm0gY29uZmlnIGZvciBBbmd1bGFyIHNjaGVtYSBmb3JtXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1Db25maWcoZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBzZWxmLl9jcmVhdGVUaXRsZU1hcChkYXRhLnByb3BlcnR5KCdkYXRhJyksIGZ1bmN0aW9uKHRpdGxlTWFwcykge1xuXG4gICAgICAvKnZhciBhdHRyaWJ1dGVzID0gc2VsZi5tZXJnZVJlbFNjaGVtYShcbiAgICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksXG4gICAgICAgIGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKClcbiAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7Ki9cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gZGF0YS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpLmRlZmluZWRQcm9wZXJ0aWVzKCk7XG5cbiAgICAgIF8uZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIG9iaiA9IHtrZXk6IGtleX07XG5cbiAgICAgICAgaWYgKHRpdGxlTWFwc1trZXldKSB7XG4gICAgICAgICAgb2JqLnRpdGxlTWFwID0gdGl0bGVNYXBzW2tleV1cbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICB9KTtcblxuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gX2dldEZpZWxkc0Zvcm0oZGF0YSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpZWxkcztcbiAgICB2YXIgaW5jbHVkZWQgPSBbXTtcblxuICAgIGZpZWxkcyA9IGRhdGEucHJvcGVydHkoJ2RhdGEnKTtcbiAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuXG4gICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgcmVsYXRpb25zaGlwczogXy5tYXBWYWx1ZXMocmVsYXRpb25SZXNvdXJjZXNbMF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICBfLmZvckVhY2gobiwgZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9KVxuICAgICAgfTtcblxuICAgICAgY2FsbGJhY2socmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGVudW0gdmFsdWVzIGZvciBzY2hlbWEgd2l0aCBhbGxPZlxuICAgKlxuICAgKiBAbmFtZSBGb3JtI19nZXRFbnVtVmFsdWVzXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEByZXR1cm5zIHt7fX1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9nZXRFbnVtVmFsdWVzKGRhdGEpIHtcbiAgICB2YXIgZW51bVZhbHVlcyA9IFtdO1xuXG4gICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgZW51bVZhbHVlcy5wdXNoKHZhbHVlLnByb3BlcnR5VmFsdWUoJ2lkJykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gIH1cblxuICBmdW5jdGlvbiBfZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcbiAgICB2YXIgcmVzb3VyY2VzID0gW107XG5cbiAgICBkYXRhLnByb3BlcnR5KCdyZWxhdGlvbnNoaXBzJykucHJvcGVydGllcyhmdW5jdGlvbihwcm9wZXJ0eU5hbWUsIHByb3BlcnR5RGF0YSkge1xuXG4gICAgICBpZiAoIV8uaXNFbXB0eShwcm9wZXJ0eURhdGEubGlua3MoJ3JlbGF0aW9uJykpKSB7XG4gICAgICAgIHJlc291cmNlcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLFxuICAgICAgICAgIGRhdGE6IHByb3BlcnR5RGF0YVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAocmVzb3VyY2VzLCAndXJsJyksIGZ1bmN0aW9uKGxvYWRSZXNvdXJjZXMpIHtcblxuICAgICAgXy5mb3JFYWNoKHJlc291cmNlcywgZnVuY3Rpb24oZW51bXMpIHtcblxuICAgICAgICB2YXIgcHJvcGVydHlEYXRhID0gZW51bXMuZGF0YTtcbiAgICAgICAgdmFyIGVudW1zRGF0YSA9IGxvYWRSZXNvdXJjZXNbZW51bXMudXJsXS5kYXRhO1xuXG4gICAgICAgIHZhciBzb3VyY2VFbnVtID0gc2VsZi5fZ2V0RW51bVZhbHVlcyhlbnVtc0RhdGEpO1xuXG4gICAgICAgIF8uZm9yRWFjaChzb3VyY2VFbnVtLCBmdW5jdGlvbihlbnVtSXRlbSkge1xuICAgICAgICAgIHZhciB1cmwgPSBzZWxmLmdldFJlc291cmNlVXJsKHByb3BlcnR5RGF0YS5saW5rcygncmVsYXRpb24nKVswXS5ocmVmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICAgIHNvdXJjZVRpdGxlTWFwcy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgICAgcmVsYXRpb25OYW1lOiBwcm9wZXJ0eURhdGEucGFyZW50S2V5KCksXG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lOiBwcm9wZXJ0eURhdGEuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNhbGxiYWNrKHNvdXJjZVRpdGxlTWFwcyk7XG5cbiAgICB9KTtcblxuICAgIC8qdmFyIGRhdGFBdHRyaWJ1dGVzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpO1xuICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICBfLmZvckVhY2goZGF0YS5yZWxhdGlvbnNoaXBzKCksIGZ1bmN0aW9uKGl0ZW0sIGtleSkge1xuXG4gICAgICB2YXIgcmVzb3VyY2VMaW5rID0gaXRlbS5saW5rcy5zZWxmO1xuICAgICAgLy92YXIgYXR0cmlidXRlTmFtZSA9IGRhdGFBdHRyaWJ1dGVzLnByb3BlcnR5KGtleSkuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLnByb3BlcnR5U2NoZW1hcyhrZXkpLnJlbGF0aW9uRmllbGQoKTtcbiAgICAgIHZhciBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmID0gc2VsZi5fcmVwbGFjZUZyb21GdWxsKFxuICAgICAgICBkYXRhQXR0cmlidXRlcy5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLFxuICAgICAgICBkb2N1bWVudFNjaGVtYVxuICAgICAgKVsncHJvcGVydGllcyddW2tleV07XG5cbiAgICAgIHZhciBzY2hlbWEgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmKTtcbiAgICAgIHZhciBzb3VyY2VFbnVtID0gc2VsZi5fZ2V0RW51bVZhbHVlcyhzY2hlbWEpO1xuXG4gICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24oZW51bUl0ZW0pIHtcbiAgICAgICAgdmFyIHVybCA9IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVzb3VyY2VMaW5rLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogZW51bUl0ZW19KTtcblxuICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZW51bUl0ZW06IGVudW1JdGVtLFxuICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6IGF0dHJpYnV0ZU5hbWVcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdXJjZVRpdGxlTWFwczsqL1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAqIEBwYXJhbSBkYXRhXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gX2NyZWF0ZVRpdGxlTWFwKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2VsZi5fZ2V0VGl0bGVNYXBzRm9yUmVsYXRpb25zKGRhdGEsIGZ1bmN0aW9uKHNvdXJjZVRpdGxlTWFwcykge1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihfLm1hcChzb3VyY2VUaXRsZU1hcHMsICd1cmwnKSwgZnVuY3Rpb24ocmVzb3VyY2VzKSB7XG4gICAgICAgIHZhciB0aXRsZU1hcHMgPSB7fTtcblxuICAgICAgICBfLmZvckVhY2goc291cmNlVGl0bGVNYXBzLCBmdW5jdGlvbihpdGVtKSB7XG5cbiAgICAgICAgICBpZiAoIXRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0pIHtcbiAgICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0gPSBbXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aXRsZU1hcHNbaXRlbS5yZWxhdGlvbk5hbWVdLnB1c2goe1xuICAgICAgICAgICAgdmFsdWU6IGl0ZW0uZW51bUl0ZW0sXG4gICAgICAgICAgICAvL3ZhbHVlOiBkYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHlWYWx1ZSgnaWQnKSxcbiAgICAgICAgICAgIG5hbWU6IHJlc291cmNlc1tpdGVtLnVybF0uZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJylcbiAgICAgICAgICAgICAgLnByb3BlcnR5VmFsdWUoaXRlbS5hdHRyaWJ1dGVOYW1lKSB8fCBpdGVtLmVudW1JdGVtXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHRpdGxlTWFwcylcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29uZmlnIGZvciByZW5kZXJpbmcgYnV0dG9ucyBmcm9tIHNjaGVtYSBsaW5rc1xuICAgKlxuICAgKiBAcGFyYW0gbGlua3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gX2dldEZvcm1CdXR0b25CeVNjaGVtYShsaW5rcykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gobGlua3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICB0aXRsZTogdmFsdWUudGl0bGUsXG4gICAgICAgIGxpbms6IHZhbHVlLFxuICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG4iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ0hlbHBlcicsIGhlbHBlclNydik7XG5oZWxwZXJTcnYuJGluamVjdCA9IFsnXyddO1xuZnVuY3Rpb24gaGVscGVyU3J2KCkge1xuXG4gIHZhciBmYWN0b3J5ID0gIHtcbiAgICBwYXJzZUxvY2F0aW9uU2VhcmNoOiBwYXJzZUxvY2F0aW9uU2VhcmNoLFxuICAgIHNldExvY2F0aW9uU2VhcmNoOiBzZXRMb2NhdGlvblNlYXJjaCxcbiAgICBzdHJUb09iamVjdDogc3RyVG9PYmplY3RcbiAgfTtcblxuICByZXR1cm4gZmFjdG9yeTtcblxuICBmdW5jdGlvbiBzdHJUb09iamVjdChvYmosIHBhdGgpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFsoXFx3KyldL2csICcuJDEnKTsgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8oXFx3KykvZywgJy4kMScpOyAgLy8gY29udmVydCBpbmRleGVzIHRvIHByb3BlcnRpZXNcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwuLywgJycpOyAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gICAgdmFyIGEgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIGsgPSBhW2ldO1xuICAgICAgaWYgKGsgaW4gb2JqKSB7XG4gICAgICAgIG9iaiA9IG9ialtrXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBzZWFyY2ggcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBwYXJzZUxvY2F0aW9uU2VhcmNoKHVybCkge1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG4gICAgdmFyIHBvcyA9IHVybC5pbmRleE9mKCc/Jyk7XG5cbiAgICBpZiAocG9zID49IDApIHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgJz8nIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIGFuZCBzcGxpdCBvdXQgZWFjaCBhc3NpZ25tZW50XG4gICAgICBzZWFyY2hQYXJhbXMgPSBfLmNoYWluKHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKSlcbiAgICAgICAgLy8gU3BsaXQgZWFjaCBhcnJheSBpdGVtIGludG8gW2tleSwgdmFsdWVdIGlnbm9yZSBlbXB0eSBzdHJpbmcgaWYgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5tYXAoZnVuY3Rpb24oaXRlbSkgeyBpZiAoaXRlbSkgcmV0dXJuIGl0ZW0uc3BsaXQoJz0nKTsgfSlcbiAgICAgICAgLy8gUmVtb3ZlIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSB0aGUgc2VhcmNoIGlzIGVtcHR5XG4gICAgICAgIC5jb21wYWN0KClcbiAgICAgICAgLy8gVHVybiBba2V5LCB2YWx1ZV0gYXJyYXlzIGludG8gb2JqZWN0IHBhcmFtZXRlcnNcbiAgICAgICAgLm9iamVjdCgpXG4gICAgICAgIC8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGNoYWluIG9wZXJhdGlvblxuICAgICAgICAudmFsdWUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VhcmNoUGFyYW1zIHx8IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpIHtcbiAgICB2YXIgc2VhcmNoUGF0aDtcbiAgICB2YXIgcG9zID0gdXJsLmluZGV4T2YoJz8nKTtcbiAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgaWYgKHBvcyA+PSAwKSB7XG4gICAgICByZXN1bHQgPSB1cmwuc2xpY2UoMCwgcG9zKTtcbiAgICB9XG5cbiAgICBzZWFyY2hQYXRoID0gT2JqZWN0LmtleXMoc2VhcmNoUGFyYW1zKS5tYXAoZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQoc2VhcmNoUGFyYW1zW2tdKVxuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIHNlYXJjaFBhdGggPSBzZWFyY2hQYXRoID8gJz8nICsgc2VhcmNoUGF0aCA6ICcnO1xuXG4gICAgcmV0dXJuIHJlc3VsdCArIHNlYXJjaFBhdGg7XG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWRQYWdpbmF0aW9uJywgZ3JpZFBhZ2luYXRpb24pO1xuZ3JpZFBhZ2luYXRpb24uJGluamVjdCA9IFsnSGVscGVyJywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRQYWdpbmF0aW9uKEhlbHBlciwgXykge1xuXG4gIGZ1bmN0aW9uIFBhZ2luYXRpb24oKSB7XG4gICAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciBzdG9yaW5nIHRoZSBjdXJyZW50IHBhZ2UgaW5kZXggKi9cbiAgICB0aGlzLnBhZ2VQYXJhbSA9ICdwYWdlJztcbiAgICAvKiogVGhlIHplcm8tYmFzZWQgY3VycmVudCBwYWdlIG51bWJlciAqL1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAxO1xuICAgIC8qKiBOdW1iZXIgb2YgcGFnZXMgKi9cbiAgICAvL3RoaXMucGFnZUNvdW50ID0gMDtcbiAgICAvKiogVGhlIG51bWJlciBvZiBpdGVtcyBwZXIgcGFnZSAqL1xuICAgIHRoaXMucGVyUGFnZSA9IDE7XG4gICAgLyoqIFRvdGFsIG51bWJlciBvZiBpdGVtcyAqL1xuICAgIHRoaXMudG90YWxDb3VudCA9IDI7XG4gIH1cblxuICBhbmd1bGFyLmV4dGVuZChQYWdpbmF0aW9uLnByb3RvdHlwZSwge1xuICAgIGdldFBhZ2VQYXJhbTogZ2V0UGFnZVBhcmFtLFxuICAgIHNldFRvdGFsQ291bnQ6IHNldFRvdGFsQ291bnQsXG4gICAgZ2V0VG90YWxDb3VudDogZ2V0VG90YWxDb3VudCxcbiAgICBzZXRQZXJQYWdlOiBzZXRQZXJQYWdlLFxuICAgIGdldFBlclBhZ2U6IGdldFBlclBhZ2UsXG4gICAgZ2V0UGFnZUNvdW50OiBnZXRQYWdlQ291bnQsXG4gICAgc2V0Q3VycmVudFBhZ2U6IHNldEN1cnJlbnRQYWdlLFxuICAgIGdldEN1cnJlbnRQYWdlOiBnZXRDdXJyZW50UGFnZSxcbiAgICBnZXRPZmZzZXQ6IGdldE9mZnNldCxcbiAgICBnZXRQYWdlVXJsOiBnZXRQYWdlVXJsXG4gIH0pO1xuXG4gIHJldHVybiBQYWdpbmF0aW9uO1xuXG4gIGZ1bmN0aW9uIGdldFBhZ2VQYXJhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYWdlUGFyYW07XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUb3RhbENvdW50KHRvdGFsQ291bnQpIHtcbiAgICB0aGlzLnRvdGFsQ291bnQgPSB0b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VG90YWxDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy50b3RhbENvdW50O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0UGVyUGFnZShwZXJQYWdlKSB7XG4gICAgdGhpcy5wZXJQYWdlID0gcGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBlclBhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVyUGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VDb3VudCgpIHtcbiAgICB2YXIgdG90YWxQYWdlcyA9IHRoaXMucGVyUGFnZSA8IDEgPyAxIDogTWF0aC5jZWlsKHRoaXMudG90YWxDb3VudCAvIHRoaXMucGVyUGFnZSk7XG4gICAgcmV0dXJuIE1hdGgubWF4KHRvdGFsUGFnZXMgfHwgMCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDdXJyZW50UGFnZShjdXJyZW50UGFnZSkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBjdXJyZW50UGFnZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEN1cnJlbnRQYWdlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T2Zmc2V0KCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICByZXN1bHQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRQYWdlIHx8IDAsIDEpICogdGhpcy5wZXJQYWdlIC0gdGhpcy5wZXJQYWdlO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFBhZ2VVcmwodXJsKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgc2VhcmNoUGFyYW1zO1xuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnBhZ2VQYXJhbSArICdbb2Zmc2V0XSddID0gdGhpcy5nZXRPZmZzZXQoKTtcbiAgICBzZWFyY2hQYXJhbXNbdGhpcy5wYWdlUGFyYW0gKyAnW2xpbWl0XSddID0gdGhpcy5nZXRQZXJQYWdlKCk7XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnU29ydGluZycsIHNvcnRpbmdTcnYpO1xuc29ydGluZ1Nydi4kaW5qZWN0ID0gWydIZWxwZXInLCAnXyddO1xuZnVuY3Rpb24gc29ydGluZ1NydihIZWxwZXIsIF8pIHtcbiAgLyoqXG4gICAqIEBjbGFzc1xuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIFNvcnRpbmcoKSB7XG4gICAgdGhpcy5zb3J0UGFyYW0gPSAnc29ydCc7XG4gIH1cblxuICBTb3J0aW5nLkRJUkVDVElPTl9BU0MgPSAnYXNjJztcbiAgU29ydGluZy5ESVJFQ1RJT05fREVTQyA9ICdkZXNjJztcbiAgU29ydGluZy5maWVsZCA9IHVuZGVmaW5lZDtcbiAgU29ydGluZy5kaXJlY3Rpb24gPSAnJztcbiAgU29ydGluZy5zb3J0RmllbGRzID0gW107XG5cbiAgYW5ndWxhci5leHRlbmQoU29ydGluZy5wcm90b3R5cGUsIHtcbiAgICBnZXRDb2x1bW46IGdldENvbHVtbixcbiAgICBnZXREaXJlY3Rpb25Db2x1bW46IGdldERpcmVjdGlvbkNvbHVtbixcbiAgICBzZXRTb3J0RmllbGRzOiBzZXRTb3J0RmllbGRzLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgZ2V0VXJsOiBnZXRVcmxcbiAgfSk7XG5cbiAgcmV0dXJuIFNvcnRpbmc7XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0RGlyZWN0aW9uQ29sdW1uXG4gICAqIEBwYXJhbSBjdXJyZW50RGlyZWN0aW9uXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RGlyZWN0aW9uQ29sdW1uKGN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICBpZiAoIWN1cnJlbnREaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiAnYXNjJztcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnREaXJlY3Rpb24gPT0gJ2FzYycgPyAnZGVzYycgOiAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29sdW1uIGZvciBmaWVsZCBpZiBmaWVsZCBoYXZlICcuJyB0aGVuIGdldCBmaXJzdCBwYXJ0XG4gICAqIEZvciBleGFtcGxlOiAndXNlci5uYW1lJyByZXR1cm4gJ3VzZXInXG4gICAqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0Q29sdW1uXG4gICAqXG4gICAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uKCkge1xuICAgIGlmICh0aGlzLmZpZWxkKSB7XG4gICAgICBpZiAodGhpcy5maWVsZC5pbmRleE9mKCcuJykgPj0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWVsZC5zbGljZSgwLCB0aGlzLmZpZWxkLmluZGV4T2YoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmZpZWxkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0aW5nXG4gICAqIEBwYXJhbSBmaWVsZFxuICAgKiBAcGFyYW0gZGlyZWN0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBzZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pIHtcbiAgICB0aGlzLmZpZWxkID0gZmllbGQ7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgU29ydGluZyNzZXRTb3J0RmllbGRzXG4gICAqIEBwYXJhbSBmaWVsZHNcbiAgICovXG4gIGZ1bmN0aW9uIHNldFNvcnRGaWVsZHMoZmllbGRzKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gZmllbGRzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIFNvcnRpbmcjZ2V0VXJsXG4gICAqIEBwYXJhbSB1cmxcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGdldFVybCh1cmwpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIHZhciBzZWFyY2hQYXJhbXM7XG5cbiAgICBpZiAoIXRoaXMuZmllbGQpIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgc2VhcmNoUGFyYW1zID0gSGVscGVyLnBhcnNlTG9jYXRpb25TZWFyY2godXJsKTtcblxuICAgIHNlYXJjaFBhcmFtc1t0aGlzLnNvcnRQYXJhbSArICdbJyArIHRoaXMuZmllbGQgKyAnXSddID0gdGhpcy5kaXJlY3Rpb247XG5cbiAgICByZXN1bHQgPSBIZWxwZXIuc2V0TG9jYXRpb25TZWFyY2godXJsLCBzZWFyY2hQYXJhbXMpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG59XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZFRhYmxlJywgZ3JpZFRhYmxlKTtcbmdyaWRUYWJsZS4kaW5qZWN0ID0gWydncmlkLWVudGl0eScsICdncmlkUGFnaW5hdGlvbicsICdTb3J0aW5nJywgJyR0aW1lb3V0JywgJ18nXTtcbmZ1bmN0aW9uIGdyaWRUYWJsZShncmlkRW50aXR5LCBncmlkUGFnaW5hdGlvbiwgU29ydGluZywgJHRpbWVvdXQsIF8pIHtcblxuICAvKipcbiAgICogQGNsYXNzXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gVGFibGUobW9kZWwpIHtcblxuICAgIHRoaXMuc2V0TW9kZWwobW9kZWwpO1xuICAgIC8qKlxuICAgICAqIEB0eXBlIHtncmlkUGFnaW5hdGlvbn1cbiAgICAgKi9cbiAgICB0aGlzLnBhZ2luYXRpb24gPSBuZXcgZ3JpZFBhZ2luYXRpb24oKTtcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7U29ydGluZ31cbiAgICAgKi9cbiAgICB0aGlzLnNvcnRpbmcgPSBuZXcgU29ydGluZygpO1xuICAgIHRoaXMucm93cyA9IFtdO1xuICAgIHRoaXMuY29sdW1ucyA9IHt9O1xuICAgIHRoaXMubGlua3MgPSB7fTtcbiAgfVxuXG4gIFRhYmxlLnByb3RvdHlwZSA9IG5ldyBncmlkRW50aXR5KCk7XG5cbiAgYW5ndWxhci5leHRlbmQoVGFibGUucHJvdG90eXBlLCB7XG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWcsXG4gICAgZ2V0VGFibGVJbmZvOiBnZXRUYWJsZUluZm8sXG4gICAgZ2V0Q29sdW1uc0J5U2NoZW1hOiBnZXRDb2x1bW5zQnlTY2hlbWEsXG4gICAgcm93c1RvVGFibGVGb3JtYXQ6IHJvd3NUb1RhYmxlRm9ybWF0LFxuICAgIGdldFNvcnRpbmdQYXJhbUJ5RmllbGQ6IGdldFNvcnRpbmdQYXJhbUJ5RmllbGQsXG4gICAgZ2V0U29ydGluZ1BhcmFtVmFsdWU6IGdldFNvcnRpbmdQYXJhbVZhbHVlLFxuICAgIHNldFNvcnRpbmc6IHNldFNvcnRpbmcsXG4gICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhXG4gIH0pO1xuXG4gIHJldHVybiBUYWJsZTtcblxuICBmdW5jdGlvbiBnZXRDb25maWcoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICByb3dzOiBzZWxmLnJvd3MsXG4gICAgICBjb2x1bW5zOiBzZWxmLmNvbHVtbnMsXG4gICAgICBsaW5rczogc2VsZi5saW5rc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFRhYmxlSW5mbyhjYWxsYmFjaykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCk7XG4gICAgdmFyIHVybDtcblxuICAgIC8qKiBhZGQgcGFnZSB0byB1cmwgKi9cbiAgICB1cmwgPSBzZWxmLnBhZ2luYXRpb24uZ2V0UGFnZVVybChzZWxmLmdldFJlc291cmNlVXJsKG1vZGVsLnVybCwgbW9kZWwucGFyYW1zKSk7XG4gICAgLyoqIGFkZCBzb3J0IHRvIHVybCAqL1xuICAgIHVybCA9IHNlbGYuc29ydGluZy5nZXRVcmwodXJsKTtcblxuICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mZXRjaERhdGEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICB2YXIgc2NoZW1hV2l0aG91dFJlZiA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoZGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICBzZWxmLnBhZ2luYXRpb24uc2V0VG90YWxDb3VudChkYXRhLnByb3BlcnR5KCdtZXRhJykucHJvcGVydHlWYWx1ZSgndG90YWwnKSk7XG5cbiAgICAgIHNlbGYuX2dldFJvd3NCeURhdGEoZGF0YSwgZnVuY3Rpb24ocm93cykge1xuXG4gICAgICAgIHNlbGYucm93cyA9IHNlbGYucm93c1RvVGFibGVGb3JtYXQocm93cyk7XG4gICAgICAgIHNlbGYubGlua3MgPSBkYXRhLmxpbmtzKCk7XG4gICAgICAgIHNlbGYuY29sdW1ucyA9IHNlbGYuZ2V0Q29sdW1uc0J5U2NoZW1hKGRhdGEpO1xuXG4gICAgICAgIHNlbGYuc29ydGluZy5zZXRTb3J0RmllbGRzKF8ubWFwKHNlbGYuY29sdW1ucywgJ2F0dHJpYnV0ZU5hbWUnKSk7XG5cbiAgICAgICAgc2VsZi5jb2x1bW5zLnB1c2goe1xuICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYXR0cmlidXRlTmFtZTogJ2xpbmtzJ1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKHNlbGYuZ2V0Q29uZmlnKCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKSB7XG4gICAgZmllbGQgPSB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQoZmllbGQpO1xuICAgIHRoaXMuc29ydGluZy5zZXRTb3J0aW5nKGZpZWxkLCBkaXJlY3Rpb24pXG4gIH1cblxuICAvKipcbiAgICogQG5hbWUgVGFibGUjZ2V0U29ydGluZ1BhcmFtQnlGaWVsZFxuICAgKiBAcGFyYW0gZmllbGRcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBmdW5jdGlvbiBnZXRTb3J0aW5nUGFyYW1CeUZpZWxkKGZpZWxkKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZpZWxkO1xuICAgIC8vdmFyIHJlbCA9IHRoaXMuZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eShmaWVsZCk7XG4gICAgdmFyIHJlbCA9IHRoaXMuZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW0oMCkucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShmaWVsZCkuc2NoZW1hcygpLnJlbGF0aW9uRmllbGQoKTtcblxuICAgIGlmIChyZWwpIHtcbiAgICAgIHJlc3VsdCArPSAnLicgKyByZWw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdmFsdWUgZm9yIEdFVCBzb3J0aW5nIHBhcmFtXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U29ydGluZ1BhcmFtVmFsdWUoKSB7XG4gICAgaWYgKHRoaXMuc29ydGluZy5kaXJlY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNvcnRpbmdQYXJhbUJ5RmllbGQodGhpcy5zb3J0aW5nLmZpZWxkKSArICdfJyArIHRoaXMuc29ydGluZy5kaXJlY3Rpb25cbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgKlxuICAgKiBAbmFtZSBUYWJsZSNnZXRDb2x1bW5zQnlTY2hlbWFcbiAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGNvbHVtbnMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJykuaXRlbSgwKS5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgXy5mb3JFYWNoKGNvbHVtbnMuZGVmaW5lZFByb3BlcnRpZXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgdmFsdWUgPSBjb2x1bW5zLnByb3BlcnR5U2NoZW1hcyhrZXkpWzBdLmRhdGEudmFsdWUoKTtcbiAgICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvKnZhciByZWxhdGlvbnNoaXBzID0ge307XG4gICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICB9XG4gICAgIF8uZm9yRWFjaChyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgIHZhbHVlLmF0dHJpYnV0ZU5hbWUgPSBrZXk7XG4gICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgfSk7Ki9cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydCBhcnJheSBKc29uYXJ5IERhdGEgdG8gcmVzdWx0IGFycmF5IGZvciByZW5kZXJpbmcgdGFibGVcbiAgICpcbiAgICogQHBhcmFtIHJvd3NcbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93KSB7XG4gICAgICB2YXIgZGF0YSA9IHJvdy5vd247XG4gICAgICB2YXIgcm93UmVzdWx0ID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyb3cucmVsYXRpb25zaGlwcywgZnVuY3Rpb24ocmVsYXRpb24sIGtleSkge1xuICAgICAgICByb3dSZXN1bHRba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICAvL3ZhciBmaWVsZCA9IHJvdy5vd24ucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgdmFyIGZpZWxkID0gcm93Lm93bi5zY2hlbWFzKCkucHJvcGVydHlTY2hlbWFzKCdyZWxhdGlvbnNoaXBzJykucHJvcGVydHlTY2hlbWFzKGtleSkucmVsYXRpb25GaWVsZCgpO1xuICAgICAgICAgIC8qKiByZWxhdGlvbkZpZWxkIGFkZGl0aW9uYWwgZmllbGQocmVsYXRpb24gcm93KSAqL1xuICAgICAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJykucHJvcGVydHlWYWx1ZShmaWVsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuXG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICB9KTtcblxuICAgICAgcm93UmVzdWx0LmxpbmtzID0gW107XG4gICAgICBfLmZvck93bihkYXRhLmxpbmtzKCksIGZ1bmN0aW9uKGxpbmspIHtcbiAgICAgICAgcm93UmVzdWx0LmxpbmtzLnB1c2gobGluayk7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHJvd1Jlc3VsdCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXJyYXkgcm93cyBieSBKc29uYXJ5IERhdGFcbiAgICpcbiAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgIGRhdGEucHJvcGVydHkoJ2RhdGEnKS5pdGVtcyhmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblxuICAgICAgaW5jbHVkZWQucHVzaChzZWxmLl9nZXRSZWxhdGlvblJlc291cmNlKHZhbHVlKSk7XG5cbiAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBzZWxmLl9iYXRjaExvYWREYXRhKGluY2x1ZGVkLCBiYXRjaExvYWRlZCk7XG5cbiAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgdmFyIHJlcyA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93cywgZnVuY3Rpb24ocm93LCBpbmRleCkge1xuICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgIG93bjogcm93LFxuICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzW2luZGV4XSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgIG5baW5kZXhdID0gaXRlbS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlcy5wdXNoKHRtcFJvdyk7XG4gICAgICB9KTtcblxuICAgICAgY2FsbGJhY2socmVzKTtcbiAgICB9XG5cbiAgfVxuXG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcblxuICB2YXIgcHJvdmlkZXIgPSB7XG4gICAgJGdldDogZ3JpZEVudGl0eUdldFxuICB9O1xuXG4gIGdyaWRFbnRpdHlHZXQuJGluamVjdCA9IFsnSGVscGVyJywgJyRpbnRlcnZhbCcsICdfJ107XG5cbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRFbnRpdHlHZXQoSGVscGVyLCAkaW50ZXJ2YWwsIF8pIHtcbiAgICB2YXIgbW9kZWw7XG4gICAgdmFyIG1lc3NhZ2VzID0ge1xuICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgIHN1Y2Nlc3NDcmVhdGVkOiAnU3VjY2Vzc2Z1bGx5IGNyZWF0ZScsXG4gICAgICBzdWNjZXNzVXBkYXRlZDogJ1N1Y2Nlc3NmdWxseSB1cGRhdGUnLFxuICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBjbGFzc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEVudGl0eSgpIHtcblxuICAgICAgSnNvbmFyeS5leHRlbmREYXRhKHtcbiAgICAgICAgcmVsYXRpb25zaGlwczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvcGVydHlWYWx1ZSgncmVsYXRpb25zaGlwcycpO1xuICAgICAgICB9LFxuICAgICAgICBhdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9wZXJ0eVZhbHVlKCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBKc29uYXJ5LmV4dGVuZFNjaGVtYSh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmRhdGEucHJvcGVydHlWYWx1ZSgncmVsYXRpb25GaWVsZCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIEpzb25hcnkuZXh0ZW5kU2NoZW1hTGlzdCh7XG4gICAgICAgIHJlbGF0aW9uRmllbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciByZWxhdGlvbkZpZWxkID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmdldEZ1bGwoKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBzY2hlbWEpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHNjaGVtYS5yZWxhdGlvbkZpZWxkKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiAocmVsYXRpb25GaWVsZCA9PSBudWxsIHx8IHZhbHVlIDwgcmVsYXRpb25GaWVsZCkpIHtcbiAgICAgICAgICAgICAgcmVsYXRpb25GaWVsZCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkZpZWxkO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEpzb25hcnkgZGF0YSBvYmplY3RcbiAgICAgKlxuICAgICAqIEB0eXBlIHtKc29uYXJ5fVxuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IHt9O1xuXG4gICAgYW5ndWxhci5leHRlbmQoRW50aXR5LnByb3RvdHlwZSwge1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBhY3Rpb25HZXRSZXNvdXJjZTogJ3JlYWQnXG4gICAgICB9LFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIHNldE1vZGVsOiBzZXRNb2RlbCxcbiAgICAgIGdldE1vZGVsOiBnZXRNb2RlbCxcbiAgICAgIHNldE1lc3NhZ2U6IHNldE1lc3NhZ2UsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgZmV0Y2hEYXRhOiBmZXRjaERhdGEsXG4gICAgICBmZXRjaENvbGxlY3Rpb246IGZldGNoQ29sbGVjdGlvbixcbiAgICAgIGxvYWREYXRhOiBsb2FkRGF0YSxcbiAgICAgIGxvYWRTY2hlbWE6IGxvYWRTY2hlbWEsXG4gICAgICBnZXRSZXNvdXJjZVVybDogZ2V0UmVzb3VyY2VVcmwsXG4gICAgICBtZXJnZVJlbFNjaGVtYTogbWVyZ2VSZWxTY2hlbWEsXG4gICAgICBnZXRUeXBlUHJvcGVydHk6IGdldFR5cGVQcm9wZXJ0eSxcbiAgICAgIF9nZXRFbXB0eURhdGE6IF9nZXRFbXB0eURhdGEsXG4gICAgICBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zOiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zLFxuICAgICAgX2dldFJlbGF0aW9uUmVzb3VyY2U6IF9nZXRSZWxhdGlvblJlc291cmNlLFxuICAgICAgX3JlcGxhY2VGcm9tRnVsbDogX3JlcGxhY2VGcm9tRnVsbCxcbiAgICAgIF9nZXRSZWxhdGlvbkxpbms6IF9nZXRSZWxhdGlvbkxpbmssXG4gICAgICBfYmF0Y2hMb2FkRGF0YTogX2JhdGNoTG9hZERhdGFcbiAgICB9KTtcblxuICAgIHJldHVybiBFbnRpdHk7XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHVybCBieSBwYXJhbXMgZm9yIGxvYWQgcmVzb3VyY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UmVzb3VyY2VVcmwodXJsLCBwYXJhbXMpIHtcbiAgICAgIHZhciByZXN1bHQgPSB1cmw7XG5cbiAgICAgIGlmIChwYXJhbXMucmVzb3VyY2UpIHtcbiAgICAgICAgcmVzdWx0ID0gdXJsICsgJy8nICsgcGFyYW1zLnJlc291cmNlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgaWYgKHBhcmFtcy50eXBlID09PSAndXBkYXRlJyB8fCBwYXJhbXMudHlwZSA9PT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcmVzdWx0ICs9ICcvJyArIHBhcmFtcy50eXBlICsgJy8nICsgcGFyYW1zLmlkO1xuICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy50eXBlID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnL3NjaGVtYSMvZGVmaW5pdGlvbnMvY3JlYXRlJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZldGNoIGRhdGEgYnkgdXJsIGFuZCBpbmNsdWRlIHNjaGVtYSBmcm9tIGhlYWRlciBkYXRhXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWREYXRhKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG4gICAgICBKc29uYXJ5LmdldERhdGEodXJsLCBmdW5jdGlvbihqRGF0YSwgcmVxdWVzdCkge1xuICAgICAgICB2YXIgZGF0YSA9IGpEYXRhO1xuICAgICAgICB2YXIgc2NoZW1hID0gakRhdGEucHJvcGVydHkoJ2RhdGEnKS5zY2hlbWFzKClbMF0uZGF0YS5kb2N1bWVudC5yYXcudmFsdWUoKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24oalNjaGVtYSkge1xuXG4gICAgICAgIHZhciBzY2hlbWEgPSBqU2NoZW1hLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG4gICAgICAgIHZhciBkYXRhID0gSnNvbmFyeS5jcmVhdGUoc2VsZi5fZ2V0RW1wdHlEYXRhKGpTY2hlbWEpKTtcbiAgICAgICAgZGF0YS5kb2N1bWVudC51cmwgPSBzZWxmLmdldE1vZGVsKCkudXJsO1xuICAgICAgICBkYXRhLmFkZFNjaGVtYShqU2NoZW1hKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnR5KG9iaikge1xuICAgICAgdmFyIHRtcE9iaiA9IG9iajtcbiAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICBzd2l0Y2ggKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0ge307XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgdG1wT2JqW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcnJheSc6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gW107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdG1wT2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVtcHR5IG1vZGVsIGZvciBjcmVhdGUgZm9ybVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVxuICAgICAqIEBwYXJhbSBmdWxsU2NoZW1hXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhKHNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgcmVzdWx0ID0gc2NoZW1hLmNyZWF0ZVZhbHVlKCk7XG4gICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0ge307XG5cbiAgICAgIF8uZm9yRWFjaChzY2hlbWEucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpLmRlZmluZWRQcm9wZXJ0aWVzKCksIGZ1bmN0aW9uKHByb3BlcnR5TmFtZSkge1xuICAgICAgICByZXN1bHQuZGF0YS5hdHRyaWJ1dGVzW3Byb3BlcnR5TmFtZV0gPSBzY2hlbWEucHJvcGVydHlTY2hlbWFzKCdkYXRhJykuZ2V0RnVsbCgpLnByb3BlcnR5U2NoZW1hcygnYXR0cmlidXRlcycpLnByb3BlcnR5U2NoZW1hcyhwcm9wZXJ0eU5hbWUpLmNyZWF0ZVZhbHVlKCk7XG4gICAgICB9KTtcblxuICAgICAgLypyZXN1bHQuZGF0YS5hdHRyaWJ1dGVzID0gc2VsZi5nZXRUeXBlUHJvcGVydHkoXG4gICAgICAgIHNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKS5nZXRGdWxsKCkucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJylbMF0uZGF0YS52YWx1ZSgpLnByb3BlcnRpZXNcbiAgICAgICk7Ki9cbiAgICAgIC8vcmVzdWx0LmRhdGEucmVsYXRpb25zaGlwcyA9IHNlbGYuX2dldEVtcHR5RGF0YVJlbGF0aW9ucyhzY2hlbWFXaXRob3V0UmVmLCBmdWxsU2NoZW1hKTtnaXRcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RW1wdHlEYXRhUmVsYXRpb25zKHNjaGVtYSwgZnVsbFNjaGVtYSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9uID0ge307XG5cbiAgICAgIHZhciBwYXRjaFNjaGVtYSA9IHNlbGYubWVyZ2VSZWxTY2hlbWEoc2NoZW1hLCBmdWxsU2NoZW1hKTtcblxuICAgICAgdmFyIGRhdGFTY2hlbWEgPSBKc29uYXJ5LmNyZWF0ZVNjaGVtYShwYXRjaFNjaGVtYSkucHJvcGVydHlTY2hlbWFzKCdkYXRhJyk7XG4gICAgICB2YXIgYXR0cmlidXRlc1NjaGVtYSA9IGRhdGFTY2hlbWEucHJvcGVydHlTY2hlbWFzKCdhdHRyaWJ1dGVzJyk7XG4gICAgICB2YXIgcmVsYXRpb25zU2NoZW1hID0gZGF0YVNjaGVtYS5wcm9wZXJ0eVNjaGVtYXMoJ3JlbGF0aW9uc2hpcHMnKTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc1NjaGVtYS5kZWZpbmVkUHJvcGVydGllcygpLCBmdW5jdGlvbihyZWxhdGlvbk5hbWUpIHtcbiAgICAgICAgdmFyIHJlbGF0aW9uU2NoZW1hID0gcmVsYXRpb25zU2NoZW1hLnByb3BlcnR5U2NoZW1hcyhyZWxhdGlvbk5hbWUpLmdldEZ1bGwoKS5wcm9wZXJ0eVNjaGVtYXMoJ2RhdGEnKTtcbiAgICAgICAgdmFyIGF0dHJpYnV0ZVNjaGVtYSA9IGF0dHJpYnV0ZXNTY2hlbWEucHJvcGVydHlTY2hlbWFzKHJlbGF0aW9uTmFtZSkuZ2V0RnVsbCgpO1xuXG4gICAgICAgIHJlbGF0aW9uW3JlbGF0aW9uTmFtZV0gPSB7fTtcbiAgICAgICAgcmVsYXRpb25bcmVsYXRpb25OYW1lXS5saW5rcyA9IHt9O1xuICAgICAgICBpZiAoYXR0cmlidXRlU2NoZW1hLmJhc2ljVHlwZXMoKS50b1N0cmluZygpID09ICdhcnJheScpIHtcbiAgICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdLmRhdGEgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWxhdGlvbltyZWxhdGlvbk5hbWVdLmRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZWxhdGlvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgYnkgdXJsIGFuZCBjaGVjayB0eXBlIChjcmVhdGUgb3Igb3RoZXIpXG4gICAgICogaWYgY3JlYXRlIC0gZmV0Y2ggc2NoZW1hIHdpdGggY3JlYXRlIGVtcHR5IGRhdGEsXG4gICAgICogaWYgb3RoZXIgYWN0aW9uIC0gZmV0Y2ggZGF0YSB3aXRoIHNjaGVtYVxuICAgICAqIEBwYXJhbSB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgc2VsZi5sb2FkU2NoZW1hKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLmxvYWREYXRhKHVybCwgZmV0Y2hEYXRhU3VjY2Vzcyk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHNlbGYuZGF0YSA9IGRhdGE7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGUgbG9hZCByZXNvdXJjZSBieSBhcnJheSBsaW5rc1xuICAgICAqXG4gICAgICogQG5hbWUgRW50aXR5I2ZldGNoQ29sbGVjdGlvblxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGxpbmtSZXNvdXJjZXNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmZXRjaENvbGxlY3Rpb24obGlua1Jlc291cmNlcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBsb2FkZWQgPSAwO1xuICAgICAgdmFyIHRvdGFsID0gMDtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHZhciBsaW5rcztcblxuICAgICAgbGlua3MgPSBfLnVuaXEobGlua1Jlc291cmNlcyk7XG5cbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odXJsKSB7XG5cbiAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZ1bmN0aW9uKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCkge1xuICAgICAgICAgIHJlc291cmNlc1t1cmxdID0ge1xuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgICAgIH07XG4gICAgICAgICAgbG9hZGVkKys7XG4gICAgICAgIH0pO1xuICAgICAgICB0b3RhbCsrO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciBpbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRvdGFsID09PSBsb2FkZWQpIHtcbiAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKGludGVydmFsKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzb3VyY2VzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gSGVscGVyLnN0clRvT2JqZWN0KHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgdHlwZW9mIGhheXN0YWNrW2tleV0gPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KGhheXN0YWNrW2tleV0pICYmXG4gICAgICAgICAgICBbJ29uZU9mJywgJ2FsbE9mJ10uaW5kZXhPZihrZXkpID49IDBcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChoYXlzdGFja1trZXldLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlLiRyZWYpIHtcbiAgICAgICAgICAgICAgICBoYXlzdGFja1trZXldW2luZGV4XSA9IEhlbHBlci5zdHJUb09iamVjdChzY2hlbWFGdWxsLCB2YWx1ZS4kcmVmLnN1YnN0cmluZygyKSk7XG4gICAgICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2lyY3VtdmVudGlvbiB0aGUgYXJyYXkgcmVsYXRpb25zaGlwcyBhbmQgZ2V0IGxpbmtzIGZvciBsYXRlIHRoZW0gbG9hZFxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBsaW5rIGZvciBnZXQgcmVzb3VyY2VcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25SZXNvdXJjZShkYXRhKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVsYXRpb25zO1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gICAgICBpZiAocmVsYXRpb25zID0gZGF0YS5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnZhbHVlKCkpIHtcbiAgICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24ocmVsSXRlbSwgcmVsS2V5KSB7XG4gICAgICAgICAgcmVzdWx0W3JlbEtleV0gPSBzZWxmLl9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsaW5rIGZyb20gcmVsYXRpb24gZm9yIGxvYWQgcmVzb3VyY2UgZGF0YVxuICAgICAqXG4gICAgICogXCJkYXRhXCI6IFt7XG4gICAgICogICAgXCJ0eXBlXCI6IFwicG9zdHNcIixcbiAgICAgKiAgICBcImlkXCI6IFwiMVwiLFxuICAgICAqICAgIFwiYXR0cmlidXRlc1wiOiB7XG4gICAgICogICAgICAuLi5cbiAgICAgKiAgICB9LFxuICAgICAqICAgIFwicmVsYXRpb25zaGlwc1wiOiB7XG4gICAgICogICAgICBcImF1dGhvclwiOiB7ICAgICAgICAgICA8LS0gaW5wdXQgZGF0YVxuICAgICAqICAgICAgICAgXCJsaW5rc1wiOiB7XG4gICAgICogICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgIFwicmVsYXRlZFwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS9wb3N0cy8xL2F1dGhvclwiXG4gICAgICogICAgICAgICB9LFxuICAgICAqICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwicGVvcGxlXCIsIFwiaWRcIjogXCI5XCIgfVxuICAgICAqICAgICAgfVxuICAgICAqICAgIH1cbiAgICAgKn1dXG4gICAgICogQG5hbWUgRW50aXR5I19nZXRSZWxhdGlvbkxpbmtcbiAgICAgKiBAcGFyYW0gcmVsSXRlbVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXNvdXJjZSA9IFtdO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxJdGVtLmRhdGEpKSB7XG4gICAgICAgIHZhciBsaW5rQXJyYXkgPSBbXTtcbiAgICAgICAgXy5mb3JFYWNoKHJlbEl0ZW0uZGF0YSwgZnVuY3Rpb24oZGF0YU9iaikge1xuICAgICAgICAgIGxpbmtBcnJheS5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc2VsZi5nZXRSZXNvdXJjZVVybChyZWxJdGVtLmxpbmtzLnNlbGYsIHt0eXBlOiBzZWxmLmRlZmF1bHQuYWN0aW9uR2V0UmVzb3VyY2UsIGlkOiBkYXRhT2JqLmlkfSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc291cmNlID0gbGlua0FycmF5O1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShyZWxJdGVtLmxpbmtzKSAmJiAhXy5pc0VtcHR5KHJlbEl0ZW0uZGF0YSkpIHtcbiAgICAgICAgICByZXNvdXJjZSA9IFt7XG4gICAgICAgICAgICB1cmw6IHNlbGYuZ2V0UmVzb3VyY2VVcmwocmVsSXRlbS5saW5rcy5zZWxmLCB7dHlwZTogc2VsZi5kZWZhdWx0LmFjdGlvbkdldFJlc291cmNlLCBpZDogcmVsSXRlbS5kYXRhLmlkfSlcbiAgICAgICAgICB9XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvdXJjZSA9IFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxpbmtzIGZyb20gZGF0YSByZWxhdGlvbnNoaXBzIHNlY3Rpb25cbiAgICAgKiBJTlBVVDpcbiAgICAgKiAgIFwiZGF0YVwiOiBbe1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgICBcImF1dGhvclwiOiB7XG4gICAgICogICAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICAgIFwic2VsZlwiOiBcImh0dHA6Ly9leGFtcGxlLmNvbS91c2Vycy8xL3JlbGF0aW9uc2hpcHMvYXV0aG9yXCIsXG4gICAgICogICAgICAgICAgICAgXCJyZWxhdGVkXCI6IFwiaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yXCJcbiAgICAgKiAgICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgICAgXCJkYXRhXCI6IHsgXCJ0eXBlXCI6IFwidXNlcnNcIiwgXCJpZFwiOiBcIjlcIiB9XG4gICAgICogICAgICAgIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgIH1dXG4gICAgICogT1VUUFVUOlxuICAgICAqICAgW1xuICAgICAqICAgICAgaHR0cDovL2V4YW1wbGUuY29tL3VzZXJzLzEvYXV0aG9yLzlcbiAgICAgKiAgIF1cbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICBfLmZvckVhY2gocm93c1JlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJvdykge1xuICAgICAgICBfLmZvckVhY2gocm93LCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcm93c1JlbGF0aW9uc2hpcHNcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShyb3dzUmVsYXRpb25zaGlwcywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oZ2V0TGlua0Zyb21Sb3dzRGF0YVJlbGF0aW9ucyhyb3dzUmVsYXRpb25zaGlwcyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3NSZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyb3csIGtSb3cpIHtcbiAgICAgICAgICByZXN1bHRba1Jvd10gPSByZXN1bHRba1Jvd10gfHwge307XG4gICAgICAgICAgXy5mb3JFYWNoKHJvdywgZnVuY3Rpb24ocmVsLCBrUmVsKSB7XG4gICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF0gPSByZXN1bHRba1Jvd11ba1JlbF0gfHwgW107XG4gICAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtLCBrUmVsSXRlbSkge1xuICAgICAgICAgICAgICByZXN1bHRba1Jvd11ba1JlbF1ba1JlbEl0ZW1dID0gcmVzb3VyY2VzW3JlbEl0ZW0udXJsXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwKSB7XG4gIHJldHVybiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZixcbiAgICAgIGRhdGE6IHNjb3BlLm1vZGVsXG4gICAgfTtcblxuICAgIHNjb3BlLiRicm9hZGNhc3QoJ3NjaGVtYUZvcm1WYWxpZGF0ZScpO1xuICAgIGlmICghc2NvcGUuc2NvcGVGb3JtLmdyaWRGb3JtLiR2YWxpZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgICRodHRwKHBhcmFtcykudGhlbihhY3Rpb25DcmVhdGVTdWNjZXNzLCBhY3Rpb25DcmVhdGVFcnJvcik7XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVTdWNjZXNzKCkge1xuICAgICAgb2JqLmdldEZvcm1JbmZvKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NDcmVhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25DcmVhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tZGVsZXRlJywgZ3JpZEFjdGlvbkRlbGV0ZSk7XG5ncmlkQWN0aW9uRGVsZXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWRUYWJsZScsICdncmlkRm9ybSddO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbkRlbGV0ZSgkaHR0cCwgZ3JpZFRhYmxlLCBncmlkRm9ybSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWZcbiAgICB9O1xuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvbkRlbGV0ZVN1Y2Nlc3MsIGFjdGlvbkRlbGV0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvbkRlbGV0ZVN1Y2Nlc3MoKSB7XG4gICAgICBpZiAob2JqIGluc3RhbmNlb2YgZ3JpZFRhYmxlKSB7XG4gICAgICAgIG9iai5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgZ3JpZEZvcm0pIHtcbiAgICAgICAgc2NvcGUuaGlkZUZvcm0gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgbXNnOiBvYmouZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0iLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ2dyaWQtYWN0aW9uLWdvVG8nLCBncmlkQWN0aW9uR29Ubyk7XG5ncmlkQWN0aW9uR29Uby4kaW5qZWN0ID0gWyckbG9jYXRpb24nXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25Hb1RvKCRsb2NhdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqLCBsaW5rKSB7XG4gICAgdmFyIHRlbXBsYXRlTGluayA9IGxpbmsuZGVmaW5pdGlvbi5kYXRhLnByb3BlcnR5VmFsdWUoJ2hyZWYnKTtcbiAgICB2YXIgcmVzdWx0TGluayA9IHRlbXBsYXRlTGluay5yZXBsYWNlKC97KFteXFx7LH1dKil9L2csIGZ1bmN0aW9uKG1hdGNoLCBwMSkge1xuICAgICAgcmV0dXJuIGxpbmsuc3ViamVjdERhdGEucHJvcGVydHlWYWx1ZShwMSk7XG4gICAgfSk7XG5cbiAgICAkbG9jYXRpb24udXJsKHJlc3VsdExpbmspO1xuICB9O1xufSIsIi8qIEdyaWQgbGlua3MgYWN0aW9ucyAqL1xuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1hY3Rpb25zJywgZ3JpZEFjdGlvbnMpO1xuZ3JpZEFjdGlvbnMuJGluamVjdCA9IFtdO1xuZnVuY3Rpb24gZ3JpZEFjdGlvbnMoKSB7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgIGFjdGlvbnM6IHt9LFxuICAgICRnZXQ6IGdyaWRBY3Rpb25zR2V0XG4gIH07XG5cbiAgZ3JpZEFjdGlvbnNHZXQuJGluamVjdCA9IFsnZ3JpZC1hY3Rpb24tZ29UbycsICdncmlkLWFjdGlvbi1kZWxldGUnLCAnZ3JpZC1hY3Rpb24tdXBkYXRlJywgJ2dyaWQtYWN0aW9uLWNyZWF0ZSddO1xuICByZXR1cm4gcHJvdmlkZXI7XG5cbiAgZnVuY3Rpb24gZ3JpZEFjdGlvbnNHZXQoQWN0aW9uR29UbywgQWN0aW9uRGVsZXRlLCBBY3Rpb25VcGRhdGUsIEFjdGlvbkNyZWF0ZSkge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHRoaXMuYWN0aW9ucyA9IHtcbiAgICAgIGdvVG9VcGRhdGU6IEFjdGlvbkdvVG8sXG4gICAgICBnb1RvQ3JlYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0xpc3Q6IEFjdGlvbkdvVG8sXG4gICAgICByZWFkOiBBY3Rpb25Hb1RvLFxuICAgICAgZGVsZXRlOiBBY3Rpb25EZWxldGUsXG4gICAgICB1cGRhdGU6IEFjdGlvblVwZGF0ZSxcbiAgICAgIGNyZWF0ZTogQWN0aW9uQ3JlYXRlXG4gICAgfTtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0aW9uOiBmdW5jdGlvbihvYmosIGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0ob2JqLCBsaW5rLCBzY29wZSk7XG4gICAgICB9LmJpbmQodGhpcylcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi11cGRhdGUnLCBncmlkQWN0aW9uVXBkYXRlKTtcbmdyaWRBY3Rpb25VcGRhdGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25VcGRhdGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgbGluaywgc2NvcGUpIHtcbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbWV0aG9kOiBsaW5rLm1ldGhvZCxcbiAgICAgIHVybDogbGluay5ocmVmLFxuICAgICAgZGF0YTogc2NvcGUubW9kZWxcbiAgICB9O1xuXG4gICAgc2NvcGUuJGJyb2FkY2FzdCgnc2NoZW1hRm9ybVZhbGlkYXRlJyk7XG4gICAgaWYgKCFzY29wZS5zY29wZUZvcm0uZ3JpZEZvcm0uJHZhbGlkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgJGh0dHAocGFyYW1zKS50aGVuKGFjdGlvblVwZGF0ZVN1Y2Nlc3MsIGFjdGlvblVwZGF0ZUVycm9yKTtcblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZVN1Y2Nlc3MoKSB7XG4gICAgICBvYmouZ2V0Rm9ybUluZm8oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICBzY29wZS5zY2hlbWEgPSBmb3JtLnNjaGVtYTtcbiAgICAgICAgc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICAgc2NvcGUubW9kZWwgPSBmb3JtLm1vZGVsO1xuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogb2JqLmdldE1lc3NhZ2UoJ3N1Y2Nlc3NVcGRhdGVkJylcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25VcGRhdGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgb2JqLmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZEZvcm0nLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRm9ybSwgZ3JpZEFjdGlvbnMpIHtcbiAgICAkc2NvcGUuYWxlcnRzID0gW107XG5cbiAgICAkc2NvcGUuc2NvcGVGb3JtID0ge1xuICAgICAgZ3JpZEZvcm06IHt9XG4gICAgfTtcblxuICAgICRzY29wZS5zZXRGb3JtU2NvcGUgPSBmdW5jdGlvbihzY29wZSkge1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICB2YXIgZm9ybUluc3QgPSBuZXcgZ3JpZEZvcm0oJHNjb3BlLmdyaWRNb2RlbCk7XG5cbiAgICBmb3JtSW5zdC5nZXRGb3JtSW5mbyhmdW5jdGlvbihmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybUluc3QsIGZvcm0ubGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGZvcm1JbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufVxuIiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ2dyaWRUYWJsZScsIGdyaWRUYWJsZURpcmVjdGl2ZSk7XG5cbmdyaWRUYWJsZURpcmVjdGl2ZS4kaW5qZWN0ID0gWydncmlkVGFibGUnLCAnZ3JpZC1hY3Rpb25zJ107XG5cbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkVGFibGUsIGdyaWRBY3Rpb25zKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgY29udHJvbGxlcjogZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybFxuICAgIH07XG5cbiAgZ3JpZFRhYmxlRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckdGltZW91dCcsICckc2NvcGUnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwoJHRpbWVvdXQsICRzY29wZSkge1xuICAgIC8qKiBAdHlwZSB7Z3JpZFRhYmxlfSAqL1xuICAgIHZhciB0YWJsZUluc3QgPSBuZXcgZ3JpZFRhYmxlKCRzY29wZS5ncmlkTW9kZWwpO1xuXG4gICAgJHNjb3BlLmFsZXJ0cyA9IFtdO1xuICAgICRzY29wZS50YWJsZUluc3QgPSB0YWJsZUluc3Q7XG5cbiAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdvbkJlZm9yZUxvYWREYXRhJyk7XG5cbiAgICAgIHRhYmxlSW5zdC5nZXRUYWJsZUluZm8oZnVuY3Rpb24odGFibGUpIHtcbiAgICAgICAgJHNjb3BlLnJvd3MgPSB0YWJsZS5yb3dzO1xuICAgICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAgICRzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuXG4gICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdvbkxvYWREYXRhJyk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgJHNjb3BlLmVkaXQgPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24odGFibGVJbnN0LCBsaW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuY2xvc2VBbGVydCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuYWxlcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd0YWJsZVBhZ2luYXRpb24nLCB0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUpO1xuXG50YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUuJGluamVjdCA9IFtdO1xuXG5mdW5jdGlvbiB0YWJsZVBhZ2luYXRpb25EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHRhYmxlSW5zdDogJz10YWJsZSdcbiAgICB9LFxuICAgIHJlcXVpcmU6ICdeZ3JpZFRhYmxlJyxcbiAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLXBhZ2luYXRpb24uaHRtbCcsXG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBjb250cm9sbGVyOiB0YWJsZVBhZ2luYXRpb25DdHJsXG4gIH07XG5cbiAgdGFibGVQYWdpbmF0aW9uQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJGxvY2F0aW9uJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiB0YWJsZVBhZ2luYXRpb25DdHJsKCRzY29wZSwgJGxvY2F0aW9uKSB7XG5cbiAgICAvKiogQHR5cGUge2dyaWRQYWdpbmF0aW9ufSAqL1xuICAgIHZhciBwYWdpbmF0aW9uID0gJHNjb3BlLnRhYmxlSW5zdC5wYWdpbmF0aW9uO1xuXG4gICAgJHNjb3BlLiRvbignb25CZWZvcmVMb2FkRGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgcGFnaW5hdGlvbi5zZXRDdXJyZW50UGFnZSgkbG9jYXRpb24uc2VhcmNoKCkucGFnZSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuJG9uKCdvbkxvYWREYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAkc2NvcGUuc2hvdyA9IHRydWU7XG4gICAgICAkc2NvcGUuc2V0UGFnaW5hdGlvbigpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFBhZ2luYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS50b3RhbEl0ZW1zID0gcGFnaW5hdGlvbi5nZXRUb3RhbENvdW50KCk7XG4gICAgICAkc2NvcGUuY3VycmVudFBhZ2UgPSBwYWdpbmF0aW9uLmdldEN1cnJlbnRQYWdlKCk7XG4gICAgICAkc2NvcGUuaXRlbXNQZXJQYWdlID0gcGFnaW5hdGlvbi5nZXRQZXJQYWdlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5wYWdlQ2hhbmdlZCA9IGZ1bmN0aW9uKHBhZ2VObykge1xuICAgICAgcGFnaW5hdGlvbi5zZXRDdXJyZW50UGFnZShwYWdlTm8pO1xuICAgICAgJHNjb3BlLmN1cnJlbnRQYWdlID0gcGFnaW5hdGlvbi5nZXRDdXJyZW50UGFnZSgpO1xuICAgICAgJGxvY2F0aW9uLnNlYXJjaCgncGFnZScsIHBhZ2VObyk7XG4gICAgfTtcblxuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3RhYmxlVGhlYWQnLCBncmlkVGhlYWREaXJlY3RpdmUpO1xuXG5ncmlkVGhlYWREaXJlY3RpdmUuJGluamVjdCA9IFtdO1xuXG5mdW5jdGlvbiBncmlkVGhlYWREaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgc2NvcGU6IHtcbiAgICAgIHRhYmxlSW5zdDogJz10YWJsZSdcbiAgICB9LFxuICAgIHJlcXVpcmU6ICdeZ3JpZFRhYmxlJyxcbiAgICB0ZW1wbGF0ZVVybDogJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLWhlYWQuaHRtbCcsXG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICBjb250cm9sbGVyOiBncmlkVGhlYWRDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRyKSB7XG4gICAgICAvL2NvbnNvbGUubG9nKGF0dHIpO1xuICAgIH1cbiAgfTtcblxuICBncmlkVGhlYWRDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICckbG9jYXRpb24nXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIGdyaWRUaGVhZEN0cmwoJHNjb3BlLCAkbG9jYXRpb24pIHtcblxuICAgIC8qKiBAdHlwZSB7U29ydGluZ30gKi9cbiAgICB2YXIgc29ydGluZyA9ICRzY29wZS50YWJsZUluc3Quc29ydGluZztcblxuICAgICRzY29wZS4kb24oJ29uQmVmb3JlTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdzb3J0aW5nIGJlZm9yZSBsb2FkJyk7XG4gICAgICBzZXRTb3J0aW5nQnlTZWFyY2goJGxvY2F0aW9uLnNlYXJjaCgpKTtcbiAgICB9KTtcblxuICAgICRzY29wZS4kb24oJ29uTG9hZERhdGEnLCBmdW5jdGlvbigpIHtcbiAgICAgICRzY29wZS5jb2x1bW5zID0gJHNjb3BlLnRhYmxlSW5zdC5jb2x1bW5zO1xuICAgICAgJHNjb3BlLnNvcnRGaWVsZHMgPSBzb3J0aW5nLnNvcnRGaWVsZHM7XG4gICAgICAkc2NvcGUuc2V0U29ydGluZygpO1xuICAgIH0pO1xuXG4gICAgJHNjb3BlLnNldFNvcnRpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBmaWVsZCA9IHNvcnRpbmcuZ2V0Q29sdW1uKCk7XG5cbiAgICAgIGlmIChmaWVsZCkge1xuICAgICAgICBfLndoZXJlKHRoaXMuY29sdW1ucywgeydhdHRyaWJ1dGVOYW1lJzogZmllbGR9KVswXS5zb3J0aW5nID0gc29ydGluZy5kaXJlY3Rpb247XG4gICAgICB9XG4gICAgfTtcblxuICAgICRzY29wZS5zb3J0QnkgPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgIHZhciBkaXJlY3Rpb247XG5cbiAgICAgIGNvbHVtbi5zb3J0aW5nID0gZGlyZWN0aW9uID0gc29ydGluZy5nZXREaXJlY3Rpb25Db2x1bW4oY29sdW1uLnNvcnRpbmcpO1xuICAgICAgJHNjb3BlLnRhYmxlSW5zdC5zZXRTb3J0aW5nKGNvbHVtbi5hdHRyaWJ1dGVOYW1lLCBkaXJlY3Rpb24pO1xuICAgICAgJGxvY2F0aW9uLnNlYXJjaCgnc29ydCcsICRzY29wZS50YWJsZUluc3QuZ2V0U29ydGluZ1BhcmFtVmFsdWUoKSk7XG5cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0U29ydGluZ0J5U2VhcmNoKGZpZWxkcykge1xuICAgICAgdmFyIHNvcnRpbmcgPSAkc2NvcGUudGFibGVJbnN0LnNvcnRpbmc7XG5cbiAgICAgIGlmICghZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgcG9zID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5sYXN0SW5kZXhPZignXycpO1xuICAgICAgdmFyIGZpZWxkID0gZmllbGRzW3NvcnRpbmcuc29ydFBhcmFtXS5zbGljZSgwLCBwb3MpO1xuICAgICAgdmFyIGRpcmVjdGlvbiA9IGZpZWxkc1tzb3J0aW5nLnNvcnRQYXJhbV0uc2xpY2UocG9zICsgMSk7XG5cbiAgICAgIHNvcnRpbmcuc2V0U29ydGluZyhmaWVsZCwgZGlyZWN0aW9uKTtcbiAgICB9XG5cbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCd2bXNHcmlkJywgdm1zR3JpZERpcmVjdGl2ZSk7XG5cbmZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZTogJzxuZy1pbmNsdWRlIHNyYz1cImdldFRlbXBsYXRlVXJsKClcIiAvPicsXG4gICAgc2NvcGU6IHtcbiAgICAgIGdyaWRNb2RlbDogJz1ncmlkTW9kZWwnXG4gICAgfSxcbiAgICBjb250cm9sbGVyOiB2bXNHcmlkRGlyZWN0aXZlQ3RybCxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWwsIGF0dHIsIGN0cmwpIHtcblxuICAgIH1cbiAgfTtcblxuICB2bXNHcmlkRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnXTtcblxuICByZXR1cm4gZGlyZWN0aXZlO1xuXG4gIGZ1bmN0aW9uIHZtc0dyaWREaXJlY3RpdmVDdHJsKCRzY29wZSkge1xuICAgICRzY29wZS5nZXRUZW1wbGF0ZVVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCRzY29wZS5ncmlkTW9kZWwucGFyYW1zLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICd0ZW1wbGF0ZXMvZ3JpZC90YWJsZS5odG1sJztcbiAgICB9O1xuXG4gIH1cbn0iLCJhbmd1bGFyLm1vZHVsZShcImdyaWRcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvZm9ybS5odG1sXCIsXCI8Z3JpZC1mb3JtPlxcbiAgICA8c3BhbiBuZy1yZXBlYXQ9XFxcImxpbmsgaW4gbGlua3NcXFwiPlxcbiAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZ28obGluaylcXFwiPnt7bGluay50aXRsZX19PC9hPlxcbiAgICA8L3NwYW4+XFxuXFxuICAgIDxkaXY+XFxuICAgICAgICA8YWxlcnQgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBhbGVydHNcXFwiIHR5cGU9XFxcInt7YWxlcnQudHlwZX19XFxcIiBjbG9zZT1cXFwiY2xvc2VBbGVydCgkaW5kZXgpXFxcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD5cXG4gICAgPC9kaXY+XFxuICAgIDxmb3JtIG5vdmFsaWRhdGUgbmFtZT1cXFwiZ3JpZEZvcm1cXFwiIG5nLWluaXQ9XFxcInNldEZvcm1TY29wZSh0aGlzKVxcXCJcXG4gICAgICAgICAgc2Ytc2NoZW1hPVxcXCJzY2hlbWFcXFwiIHNmLWZvcm09XFxcImZvcm1cXFwiIHNmLW1vZGVsPVxcXCJtb2RlbFxcXCJcXG4gICAgICAgICAgY2xhc3M9XFxcImZvcm0taG9yaXpvbnRhbFxcXCIgcm9sZT1cXFwiZm9ybVxcXCIgbmctaWY9XFxcImhpZGVGb3JtICE9PSB0cnVlXFxcIj5cXG4gICAgPC9mb3JtPlxcbjwvZ3JpZC1mb3JtPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRlbXBsYXRlcy9ncmlkL3RhYmxlLWhlYWQuaHRtbFwiLFwiPHRyPlxcbiAgICA8dGggbmctcmVwZWF0PVxcXCJjb2x1bW4gaW4gY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IG5nLWlmPVxcXCJzb3J0RmllbGRzLmluZGV4T2YoY29sdW1uLmF0dHJpYnV0ZU5hbWUpPj0wXFxcIiBjbGFzcz1cXFwidGgtaW5uZXIgc29ydGFibGVcXFwiIG5nLWNsaWNrPVxcXCJzb3J0QnkoY29sdW1uLCAkZXZlbnQpXFxcIj57e2NvbHVtbi50aXRsZX19XFxuICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5zb3J0aW5nXFxcIiBjbGFzcz1cXFwib3JkZXJcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnZHJvcHVwXFwnOiBjb2x1bW4uc29ydGluZz09XFwnZGVzY1xcJ31cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiY2FyZXRcXFwiIHN0eWxlPVxcXCJtYXJnaW46IDBweCA1cHg7XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IG5nLWlmPVxcXCJzb3J0RmllbGRzLmluZGV4T2YoY29sdW1uLmF0dHJpYnV0ZU5hbWUpPDBcXFwiIGNsYXNzPVxcXCJ0aC1pbm5lclxcXCI+e3tjb2x1bW4udGl0bGV9fTwvZGl2PlxcbiAgICA8L3RoPlxcbjwvdHI+XFxuXCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUtcGFnaW5hdGlvbi5odG1sXCIsXCI8cGFnaW5hdGlvbiBuZy1pZj1cXFwic2hvd1xcXCIgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCIgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiIGl0ZW1zLXBlci1wYWdlPVxcXCJpdGVtc1BlclBhZ2VcXFwiIHRvdGFsLWl0ZW1zPVxcXCJ0b3RhbEl0ZW1zXFxcIiBuZy1tb2RlbD1cXFwiY3VycmVudFBhZ2VcXFwiIG5nLWNoYW5nZT1cXFwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXFxcIj48L3BhZ2luYXRpb24+XFxuXCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbFwiLFwiPGdyaWQtdGFibGU+XFxuICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiBsaW5rc1xcXCI+XFxuICAgICAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZWRpdChsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8YWxlcnQgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBhbGVydHNcXFwiIHR5cGU9XFxcInt7YWxlcnQudHlwZX19XFxcIiBjbG9zZT1cXFwiY2xvc2VBbGVydCgkaW5kZXgpXFxcIj57e2FsZXJ0Lm1zZ319PC9hbGVydD5cXG5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ0YWJsZSBncmlkXFxcIj5cXG4gICAgICAgIDx0aGVhZCB0YWJsZS10aGVhZCB0YWJsZT1cXFwidGFibGVJbnN0XFxcIj48L3RoZWFkPlxcbiAgICAgICAgPHRib2R5PlxcbiAgICAgICAgICAgIDx0ciBuZy1yZXBlYXQ9XFxcInJvdyBpbiByb3dzXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRkIG5nLXJlcGVhdD1cXFwiY29sdW1uIGluIGNvbHVtbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gbmctaWY9XFxcImNvbHVtbi5hdHRyaWJ1dGVOYW1lICE9PSBcXCdsaW5rc1xcJ1xcXCI+e3tyb3dbY29sdW1uLmF0dHJpYnV0ZU5hbWVdfX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBuZy1pZj1cXFwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgPT0gXFwnbGlua3NcXCdcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIG5nLXJlcGVhdD1cXFwibGluayBpbiByb3cubGlua3NcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMCk7XFxcIiBuZy1jbGljaz1cXFwiZWRpdChsaW5rKVxcXCI+e3tsaW5rLnRpdGxlfX08L2E+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbiAgICA8ZGl2IHRhYmxlLXBhZ2luYXRpb24gdGFibGU9XFxcInRhYmxlSW5zdFxcXCI+PC9kaXY+XFxuPC9ncmlkLXRhYmxlPlxcblxcbjwhLS08cGFnaW5hdGlvbiBuZy1pZj1cXFwicm93c1xcXCIgZGlyZWN0aW9uLWxpbmtzPVxcXCJmYWxzZVxcXCIgYm91bmRhcnktbGlua3M9XFxcInRydWVcXFwiIGl0ZW1zLXBlci1wYWdlPVxcXCJpdGVtc1BlclBhZ2VcXFwiIHRvdGFsLWl0ZW1zPVxcXCJ0b3RhbEl0ZW1zXFxcIiBuZy1tb2RlbD1cXFwiY3VycmVudFBhZ2VcXFwiIG5nLWNoYW5nZT1cXFwicGFnZUNoYW5nZWQoY3VycmVudFBhZ2UpXFxcIj48L3BhZ2luYXRpb24+LS0+XCIpO31dKTsiXSwic291cmNlUm9vdCI6Ii4uL3NyYy8ifQ==