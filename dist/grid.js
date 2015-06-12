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
        angular.module('grid').run([
            '$templateCache',
            function ($templateCache) {
                $templateCache.put('templates/grid/table.html', '<grid-table>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '<table class="table grid">' + '<thead>' + '<tr>' + '<th ng-repeat="column in columns">{{column.title}}</th>' + '</tr>' + '</thead>' + '<tbody>' + '<tr ng-repeat="row in rows">' + '<td ng-repeat="column in columns">' + '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>' + '<span ng-if="column.attributeName == \'links\'">' + '<span ng-repeat="link in row.links">' + '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' + '</span>' + '</span>' + '</td>' + '</tr>' + '</tbody>' + '</table>' + '</grid-table>');
                $templateCache.put('templates/grid/form.html', '<grid-form>' + '<span ng-repeat="link in links">' + '<a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a> ' + '</span>' + '<div>' + '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>' + '</div>' + '<form novalidate name="gridForm" ng-init="setFormScope(this)"' + 'sf-schema="schema" sf-form="form" sf-model="model"' + 'class="form-horizontal" role="form" ng-if="hideForm !== true">' + '</form>' + '</grid-form>');
            }
        ]);
        angular.module('grid').factory('_', function () {
            return lodash;
        });
        angular.module('grid').provider('grid-entity', gridEntity);
        function gridEntity() {
            var data, schema;
            var provider = { $get: gridEntityGet };
            gridEntityGet.$inject = [
                '$timeout',
                '$interval',
                '_'
            ];
            return provider;
            function gridEntityGet($timeout, $interval, _) {
                var model, messages = {
                        successDeleted: 'Successfully delete',
                        successCreated: 'Successfully create',
                        successUpdated: 'Successfully update',
                        serverError: 'Oops! server error'
                    };
                return {
                    //cache: {},
                    default: { actionGetResource: 'read' },
                    TYPE_FORM: 'form',
                    TYPE_TABLE: 'table',
                    type: '',
                    config: {},
                    setData: setData,
                    setModel: setModel,
                    getModel: getModel,
                    setSchema: setSchema,
                    getMessage: getMessage,
                    setMessage: setMessage,
                    fetchData: fetchData,
                    loadData: loadData,
                    loadSchema: loadSchema,
                    getTableInfo: getTableInfo,
                    getFormInfo: getFormInfo,
                    fetchCollection: fetchCollection,
                    _getRelationResource: _getRelationResource,
                    _replaceFromFull: _replaceFromFull,
                    _getRelationLink: _getRelationLink,
                    _createTitleMap: _createTitleMap,
                    _getFormConfig: _getFormConfig,
                    _getFieldsForm: _getFieldsForm,
                    _getRowsByData: _getRowsByData,
                    _getEmptyData: _getEmptyData,
                    _batchLoadData: _batchLoadData
                };
                function setData(value) {
                    data = value;
                }
                function setSchema(value) {
                    schema = value;
                }
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
                function fetchData(url, callback) {
                    /*jshint validthis: true */
                    var self = this;
                    if (model.params.type === 'create') {
                        self.loadSchema(url, fetchDataSuccess);
                    } else {
                        self.loadData(url, fetchDataSuccess);
                    }
                    function fetchDataSuccess(data, schema) {
                        self.setData(data);
                        self.setSchema(schema);
                        if (callback !== undefined) {
                            callback(data, schema);
                        }
                    }
                }
                /**
     * Fetch data by url and include schema from header data
     * @param url
     * @param callback
     * @returns {boolean}
     */
                function loadData(url, callback) {
                    /*jshint validthis: true */
                    var self = this;
                    if (model === undefined) {
                        alert('Please set model before call fetch data');
                        return false;
                    }
                    /*if (_.isEmpty(self.cache[url])===false) {
        console.log('cache');
        callback(self.cache[url].data, self.cache[url].schema, self.cache[url].request);
        return false;
      }*/
                    Jsonary.getData(url, function (jData, request) {
                        var data = jData;
                        var schema = jData.property('data').schemas()[0].data.document.raw.value();
                        console.log('load');
                        /*self.cache[url] = {
          data: data,
          schema: schema,
          request: request
        };*/
                        if (callback !== undefined) {
                            callback(data, schema, request);
                        }
                    });    //self.cache[url] = {};
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
                function _getEmptyData(schema, fullSchema) {
                    var result;
                    var schemaWithoutRef = mergeRelSchema(schema, fullSchema);
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
                function getTableInfo(callback) {
                    /*jshint validthis: true */
                    var self = this, model = self.getModel(), url;
                    url = getResourceUrl(model.url, model.params);
                    $timeout(function () {
                        self.fetchData(url, fetchDataSuccess);
                    });
                    function fetchDataSuccess(data, schema) {
                        var schemaWithoutRef = mergeRelSchema(data.schemas()[0].data.value(), schema);
                        self.type = self.TYPE_TABLE;
                        if (!self.config.table) {
                            self.config.table = {};
                        }
                        self._getRowsByData(data, function (rows, relations) {
                            self.config.table.rows = rowsToTableFormat(rows);
                            self.config.table.links = data.links();
                            self.config.table.columns = getColumnsBySchema(schemaWithoutRef);
                            self.config.table.columns.push({
                                title: 'Actions',
                                type: 'string',
                                attributeName: 'links'
                            });
                            if (callback !== undefined) {
                                callback(self.config.table);
                            }
                        });
                    }
                }
                /**
     *
     * @param callback
     */
                function getFormInfo(callback) {
                    /*jshint validthis: true */
                    var self = this, model = self.getModel(), url;
                    url = getResourceUrl(model.url, model.params);
                    $timeout(function () {
                        self.fetchData(url, fetchDataSuccess);
                    });
                    function fetchDataSuccess(data, schema) {
                        var newData = data.property('data').property('attributes');
                        var schemaWithoutRef = mergeRelSchema(newData.schemas()[0].data.value(), schema);
                        self.type = self.TYPE_FORM;
                        if (!self.config.form) {
                            self.config.form = {};
                        }
                        self._getFieldsForm(data, function (fields, relations) {
                            self.config.form.links = data.links();
                            self.config.form.schema = schemaWithoutRef;
                            self.config.form.model = fieldsToFormFormat(fields);
                            self._getFormConfig(data, callbackFormConfig);
                            function callbackFormConfig(config) {
                                self.config.form.form = config;
                                /** add button to config form */
                                self.config.form.form = _.union(self.config.form.form, getFormButtonBySchema(data.property('data').links()));
                                if (callback !== undefined) {
                                    callback(self.config.form);
                                }
                            }
                        });
                    }
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
                        var attributes = mergeRelSchema(data.property('data').schemas()[0].data.value(), data.schemas()[0].data.document.raw.value()).properties.attributes.properties;
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
     * Create titleMap for form and load dependency resource
     * @param data
     * @param callback
     * @private
     */
                function _createTitleMap(data, callback) {
                    var self = this;
                    var dataRelations = data.property('relationships');
                    var dataAttributes = data.property('attributes');
                    var relations = dataRelations.value();
                    var attributes = dataAttributes.value();
                    var documentSchema = data.schemas()[0].data.document.raw.value();
                    var sourceTitleMaps = [];
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
                            var url = resourceLink + '/' + self.default.actionGetResource + '/' + enumItem;
                            sourceTitleMaps.push({
                                url: url,
                                enumItem: enumItem,
                                relationName: key,
                                attributeName: attributeName
                            });
                        });
                    });
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
     * Multiple load resource by array links
     * @param linkResources
     * @param callback
     */
                function fetchCollection(linkResources, callback) {
                    var self = this;
                    var loaded = 0;
                    var total = 0;
                    var resources = {};
                    linkResources = _.uniq(linkResources);
                    _.forEach(linkResources, function (url) {
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
     * Recursive function replacing $ref from schema
     * @param haystack
     * @param schemaFull
     * @returns {*}
     */
                function _replaceFromFull(haystack, schemaFull) {
                    for (var key in haystack) {
                        if (haystack.hasOwnProperty(key)) {
                            if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && haystack[key].$ref) {
                                haystack[key] = Object.byString(schemaFull, haystack[key].$ref.substring(2));
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
                function fieldsToFormFormat(resource) {
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
     * Convert array Jsonary Data to result array for rendering table
     *
     * @param rows
     * @returns {Array}
     */
                function rowsToTableFormat(rows) {
                    var result = [];
                    _.forEach(rows, function (resource) {
                        var data = resource.own;
                        var tmp = data.property('attributes').value();
                        _.forEach(resource.relationships, function (relation, key) {
                            tmp[key] = _.map(relation, function (relationItem) {
                                var field = resource.own.property('relationships').property(key).schemas()[0].data.propertyValue('name');
                                /**
             * name additional field(relation resource)
             */
                                if (field) {
                                    return relationItem.property('data').property('attributes').propertyValue(field);
                                }
                                return relationItem.property('data').propertyValue('id');
                            }).join(', ');
                        });
                        tmp.links = [];
                        _.forOwn(data.links(), function (link) {
                            tmp.links.push(link);
                        });
                        result.push(tmp);
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
                                url: getResourceUrl(relItem.links.self, {
                                    type: self.default.actionGetResource,
                                    id: dataObj.id
                                })
                            });
                        });
                        resource = linkArray;
                    } else {
                        resource = [{
                                url: getResourceUrl(relItem.links.self, {
                                    type: self.default.actionGetResource,
                                    id: relItem.data.id
                                })
                            }];
                    }
                    return resource;
                }
                /**
     * Multiple (batch) load data
     *
     * @param included
     * @param callback
     */
                function _batchLoadData(included, callback) {
                    var self = this;
                    var result = [];
                    var cached = {};
                    var loadResourcesUrl = [];
                    _.forEach(included, function (item) {
                        _.forEach(item, function (rel) {
                            _.forEach(rel, function (relItem) {
                                loadResourcesUrl.push(relItem.url);
                            });
                        });
                    });
                    self.fetchCollection(loadResourcesUrl, function (resources) {
                        _.forEach(included, function (item, ki) {
                            _.forEach(item, function (rel, kr) {
                                _.forEach(rel, function (relItem, kri) {
                                    result[ki] = result[ki] || {};
                                    result[ki][kr] = result[ki][kr] || [];
                                    result[ki][kr][kri] = resources[relItem.url];
                                });
                            });
                        });
                        callback(result);
                    });
                }
                /**
     *
     * @param links
     * @returns {Array}
     */
                function getFormButtonBySchema(links) {
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
        }
        Object.byString = function (obj, path) {
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
        };
        angular.module('grid').factory('grid-action-create', gridActionCreate);
        gridActionCreate.$inject = [
            '$http',
            'grid-entity'
        ];
        function gridActionCreate($http, gridEntity) {
            return function (link, scope) {
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
                    gridEntity.getFormInfo(function (form) {
                        scope.schema = form.schema;
                        scope.form = form.form;
                        scope.model = form.model;
                        scope.alerts.push({
                            type: 'success',
                            msg: gridEntity.getMessage('successCreated')
                        });
                    });
                }
                function actionCreateError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || gridEntity.getMessage('serverError')
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
            return function (link, scope) {
                var params = {
                    method: link.method,
                    url: link.href
                };
                $http(params).then(actionDeleteSuccess, actionDeleteError);
                function actionDeleteSuccess() {
                    if (gridEntity.type === gridEntity.TYPE_TABLE) {
                        gridEntity.getTableInfo(function (table) {
                            scope.rows = table.rows;
                            scope.columns = table.columns;
                            scope.links = table.links;
                        });
                    } else if (gridEntity.type === gridEntity.TYPE_FORM) {
                        scope.hideForm = true;
                    }
                    scope.alerts.push({
                        type: 'success',
                        msg: gridEntity.getMessage('successDeleted')
                    });
                }
                function actionDeleteError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || gridEntity.getMessage('serverError')
                    });
                }
            };
        }
        angular.module('grid').factory('grid-action-goTo', gridActionGoTo);
        gridActionGoTo.$inject = ['$location'];
        function gridActionGoTo($location) {
            return function (link) {
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
                    action: function (link, scope) {
                        this.actions[link.definition.data.propertyValue('rel')](link, scope);
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
            return function (link, scope) {
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
                    gridEntity.getFormInfo(function (form) {
                        scope.schema = form.schema;
                        scope.form = form.form;
                        scope.model = form.model;
                        scope.alerts.push({
                            type: 'success',
                            msg: gridEntity.getMessage('successUpdated')
                        });
                    });
                }
                function actionUpdateError(res) {
                    scope.alerts.push({
                        type: 'danger',
                        msg: res.statusText || gridEntity.getMessage('serverError')
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
                'grid-entity',
                'grid-actions'
            ];
            return directive;
            function gridFormDirectiveCtrl($scope, gridEntity, gridActions) {
                $scope.alerts = [];
                $scope.scopeForm = { gridForm: {} };
                $scope.setFormScope = function (scope) {
                    $scope.scopeForm = scope;
                };
                gridEntity.getFormInfo(function (form) {
                    $scope.schema = form.schema;
                    $scope.form = form.form;
                    $scope.model = form.model;
                    $scope.links = form.links;
                    $scope.$digest();
                });
                $scope.edit = function ($event, form) {
                    gridActions.action(form.link, $scope);
                };
                $scope.go = function (link) {
                    gridActions.action(link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
                };
            }
        }
        angular.module('grid').directive('gridTable', gridTableDirective);
        gridTableDirective.$inject = [
            'grid-entity',
            'grid-actions'
        ];
        //TODO: should be set require ... depends on vmsGrid
        function gridTableDirective(gridEntity, gridActions) {
            var directive = {
                restrict: 'E',
                controller: gridTableDirectiveCtrl
            };
            gridTableDirectiveCtrl.$inject = ['$scope'];
            return directive;
            function gridTableDirectiveCtrl($scope) {
                $scope.alerts = [];
                gridEntity.getTableInfo(function (table) {
                    $scope.rows = table.rows;
                    $scope.columns = table.columns;
                    $scope.links = table.links;    //$scope.$digest();
                });
                $scope.edit = function (link) {
                    gridActions.action(link, $scope);
                };
                $scope.closeAlert = function (index) {
                    $scope.alerts.splice(index, 1);
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
            vmsGridDirectiveCtrl.$inject = [
                '$scope',
                'grid-entity'
            ];
            return directive;
            function vmsGridDirectiveCtrl($scope, gridEntity) {
                $scope.getTemplateUrl = function () {
                    if ($scope.gridModel.params.type) {
                        return 'templates/grid/form.html';
                    }
                    return 'templates/grid/table.html';
                };
                gridEntity.setModel($scope.gridModel);
            }
        }
    }
    return vmsGrid;
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZHVsZS5qcyIsImdyaWQuanMiLCJhY3Rpb25zL2NyZWF0ZS5qcyIsImFjdGlvbnMvZGVsZXRlLmpzIiwiYWN0aW9ucy9nb1RvLmpzIiwiYWN0aW9ucy9tYWluLmpzIiwiYWN0aW9ucy91cGRhdGUuanMiLCJkaXJlY3RpdmVzL2dyaWQtZm9ybS5qcyIsImRpcmVjdGl2ZXMvZ3JpZC10YWJsZS5qcyIsImRpcmVjdGl2ZXMvdm1zLWdyaWQuanMiXSwibmFtZXMiOlsiZGVwcyIsImFuZ3VsYXIiLCJtb2R1bGUiLCJwdXNoIiwiZSIsInZtc0dyaWQiLCJydW4iLCIkdGVtcGxhdGVDYWNoZSIsInB1dCIsImZhY3RvcnkiLCJsb2Rhc2giLCJwcm92aWRlciIsImdyaWRFbnRpdHkiLCJkYXRhIiwic2NoZW1hIiwiJGdldCIsImdyaWRFbnRpdHlHZXQiLCIkaW5qZWN0IiwiJHRpbWVvdXQiLCIkaW50ZXJ2YWwiLCJfIiwibW9kZWwiLCJtZXNzYWdlcyIsInN1Y2Nlc3NEZWxldGVkIiwic3VjY2Vzc0NyZWF0ZWQiLCJzdWNjZXNzVXBkYXRlZCIsInNlcnZlckVycm9yIiwiZGVmYXVsdCIsImFjdGlvbkdldFJlc291cmNlIiwiVFlQRV9GT1JNIiwiVFlQRV9UQUJMRSIsInR5cGUiLCJjb25maWciLCJzZXREYXRhIiwic2V0TW9kZWwiLCJnZXRNb2RlbCIsInNldFNjaGVtYSIsImdldE1lc3NhZ2UiLCJzZXRNZXNzYWdlIiwiZmV0Y2hEYXRhIiwibG9hZERhdGEiLCJsb2FkU2NoZW1hIiwiZ2V0VGFibGVJbmZvIiwiZ2V0Rm9ybUluZm8iLCJmZXRjaENvbGxlY3Rpb24iLCJfZ2V0UmVsYXRpb25SZXNvdXJjZSIsIl9yZXBsYWNlRnJvbUZ1bGwiLCJfZ2V0UmVsYXRpb25MaW5rIiwiX2NyZWF0ZVRpdGxlTWFwIiwiX2dldEZvcm1Db25maWciLCJfZ2V0RmllbGRzRm9ybSIsIl9nZXRSb3dzQnlEYXRhIiwiX2dldEVtcHR5RGF0YSIsIl9iYXRjaExvYWREYXRhIiwidmFsdWUiLCJNb2RlbCIsInBhcmFtIiwibWVzc2FnZSIsInVybCIsImNhbGxiYWNrIiwic2VsZiIsInBhcmFtcyIsImZldGNoRGF0YVN1Y2Nlc3MiLCJ1bmRlZmluZWQiLCJhbGVydCIsIkpzb25hcnkiLCJnZXREYXRhIiwiakRhdGEiLCJyZXF1ZXN0IiwicHJvcGVydHkiLCJzY2hlbWFzIiwiZG9jdW1lbnQiLCJyYXciLCJjb25zb2xlIiwibG9nIiwiZ2V0U2NoZW1hIiwialNjaGVtYSIsImNyZWF0ZSIsImFkZFNjaGVtYSIsImZ1bGxTY2hlbWEiLCJyZXN1bHQiLCJzY2hlbWFXaXRob3V0UmVmIiwibWVyZ2VSZWxTY2hlbWEiLCJjbG9uZSIsInByb3BlcnRpZXMiLCJnZXRUeXBlUHJvcGVydHkiLCJhdHRyaWJ1dGVzIiwib2JqIiwidG1wT2JqIiwiZm9yRWFjaCIsImtleSIsImdldFJlc291cmNlVXJsIiwicmVzb3VyY2UiLCJpZCIsInRhYmxlIiwicm93cyIsInJlbGF0aW9ucyIsInJvd3NUb1RhYmxlRm9ybWF0IiwibGlua3MiLCJjb2x1bW5zIiwiZ2V0Q29sdW1uc0J5U2NoZW1hIiwidGl0bGUiLCJhdHRyaWJ1dGVOYW1lIiwibmV3RGF0YSIsImZvcm0iLCJmaWVsZHMiLCJmaWVsZHNUb0Zvcm1Gb3JtYXQiLCJjYWxsYmFja0Zvcm1Db25maWciLCJ1bmlvbiIsImdldEZvcm1CdXR0b25CeVNjaGVtYSIsInRpdGxlTWFwcyIsInRpdGxlTWFwIiwiaW5jbHVkZWQiLCJiYXRjaExvYWRlZCIsInJlbGF0aW9uUmVzb3VyY2VzIiwib3duIiwicmVsYXRpb25zaGlwcyIsIm1hcFZhbHVlcyIsIm4iLCJpdGVtIiwiaW5kZXgiLCJkYXRhUmVsYXRpb25zIiwiZGF0YUF0dHJpYnV0ZXMiLCJkb2N1bWVudFNjaGVtYSIsInNvdXJjZVRpdGxlTWFwcyIsInJlc291cmNlTGluayIsInByb3BlcnR5VmFsdWUiLCJzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmIiwic291cmNlRW51bSIsIml0ZW1zIiwiZW51bSIsImVudW1JdGVtIiwicmVsYXRpb25OYW1lIiwibWFwIiwicmVzb3VyY2VzIiwibmFtZSIsImxpbmtSZXNvdXJjZXMiLCJsb2FkZWQiLCJ0b3RhbCIsInVuaXEiLCJpbnRlcnZhbCIsImNhbmNlbCIsImhheXN0YWNrIiwic2NoZW1hRnVsbCIsImhhc093blByb3BlcnR5IiwiQXJyYXkiLCJpc0FycmF5IiwiJHJlZiIsIk9iamVjdCIsImJ5U3RyaW5nIiwic3Vic3RyaW5nIiwicmVsYXRpb24iLCJyZWxhdGlvbkl0ZW0iLCJ0bXAiLCJmaWVsZCIsImpvaW4iLCJmb3JPd24iLCJsaW5rIiwicmVzIiwicm93IiwidG1wUm93IiwicmVsSXRlbSIsInJlbEtleSIsImxpbmtBcnJheSIsImRhdGFPYmoiLCJjYWNoZWQiLCJsb2FkUmVzb3VyY2VzVXJsIiwicmVsIiwia2kiLCJrciIsImtyaSIsIm9uQ2xpY2siLCJwYXRoIiwicmVwbGFjZSIsImEiLCJzcGxpdCIsImkiLCJsZW5ndGgiLCJrIiwiZ3JpZEFjdGlvbkNyZWF0ZSIsIiRodHRwIiwic2NvcGUiLCJtZXRob2QiLCJocmVmIiwiJGJyb2FkY2FzdCIsInNjb3BlRm9ybSIsImdyaWRGb3JtIiwiJHZhbGlkIiwidGhlbiIsImFjdGlvbkNyZWF0ZVN1Y2Nlc3MiLCJhY3Rpb25DcmVhdGVFcnJvciIsImFsZXJ0cyIsIm1zZyIsInN0YXR1c1RleHQiLCJncmlkQWN0aW9uRGVsZXRlIiwiYWN0aW9uRGVsZXRlU3VjY2VzcyIsImFjdGlvbkRlbGV0ZUVycm9yIiwiaGlkZUZvcm0iLCJncmlkQWN0aW9uR29UbyIsIiRsb2NhdGlvbiIsInRlbXBsYXRlTGluayIsImRlZmluaXRpb24iLCJyZXN1bHRMaW5rIiwibWF0Y2giLCJwMSIsInN1YmplY3REYXRhIiwiZ3JpZEFjdGlvbnMiLCJhY3Rpb25zIiwiZ3JpZEFjdGlvbnNHZXQiLCJBY3Rpb25Hb1RvIiwiQWN0aW9uRGVsZXRlIiwiQWN0aW9uVXBkYXRlIiwiQWN0aW9uQ3JlYXRlIiwiZ29Ub1VwZGF0ZSIsImdvVG9DcmVhdGUiLCJnb1RvTGlzdCIsInJlYWQiLCJkZWxldGUiLCJ1cGRhdGUiLCJhY3Rpb24iLCJiaW5kIiwiZ3JpZEFjdGlvblVwZGF0ZSIsImFjdGlvblVwZGF0ZVN1Y2Nlc3MiLCJhY3Rpb25VcGRhdGVFcnJvciIsImRpcmVjdGl2ZSIsImdyaWRGb3JtRGlyZWN0aXZlIiwicmVzdHJpY3QiLCJjb250cm9sbGVyIiwiZ3JpZEZvcm1EaXJlY3RpdmVDdHJsIiwiJHNjb3BlIiwic2V0Rm9ybVNjb3BlIiwiJGRpZ2VzdCIsImVkaXQiLCIkZXZlbnQiLCJnbyIsImNsb3NlQWxlcnQiLCJzcGxpY2UiLCJncmlkVGFibGVEaXJlY3RpdmUiLCJncmlkVGFibGVEaXJlY3RpdmVDdHJsIiwidm1zR3JpZERpcmVjdGl2ZSIsInRlbXBsYXRlIiwiZ3JpZE1vZGVsIiwidm1zR3JpZERpcmVjdGl2ZUN0cmwiLCJlbCIsImF0dHIiLCJjdHJsIiwiZ2V0VGVtcGxhdGVVcmwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7UUFNQSxJQUFBQSxJQUFBLEdBQUEsRUFBQSxDO1FBQ0EsSUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUMsTUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQTtBQUFBLFlBQ0FILE9BQUEsQ0FBQUMsTUFBQSxDQUFBLGNBQUEsRUFEQTtBQUFBLFlBRUFGLElBQUEsQ0FBQUcsSUFBQSxDQUFBLGNBQUEsRUFGQTtBQUFBLFNBQUEsQ0FHQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxTO1FBRUEsSUFBQUMsT0FBQSxHQUFBSixPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFGLElBQUEsQ0FBQSxDO1FDakJBQyxPQUFBLENBQUFDLE1BQUEsQ0FBQSxNQUFBLEVBQUFJLEdBQUEsQ0FBQTtBQUFBLFlBQUEsZ0JBQUE7QUFBQSxZQUFBLFVBQUFDLGNBQUEsRUFBQTtB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QUFBak8sT0FBQSxHQUFBO0FBQUEsZ0JBQUEsUUFBQTtBQUFBLGdCQUFBLGFBQUE7QUFBQSxhQUFBLENBYkE7QUFBQSxZQWVBLE9BQUErTSxTQUFBLENBZkE7QUFBQSxZQWlCQSxTQUFBa0Isb0JBQUEsQ0FBQWIsTUFBQSxFQUFBek4sVUFBQSxFQUFBO0FBQUEsZ0JBQ0F5TixNQUFBLENBQUFpQixjQUFBLEdBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUFqQixNQUFBLENBQUFZLFNBQUEsQ0FBQXBMLE1BQUEsQ0FBQTlCLElBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsMEJBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsb0JBSUEsT0FBQSwyQkFBQSxDQUpBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGdCQVFBbkIsVUFBQSxDQUFBc0IsUUFBQSxDQUFBbU0sTUFBQSxDQUFBWSxTQUFBLEVBUkE7QUFBQSxhQWpCQTtBQUFBLFMiLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVm1zR3JpZCB2MC4xLjEgKGh0dHBzOi8vZ2l0aHViLmNvbS9WZXJ0YU1lZGlhL2FuZ3VsYXItZ3JpZClcbiAqIENvcHlyaWdodCAyMDE1IFZlcnRhTWVkaWEsIEluYy5cbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCAoaHR0cHM6Ly9naXRodWIuY29tL1ZlcnRhTWVkaWEvYW5ndWxhci1ncmlkL21hc3Rlci9MSUNFTlNFKVxuICovXG5cbnZhciBkZXBzID0gW107XG50cnkge1xuICBhbmd1bGFyLm1vZHVsZSgnc2NoZW1hRm9ybScpO1xuICBkZXBzLnB1c2goJ3NjaGVtYUZvcm0nKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnRyeSB7XG4gIGFuZ3VsYXIubW9kdWxlKCd1aS5ib290c3RyYXAnKTtcbiAgZGVwcy5wdXNoKCd1aS5ib290c3RyYXAnKTtcbn0gY2F0Y2ggKGUpIHt9XG5cbnZhciB2bXNHcmlkID0gYW5ndWxhci5tb2R1bGUoJ2dyaWQnLCBkZXBzKTsiLCJhbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgndGVtcGxhdGVzL2dyaWQvdGFibGUuaHRtbCcsXG4gICAgJzxncmlkLXRhYmxlPicgK1xuICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gbGlua3NcIj4nICtcbiAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJlZGl0KGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgJzwvc3Bhbj4nK1xuICAgICAgJzxhbGVydCBuZy1yZXBlYXQ9XCJhbGVydCBpbiBhbGVydHNcIiB0eXBlPVwie3thbGVydC50eXBlfX1cIiBjbG9zZT1cImNsb3NlQWxlcnQoJGluZGV4KVwiPnt7YWxlcnQubXNnfX08L2FsZXJ0PicrXG4gICAgICAnPHRhYmxlIGNsYXNzPVwidGFibGUgZ3JpZFwiPicrXG4gICAgICAgICc8dGhlYWQ+JytcbiAgICAgICAgICAnPHRyPicrXG4gICAgICAgICAgICAnPHRoIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+e3tjb2x1bW4udGl0bGV9fTwvdGg+JytcbiAgICAgICAgICAnPC90cj4nK1xuICAgICAgICAnPC90aGVhZD4nK1xuICAgICAgICAnPHRib2R5PicrXG4gICAgICAgICAgJzx0ciBuZy1yZXBlYXQ9XCJyb3cgaW4gcm93c1wiPicrXG4gICAgICAgICAgICAnPHRkIG5nLXJlcGVhdD1cImNvbHVtbiBpbiBjb2x1bW5zXCI+JytcbiAgICAgICAgICAgICAgJzxzcGFuIG5nLWlmPVwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgIT09IFxcJ2xpbmtzXFwnXCI+e3tyb3dbY29sdW1uLmF0dHJpYnV0ZU5hbWVdfX08L3NwYW4+JytcbiAgICAgICAgICAgICAgJzxzcGFuIG5nLWlmPVwiY29sdW1uLmF0dHJpYnV0ZU5hbWUgPT0gXFwnbGlua3NcXCdcIj4nK1xuICAgICAgICAgICAgICAgICc8c3BhbiBuZy1yZXBlYXQ9XCJsaW5rIGluIHJvdy5saW5rc1wiPicgK1xuICAgICAgICAgICAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJlZGl0KGxpbmspXCI+e3tsaW5rLnRpdGxlfX08L2E+ICcgK1xuICAgICAgICAgICAgICAgICc8L3NwYW4+JytcbiAgICAgICAgICAgICAgJzwvc3Bhbj4nK1xuICAgICAgICAgICAgJzwvdGQ+JytcbiAgICAgICAgICAnPC90cj4nK1xuICAgICAgICAnPC90Ym9keT4nK1xuICAgICAgJzwvdGFibGU+JyArXG4gICAgJzwvZ3JpZC10YWJsZT4nXG4gICk7XG5cbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCd0ZW1wbGF0ZXMvZ3JpZC9mb3JtLmh0bWwnLFxuICAgICc8Z3JpZC1mb3JtPicgK1xuICAgICAgJzxzcGFuIG5nLXJlcGVhdD1cImxpbmsgaW4gbGlua3NcIj4nICtcbiAgICAgICAgJzxhIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCIgbmctY2xpY2s9XCJnbyhsaW5rKVwiPnt7bGluay50aXRsZX19PC9hPiAnICtcbiAgICAgICc8L3NwYW4+JytcbiAgICAgICc8ZGl2PicgK1xuICAgICAgICAnPGFsZXJ0IG5nLXJlcGVhdD1cImFsZXJ0IGluIGFsZXJ0c1wiIHR5cGU9XCJ7e2FsZXJ0LnR5cGV9fVwiIGNsb3NlPVwiY2xvc2VBbGVydCgkaW5kZXgpXCI+e3thbGVydC5tc2d9fTwvYWxlcnQ+JytcbiAgICAgICc8L2Rpdj4nICtcbiAgICAgICc8Zm9ybSBub3ZhbGlkYXRlIG5hbWU9XCJncmlkRm9ybVwiIG5nLWluaXQ9XCJzZXRGb3JtU2NvcGUodGhpcylcIicgK1xuICAgICAgICAnc2Ytc2NoZW1hPVwic2NoZW1hXCIgc2YtZm9ybT1cImZvcm1cIiBzZi1tb2RlbD1cIm1vZGVsXCInICtcbiAgICAgICAgJ2NsYXNzPVwiZm9ybS1ob3Jpem9udGFsXCIgcm9sZT1cImZvcm1cIiBuZy1pZj1cImhpZGVGb3JtICE9PSB0cnVlXCI+JytcbiAgICAgICc8L2Zvcm0+JytcbiAgICAnPC9ncmlkLWZvcm0+J1xuICApO1xufV0pO1xuXG5hbmd1bGFyLm1vZHVsZSgnZ3JpZCcpLmZhY3RvcnkoJ18nLCBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBsb2Rhc2g7XG59KTtcblxuYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5wcm92aWRlcignZ3JpZC1lbnRpdHknLCBncmlkRW50aXR5KTtcblxuZnVuY3Rpb24gZ3JpZEVudGl0eSgpIHtcbiAgdmFyIGRhdGEsXG4gICAgICBzY2hlbWE7XG5cbiAgdmFyIHByb3ZpZGVyID0ge1xuICAgICRnZXQ6IGdyaWRFbnRpdHlHZXRcbiAgfTtcblxuICBncmlkRW50aXR5R2V0LiRpbmplY3QgPSBbJyR0aW1lb3V0JywgJyRpbnRlcnZhbCcsICdfJ107XG5cbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRFbnRpdHlHZXQoJHRpbWVvdXQsICRpbnRlcnZhbCwgXykge1xuICAgIHZhciBtb2RlbCxcbiAgICAgICAgbWVzc2FnZXMgPSB7XG4gICAgICAgICAgc3VjY2Vzc0RlbGV0ZWQ6ICdTdWNjZXNzZnVsbHkgZGVsZXRlJyxcbiAgICAgICAgICBzdWNjZXNzQ3JlYXRlZDogJ1N1Y2Nlc3NmdWxseSBjcmVhdGUnLFxuICAgICAgICAgIHN1Y2Nlc3NVcGRhdGVkOiAnU3VjY2Vzc2Z1bGx5IHVwZGF0ZScsXG4gICAgICAgICAgc2VydmVyRXJyb3I6ICdPb3BzISBzZXJ2ZXIgZXJyb3InXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgLy9jYWNoZToge30sXG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGFjdGlvbkdldFJlc291cmNlOiAncmVhZCdcbiAgICAgIH0sXG4gICAgICBUWVBFX0ZPUk06ICdmb3JtJyxcbiAgICAgIFRZUEVfVEFCTEU6ICd0YWJsZScsXG4gICAgICB0eXBlOiAnJyxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBzZXREYXRhOiBzZXREYXRhLFxuICAgICAgc2V0TW9kZWw6IHNldE1vZGVsLFxuICAgICAgZ2V0TW9kZWw6IGdldE1vZGVsLFxuICAgICAgc2V0U2NoZW1hOiBzZXRTY2hlbWEsXG4gICAgICBnZXRNZXNzYWdlOiBnZXRNZXNzYWdlLFxuICAgICAgc2V0TWVzc2FnZTogc2V0TWVzc2FnZSxcbiAgICAgIGZldGNoRGF0YTogZmV0Y2hEYXRhLFxuICAgICAgbG9hZERhdGE6IGxvYWREYXRhLFxuICAgICAgbG9hZFNjaGVtYTogbG9hZFNjaGVtYSxcbiAgICAgIGdldFRhYmxlSW5mbzogZ2V0VGFibGVJbmZvLFxuICAgICAgZ2V0Rm9ybUluZm86IGdldEZvcm1JbmZvLFxuICAgICAgZmV0Y2hDb2xsZWN0aW9uOiBmZXRjaENvbGxlY3Rpb24sXG4gICAgICBfZ2V0UmVsYXRpb25SZXNvdXJjZTogX2dldFJlbGF0aW9uUmVzb3VyY2UsXG4gICAgICBfcmVwbGFjZUZyb21GdWxsOiBfcmVwbGFjZUZyb21GdWxsLFxuICAgICAgX2dldFJlbGF0aW9uTGluazogX2dldFJlbGF0aW9uTGluayxcbiAgICAgIF9jcmVhdGVUaXRsZU1hcDogX2NyZWF0ZVRpdGxlTWFwLFxuICAgICAgX2dldEZvcm1Db25maWc6IF9nZXRGb3JtQ29uZmlnLFxuICAgICAgX2dldEZpZWxkc0Zvcm06IF9nZXRGaWVsZHNGb3JtLFxuICAgICAgX2dldFJvd3NCeURhdGE6IF9nZXRSb3dzQnlEYXRhLFxuICAgICAgX2dldEVtcHR5RGF0YTogX2dldEVtcHR5RGF0YSxcbiAgICAgIF9iYXRjaExvYWREYXRhOiBfYmF0Y2hMb2FkRGF0YVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXREYXRhKHZhbHVlKSB7XG4gICAgICBkYXRhID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0U2NoZW1hKHZhbHVlKSB7XG4gICAgICBzY2hlbWEgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNb2RlbChNb2RlbCkge1xuICAgICAgbW9kZWwgPSBNb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNb2RlbCgpIHtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlKHBhcmFtKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZXNbcGFyYW1dO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2UocGFyYW0sIG1lc3NhZ2UpIHtcbiAgICAgIG1lc3NhZ2VzW3BhcmFtXSA9IG1lc3NhZ2U7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBmZXRjaERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbC5wYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICBzZWxmLmxvYWRTY2hlbWEodXJsLCBmZXRjaERhdGFTdWNjZXNzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5sb2FkRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmZXRjaERhdGFTdWNjZXNzKGRhdGEsIHNjaGVtYSkge1xuICAgICAgICBzZWxmLnNldERhdGEoZGF0YSk7XG4gICAgICAgIHNlbGYuc2V0U2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmV0Y2ggZGF0YSBieSB1cmwgYW5kIGluY2x1ZGUgc2NoZW1hIGZyb20gaGVhZGVyIGRhdGFcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gbG9hZERhdGEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmIChtb2RlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2V0IG1vZGVsIGJlZm9yZSBjYWxsIGZldGNoIGRhdGEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvKmlmIChfLmlzRW1wdHkoc2VsZi5jYWNoZVt1cmxdKT09PWZhbHNlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYWNoZScpO1xuICAgICAgICBjYWxsYmFjayhzZWxmLmNhY2hlW3VybF0uZGF0YSwgc2VsZi5jYWNoZVt1cmxdLnNjaGVtYSwgc2VsZi5jYWNoZVt1cmxdLnJlcXVlc3QpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9Ki9cblxuICAgICAgSnNvbmFyeS5nZXREYXRhKHVybCwgZnVuY3Rpb24gKGpEYXRhLCByZXF1ZXN0KSB7XG4gICAgICAgIHZhciBkYXRhID0gakRhdGE7XG4gICAgICAgIHZhciBzY2hlbWEgPSBqRGF0YS5wcm9wZXJ0eSgnZGF0YScpLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2FkJyk7XG5cbiAgICAgICAgLypzZWxmLmNhY2hlW3VybF0gPSB7XG4gICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgIH07Ki9cblxuICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEsIHNjaGVtYSwgcmVxdWVzdCk7XG4gICAgICAgIH1cblxuICAgICAgfSk7XG5cbiAgICAgIC8vc2VsZi5jYWNoZVt1cmxdID0ge307XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGZXRjaCBzY2hlbWEgYnkgdXJsLCBjcmVhdGUgZW1wdHkgZGF0YSBhbmQgam9pbiB0aGVtXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWRTY2hlbWEodXJsLCBjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIEpzb25hcnkuZ2V0U2NoZW1hKHVybCwgZnVuY3Rpb24gKGpTY2hlbWEpIHtcblxuICAgICAgICB2YXIgc2NoZW1hID0galNjaGVtYS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpO1xuICAgICAgICB2YXIgZGF0YSA9IEpzb25hcnkuY3JlYXRlKHNlbGYuX2dldEVtcHR5RGF0YShqU2NoZW1hLmRhdGEudmFsdWUoKSwgc2NoZW1hKSk7XG4gICAgICAgIGRhdGEuZG9jdW1lbnQudXJsID0gc2VsZi5nZXRNb2RlbCgpLnVybDtcbiAgICAgICAgZGF0YS5hZGRTY2hlbWEoalNjaGVtYSk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhLCBzY2hlbWEpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZXRFbXB0eURhdGEoc2NoZW1hLCBmdWxsU2NoZW1hKSB7XG4gICAgICB2YXIgcmVzdWx0O1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShzY2hlbWEsIGZ1bGxTY2hlbWEpO1xuXG4gICAgICByZXN1bHQgPSBfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcyk7XG4gICAgICByZXN1bHQuZGF0YSA9IGdldFR5cGVQcm9wZXJ0eShfLmNsb25lKHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLnByb3BlcnRpZXMpKTtcbiAgICAgIHJlc3VsdC5kYXRhLmF0dHJpYnV0ZXMgPSBnZXRUeXBlUHJvcGVydHkoXy5jbG9uZShzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMucHJvcGVydGllcykpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydHkob2JqKSB7XG4gICAgICAgIHZhciB0bXBPYmogPSBvYmo7XG4gICAgICAgIF8uZm9yRWFjaCh0bXBPYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICBpZiAodmFsdWUudHlwZSkge1xuICAgICAgICAgICAgc3dpdGNoKHZhbHVlLnR5cGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IHt9O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHRtcE9ialtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICB0bXBPYmpba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0bXBPYmo7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFJlc291cmNlVXJsKHVybCwgcGFyYW1zKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdXJsO1xuXG4gICAgICBpZiAocGFyYW1zLnJlc291cmNlKSB7XG4gICAgICAgIHJlc3VsdCA9IHVybCArICcvJyArIHBhcmFtcy5yZXNvdXJjZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gJ3VwZGF0ZScgfHwgcGFyYW1zLnR5cGUgPT09ICdyZWFkJykge1xuICAgICAgICAgIHJlc3VsdCArPSAnLycgKyBwYXJhbXMudHlwZSArICcvJyArIHBhcmFtcy5pZDtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMudHlwZSA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXN1bHQgKz0gJy9zY2hlbWEjL2RlZmluaXRpb25zL2NyZWF0ZSc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUYWJsZUluZm8oY2FsbGJhY2spIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBtb2RlbCA9IHNlbGYuZ2V0TW9kZWwoKSxcbiAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG5cbiAgICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBtZXJnZVJlbFNjaGVtYShkYXRhLnNjaGVtYXMoKVswXS5kYXRhLnZhbHVlKCksIHNjaGVtYSk7XG5cbiAgICAgICAgICBzZWxmLnR5cGUgPSBzZWxmLlRZUEVfVEFCTEU7XG4gICAgICAgICAgaWYgKCFzZWxmLmNvbmZpZy50YWJsZSkge1xuICAgICAgICAgICAgc2VsZi5jb25maWcudGFibGUgPSB7fTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICBzZWxmLl9nZXRSb3dzQnlEYXRhKGRhdGEsIGZ1bmN0aW9uKHJvd3MsIHJlbGF0aW9ucykge1xuXG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUucm93cyA9IHJvd3NUb1RhYmxlRm9ybWF0KHJvd3MpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLnRhYmxlLmNvbHVtbnMgPSBnZXRDb2x1bW5zQnlTY2hlbWEoc2NoZW1hV2l0aG91dFJlZik7XG4gICAgICAgICAgc2VsZi5jb25maWcudGFibGUuY29sdW1ucy5wdXNoKHtcbiAgICAgICAgICAgIHRpdGxlOiAnQWN0aW9ucycsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZU5hbWU6ICdsaW5rcydcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhzZWxmLmNvbmZpZy50YWJsZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtSW5mbyhjYWxsYmFjaykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgbW9kZWwgPSBzZWxmLmdldE1vZGVsKCksXG4gICAgICAgICAgdXJsO1xuXG4gICAgICB1cmwgPSBnZXRSZXNvdXJjZVVybChtb2RlbC51cmwsIG1vZGVsLnBhcmFtcyk7XG5cbiAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLmZldGNoRGF0YSh1cmwsIGZldGNoRGF0YVN1Y2Nlc3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIGZldGNoRGF0YVN1Y2Nlc3MoZGF0YSwgc2NoZW1hKSB7XG4gICAgICAgIHZhciBuZXdEYXRhID0gZGF0YS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5KCdhdHRyaWJ1dGVzJyk7XG4gICAgICAgIHZhciBzY2hlbWFXaXRob3V0UmVmID0gbWVyZ2VSZWxTY2hlbWEobmV3RGF0YS5zY2hlbWFzKClbMF0uZGF0YS52YWx1ZSgpLCBzY2hlbWEpO1xuXG4gICAgICAgIHNlbGYudHlwZSA9IHNlbGYuVFlQRV9GT1JNO1xuICAgICAgICBpZiAoIXNlbGYuY29uZmlnLmZvcm0pIHtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9nZXRGaWVsZHNGb3JtKGRhdGEsIGZ1bmN0aW9uKGZpZWxkcywgcmVsYXRpb25zKSB7XG5cbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmxpbmtzID0gZGF0YS5saW5rcygpO1xuICAgICAgICAgIHNlbGYuY29uZmlnLmZvcm0uc2NoZW1hID0gc2NoZW1hV2l0aG91dFJlZjtcbiAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLm1vZGVsID0gZmllbGRzVG9Gb3JtRm9ybWF0KGZpZWxkcyk7XG5cbiAgICAgICAgICBzZWxmLl9nZXRGb3JtQ29uZmlnKGRhdGEsIGNhbGxiYWNrRm9ybUNvbmZpZyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBjYWxsYmFja0Zvcm1Db25maWcoY29uZmlnKSB7XG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBjb25maWc7XG5cbiAgICAgICAgICAgIC8qKiBhZGQgYnV0dG9uIHRvIGNvbmZpZyBmb3JtICovXG4gICAgICAgICAgICBzZWxmLmNvbmZpZy5mb3JtLmZvcm0gPSBfLnVuaW9uKHNlbGYuY29uZmlnLmZvcm0uZm9ybSwgZ2V0Rm9ybUJ1dHRvbkJ5U2NoZW1hKGRhdGEucHJvcGVydHkoJ2RhdGEnKS5saW5rcygpKSk7XG5cbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHNlbGYuY29uZmlnLmZvcm0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICB9KVxuXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBmb3JtIGNvbmZpZyBmb3IgQW5ndWxhciBzY2hlbWEgZm9ybVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0Rm9ybUNvbmZpZyhkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgIHNlbGYuX2NyZWF0ZVRpdGxlTWFwKGRhdGEucHJvcGVydHkoJ2RhdGEnKSwgZnVuY3Rpb24odGl0bGVNYXBzKSB7XG5cbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBtZXJnZVJlbFNjaGVtYShcbiAgICAgICAgICBkYXRhLnByb3BlcnR5KCdkYXRhJykuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSxcbiAgICAgICAgICBkYXRhLnNjaGVtYXMoKVswXS5kYXRhLmRvY3VtZW50LnJhdy52YWx1ZSgpXG4gICAgICAgICkucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cbiAgICAgICAgXy5mb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICB2YXIgb2JqID0ge2tleToga2V5fTtcblxuICAgICAgICAgIGlmICh0aXRsZU1hcHNba2V5XSkge1xuICAgICAgICAgICAgICBvYmoudGl0bGVNYXAgPSB0aXRsZU1hcHNba2V5XVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHQucHVzaChvYmopXG4gICAgICAgIH0pO1xuXG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0RmllbGRzRm9ybShkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGZpZWxkcztcbiAgICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuXG4gICAgICBmaWVsZHMgPSBkYXRhLnByb3BlcnR5KCdkYXRhJyk7XG4gICAgICBpbmNsdWRlZC5wdXNoKHNlbGYuX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YS5wcm9wZXJ0eSgnZGF0YScpKSk7XG5cbiAgICAgIHNlbGYuX2JhdGNoTG9hZERhdGEoaW5jbHVkZWQsIGJhdGNoTG9hZGVkKTtcblxuICAgICAgZnVuY3Rpb24gYmF0Y2hMb2FkZWQocmVsYXRpb25SZXNvdXJjZXMpIHtcblxuICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBvd246IGZpZWxkcyxcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IF8ubWFwVmFsdWVzKHJlbGF0aW9uUmVzb3VyY2VzWzBdLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgIF8uZm9yRWFjaChuLCBmdW5jdGlvbihpdGVtLCBpbmRleCl7XG4gICAgICAgICAgICAgICAgbltpbmRleF0gPSBpdGVtLmRhdGE7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfTtcblxuICAgICAgICBjYWxsYmFjayhyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aXRsZU1hcCBmb3IgZm9ybSBhbmQgbG9hZCBkZXBlbmRlbmN5IHJlc291cmNlXG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9jcmVhdGVUaXRsZU1hcChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgZGF0YVJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKTtcbiAgICAgIHZhciBkYXRhQXR0cmlidXRlcyA9IGRhdGEucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKTtcbiAgICAgIHZhciByZWxhdGlvbnMgPSBkYXRhUmVsYXRpb25zLnZhbHVlKCk7XG4gICAgICB2YXIgYXR0cmlidXRlcyA9IGRhdGFBdHRyaWJ1dGVzLnZhbHVlKCk7XG5cbiAgICAgIHZhciBkb2N1bWVudFNjaGVtYSA9IGRhdGEuc2NoZW1hcygpWzBdLmRhdGEuZG9jdW1lbnQucmF3LnZhbHVlKCk7XG5cbiAgICAgIHZhciBzb3VyY2VUaXRsZU1hcHMgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9ucywgZnVuY3Rpb24oaXRlbSwga2V5KSB7XG5cbiAgICAgICAgdmFyIHJlc291cmNlTGluayA9IGl0ZW0ubGlua3Muc2VsZjtcbiAgICAgICAgLyoqIGdldCBuYW1lIGZyb20gc2NoZW1hICovXG4gICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gZGF0YVJlbGF0aW9ucy5wcm9wZXJ0eShrZXkpLnNjaGVtYXMoKVswXS5kYXRhLnByb3BlcnR5VmFsdWUoJ25hbWUnKTtcbiAgICAgICAgdmFyIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYgPSBzZWxmLl9yZXBsYWNlRnJvbUZ1bGwoZGF0YUF0dHJpYnV0ZXMuc2NoZW1hcygpWzBdLmRhdGEudmFsdWUoKSwgZG9jdW1lbnRTY2hlbWEpWydwcm9wZXJ0aWVzJ11ba2V5XTtcblxuICAgICAgICB2YXIgc291cmNlRW51bSA9IHt9O1xuXG4gICAgICAgIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zICYmIHNjaGVtYUF0dHJpYnV0ZVdpdGhvdXRSZWYuaXRlbXMuZW51bSkge1xuICAgICAgICAgIHNvdXJjZUVudW0gPSBzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLml0ZW1zLmVudW1cbiAgICAgICAgfSBlbHNlIGlmIChzY2hlbWFBdHRyaWJ1dGVXaXRob3V0UmVmLmVudW0pIHtcbiAgICAgICAgICBzb3VyY2VFbnVtID0gc2NoZW1hQXR0cmlidXRlV2l0aG91dFJlZi5lbnVtXG4gICAgICAgIH1cblxuICAgICAgICBfLmZvckVhY2goc291cmNlRW51bSwgZnVuY3Rpb24gKGVudW1JdGVtKSB7XG4gICAgICAgICAgdmFyIHVybCA9IHJlc291cmNlTGluayArICcvJyArIHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSArJy8nICsgZW51bUl0ZW07XG5cbiAgICAgICAgICBzb3VyY2VUaXRsZU1hcHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIGVudW1JdGVtOiBlbnVtSXRlbSxcbiAgICAgICAgICAgIHJlbGF0aW9uTmFtZToga2V5LFxuICAgICAgICAgICAgYXR0cmlidXRlTmFtZTogYXR0cmlidXRlTmFtZVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuXG4gICAgICB9KTtcblxuICAgICAgc2VsZi5mZXRjaENvbGxlY3Rpb24oXy5tYXAoc291cmNlVGl0bGVNYXBzLCAndXJsJyksIGZ1bmN0aW9uKHJlc291cmNlcykge1xuICAgICAgICB2YXIgdGl0bGVNYXBzID0ge307XG5cbiAgICAgICAgXy5mb3JFYWNoKHNvdXJjZVRpdGxlTWFwcywgZnVuY3Rpb24gKGl0ZW0pIHtcblxuICAgICAgICAgIGlmICghdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSkge1xuICAgICAgICAgICAgdGl0bGVNYXBzW2l0ZW0ucmVsYXRpb25OYW1lXSA9IFtdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRpdGxlTWFwc1tpdGVtLnJlbGF0aW9uTmFtZV0ucHVzaCh7XG4gICAgICAgICAgICB2YWx1ZTogaXRlbS5lbnVtSXRlbSxcbiAgICAgICAgICAgIC8vdmFsdWU6IGRhdGEucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpLFxuICAgICAgICAgICAgbmFtZTogcmVzb3VyY2VzW2l0ZW0udXJsXS5kYXRhLnByb3BlcnR5KCdkYXRhJykucHJvcGVydHkoJ2F0dHJpYnV0ZXMnKS5wcm9wZXJ0eVZhbHVlKGl0ZW0uYXR0cmlidXRlTmFtZSkgfHwgaXRlbS5lbnVtSXRlbVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayh0aXRsZU1hcHMpXG4gICAgICB9KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIGxvYWQgcmVzb3VyY2UgYnkgYXJyYXkgbGlua3NcbiAgICAgKiBAcGFyYW0gbGlua1Jlc291cmNlc1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZldGNoQ29sbGVjdGlvbihsaW5rUmVzb3VyY2VzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGxvYWRlZCA9IDA7XG4gICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuXG4gICAgICBsaW5rUmVzb3VyY2VzID0gXy51bmlxKGxpbmtSZXNvdXJjZXMpO1xuXG4gICAgICBfLmZvckVhY2gobGlua1Jlc291cmNlcywgZnVuY3Rpb24gKHVybCkge1xuXG4gICAgICAgIHNlbGYubG9hZERhdGEodXJsLCBmdW5jdGlvbiAoZGF0YSwgc2NoZW1hLCByZXF1ZXN0KSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSB7XG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfTtcbiAgICAgICAgICBsb2FkZWQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRvdGFsKys7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG90YWwgPT09IGxvYWRlZCkge1xuICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwoaW50ZXJ2YWwpO1xuICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNvdXJjZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmUgZnVuY3Rpb24gcmVwbGFjaW5nICRyZWYgZnJvbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2ssIHNjaGVtYUZ1bGwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBoYXlzdGFjaykge1xuICAgICAgICBpZiAoaGF5c3RhY2suaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGF5c3RhY2tba2V5XSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoaGF5c3RhY2tba2V5XSkgJiYgaGF5c3RhY2tba2V5XS4kcmVmKSB7XG4gICAgICAgICAgICBoYXlzdGFja1trZXldID0gT2JqZWN0LmJ5U3RyaW5nKHNjaGVtYUZ1bGwsIGhheXN0YWNrW2tleV0uJHJlZi5zdWJzdHJpbmcoMikpO1xuICAgICAgICAgICAgX3JlcGxhY2VGcm9tRnVsbChoYXlzdGFja1trZXldLCBzY2hlbWFGdWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBoYXlzdGFja1trZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShoYXlzdGFja1trZXldKSAmJiAoaGF5c3RhY2tba2V5XSAhPT0gJ2xpbmtzJykpIHtcbiAgICAgICAgICAgIF9yZXBsYWNlRnJvbUZ1bGwoaGF5c3RhY2tba2V5XSwgc2NoZW1hRnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGF5c3RhY2s7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBzY2hlbWEgd2l0aCAkcmVmIGxpbmsgdG8gc2NoZW1hIHdpdGhvdXQgJHJlZlxuICAgICAqIEBwYXJhbSBzY2hlbWFcbiAgICAgKiBAcGFyYW0gc2NoZW1hRnVsbFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmdlUmVsU2NoZW1hKHNjaGVtYSwgc2NoZW1hRnVsbCkge1xuICAgICAgdmFyIHNjaGVtYVdpdGhvdXRSZWYgPSBzY2hlbWE7XG5cbiAgICAgIHNjaGVtYVdpdGhvdXRSZWYgPSBfcmVwbGFjZUZyb21GdWxsKHNjaGVtYVdpdGhvdXRSZWYsIHNjaGVtYUZ1bGwpO1xuXG4gICAgICByZXR1cm4gc2NoZW1hV2l0aG91dFJlZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQ29sdW1ucyBpbmZvIGJ5IHNjaGVtYVxuICAgICAqXG4gICAgICogQHBhcmFtIHNjaGVtYVdpdGhvdXRSZWZcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Q29sdW1uc0J5U2NoZW1hKHNjaGVtYVdpdGhvdXRSZWYpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBjb2x1bW5zID0gc2NoZW1hV2l0aG91dFJlZi5wcm9wZXJ0aWVzLmRhdGEuaXRlbXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnByb3BlcnRpZXM7XG5cblxuICAgICAgXy5mb3JFYWNoKGNvbHVtbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7XG5cbiAgICAgIC8qdmFyIHJlbGF0aW9uc2hpcHMgPSB7fTtcbiAgICAgIGlmIChzY2hlbWFXaXRob3V0UmVmLnByb3BlcnRpZXMuZGF0YS5pdGVtcy5wcm9wZXJ0aWVzLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgcmVsYXRpb25zaGlwcyA9IHNjaGVtYVdpdGhvdXRSZWYucHJvcGVydGllcy5kYXRhLml0ZW1zLnByb3BlcnRpZXMucmVsYXRpb25zaGlwcy5wcm9wZXJ0aWVzO1xuICAgICAgfVxuICAgICAgXy5mb3JFYWNoKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFsdWUuYXR0cmlidXRlTmFtZSA9IGtleTtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfSk7Ki9cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGZpZWxkc1RvRm9ybUZvcm1hdChyZXNvdXJjZSkge1xuICAgICAgdmFyIGRhdGEgPSByZXNvdXJjZS5vd247XG4gICAgICB2YXIgZmllbGRzID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgIF8uZm9yRWFjaChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihyZWxhdGlvbiwga2V5KSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gXy5tYXAocmVsYXRpb24sIGZ1bmN0aW9uKHJlbGF0aW9uSXRlbSkge1xuICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eVZhbHVlKCdpZCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgLyoqIGNoZWNrIGlmIGRhdGEgYXMgYXJyYXkgdGhlbiByZXR1cm4gc3RyaW5nIGVsc2UgYXJyYXkgKi9cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS5wcm9wZXJ0eShrZXkpLnByb3BlcnR5VmFsdWUoJ2RhdGEnKSkpIHtcbiAgICAgICAgICBmaWVsZHNba2V5XSA9IGZpZWxkc1trZXldWzBdO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGZpZWxkcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGFycmF5IEpzb25hcnkgRGF0YSB0byByZXN1bHQgYXJyYXkgZm9yIHJlbmRlcmluZyB0YWJsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHJvd3NcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gcm93c1RvVGFibGVGb3JtYXQocm93cykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJlc291cmNlKSB7XG4gICAgICAgIHZhciBkYXRhID0gcmVzb3VyY2Uub3duO1xuICAgICAgICB2YXIgdG1wID0gZGF0YS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnZhbHVlKCk7XG5cbiAgICAgICAgXy5mb3JFYWNoKHJlc291cmNlLnJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKHJlbGF0aW9uLCBrZXkpIHtcbiAgICAgICAgICB0bXBba2V5XSA9IF8ubWFwKHJlbGF0aW9uLCBmdW5jdGlvbihyZWxhdGlvbkl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBmaWVsZCA9IHJlc291cmNlLm93bi5wcm9wZXJ0eSgncmVsYXRpb25zaGlwcycpLnByb3BlcnR5KGtleSkuc2NoZW1hcygpWzBdLmRhdGEucHJvcGVydHlWYWx1ZSgnbmFtZScpO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIG5hbWUgYWRkaXRpb25hbCBmaWVsZChyZWxhdGlvbiByZXNvdXJjZSlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybiByZWxhdGlvbkl0ZW0ucHJvcGVydHkoJ2RhdGEnKS5wcm9wZXJ0eSgnYXR0cmlidXRlcycpLnByb3BlcnR5VmFsdWUoZmllbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlbGF0aW9uSXRlbS5wcm9wZXJ0eSgnZGF0YScpLnByb3BlcnR5VmFsdWUoJ2lkJyk7XG5cbiAgICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0bXAubGlua3MgPSBbXTtcbiAgICAgICAgXy5mb3JPd24oZGF0YS5saW5rcygpLCBmdW5jdGlvbihsaW5rKSB7XG4gICAgICAgICAgdG1wLmxpbmtzLnB1c2gobGluayk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQucHVzaCh0bXApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhcnJheSByb3dzIGJ5IEpzb25hcnkgRGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIGRhdGEgSnNvbmFyeVxuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0Um93c0J5RGF0YShkYXRhLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJvd3MgPSBbXTtcbiAgICAgIHZhciBpbmNsdWRlZCA9IFtdO1xuICAgICAgZGF0YS5wcm9wZXJ0eSgnZGF0YScpLml0ZW1zKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXG4gICAgICAgIGluY2x1ZGVkLnB1c2goc2VsZi5fZ2V0UmVsYXRpb25SZXNvdXJjZSh2YWx1ZSkpO1xuXG4gICAgICAgIHJvd3MucHVzaCh2YWx1ZSk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgYmF0Y2hMb2FkZWQpO1xuXG4gICAgICBmdW5jdGlvbiBiYXRjaExvYWRlZChyZWxhdGlvblJlc291cmNlcykge1xuICAgICAgICB2YXIgcmVzID0gW107XG5cbiAgICAgICAgXy5mb3JFYWNoKHJvd3MsIGZ1bmN0aW9uKHJvdywgaW5kZXgpIHtcbiAgICAgICAgICB2YXIgdG1wUm93ID0ge1xuICAgICAgICAgICAgb3duOiByb3csXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBfLm1hcFZhbHVlcyhyZWxhdGlvblJlc291cmNlc1tpbmRleF0sIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgXy5mb3JFYWNoKG4sIGZ1bmN0aW9uKGl0ZW0sIGluZGV4KXtcbiAgICAgICAgICAgICAgICBuW2luZGV4XSA9IGl0ZW0uZGF0YTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVzLnB1c2godG1wUm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENpcmN1bXZlbnRpb24gdGhlIGFycmF5IHJlbGF0aW9uc2hpcHMgYW5kIGdldCBsaW5rcyBmb3IgbGF0ZSB0aGVtIGxvYWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gbGluayBmb3IgZ2V0IHJlc291cmNlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFJlbGF0aW9uUmVzb3VyY2UoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlbGF0aW9ucztcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgICAgaWYgKHJlbGF0aW9ucyA9IGRhdGEucHJvcGVydHkoJ3JlbGF0aW9uc2hpcHMnKS52YWx1ZSgpKSB7XG4gICAgICAgIF8uZm9yRWFjaChyZWxhdGlvbnMsIGZ1bmN0aW9uKHJlbEl0ZW0sIHJlbEtleSkge1xuICAgICAgICAgIHJlc3VsdFtyZWxLZXldID0gc2VsZi5fZ2V0UmVsYXRpb25MaW5rKHJlbEl0ZW0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGluayBmcm9tIHJlbGF0aW9uIGZvciBsb2FkIHJlc291cmNlIGRhdGFcbiAgICAgKlxuICAgICAqIFwiZGF0YVwiOiBbe1xuICAgICAqICAgIFwidHlwZVwiOiBcInBvc3RzXCIsXG4gICAgICogICAgXCJpZFwiOiBcIjFcIixcbiAgICAgKiAgICBcImF0dHJpYnV0ZXNcIjoge1xuICAgICAqICAgICAgLi4uXG4gICAgICogICAgfSxcbiAgICAgKiAgICBcInJlbGF0aW9uc2hpcHNcIjoge1xuICAgICAqICAgICAgXCJhdXRob3JcIjogeyAgICAgICAgICAgPC0tIGlucHV0IGRhdGFcbiAgICAgKiAgICAgICAgIFwibGlua3NcIjoge1xuICAgICAqICAgICAgICAgICBcInNlbGZcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9yZWxhdGlvbnNoaXBzL2F1dGhvclwiLFxuICAgICAqICAgICAgICAgICBcInJlbGF0ZWRcIjogXCJodHRwOi8vZXhhbXBsZS5jb20vcG9zdHMvMS9hdXRob3JcIlxuICAgICAqICAgICAgICAgfSxcbiAgICAgKiAgICAgICAgIFwiZGF0YVwiOiB7IFwidHlwZVwiOiBcInBlb3BsZVwiLCBcImlkXCI6IFwiOVwiIH1cbiAgICAgKiAgICAgIH1cbiAgICAgKiAgICB9XG4gICAgICp9XVxuICAgICAqIEBwYXJhbSByZWxJdGVtXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRSZWxhdGlvbkxpbmsocmVsSXRlbSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlc291cmNlID0gW107XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlbEl0ZW0uZGF0YSkpIHtcbiAgICAgICAgdmFyIGxpbmtBcnJheSA9IFtdO1xuICAgICAgICBfLmZvckVhY2gocmVsSXRlbS5kYXRhLCBmdW5jdGlvbihkYXRhT2JqKSB7XG5cbiAgICAgICAgICBsaW5rQXJyYXkucHVzaCh7XG4gICAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IGRhdGFPYmouaWR9KVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2UgPSBsaW5rQXJyYXk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc291cmNlID0gW3tcbiAgICAgICAgICB1cmw6IGdldFJlc291cmNlVXJsKHJlbEl0ZW0ubGlua3Muc2VsZiwge3R5cGU6IHNlbGYuZGVmYXVsdC5hY3Rpb25HZXRSZXNvdXJjZSwgaWQ6IHJlbEl0ZW0uZGF0YS5pZH0pXG4gICAgICAgIH1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE11bHRpcGxlIChiYXRjaCkgbG9hZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5jbHVkZWRcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfYmF0Y2hMb2FkRGF0YShpbmNsdWRlZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBjYWNoZWQgPSB7fTtcblxuICAgICAgdmFyIGxvYWRSZXNvdXJjZXNVcmwgPSBbXTtcblxuICAgICAgXy5mb3JFYWNoKGluY2x1ZGVkLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIF8uZm9yRWFjaChpdGVtLCBmdW5jdGlvbihyZWwpIHtcbiAgICAgICAgICBfLmZvckVhY2gocmVsLCBmdW5jdGlvbihyZWxJdGVtKSB7XG5cbiAgICAgICAgICAgICAgbG9hZFJlc291cmNlc1VybC5wdXNoKHJlbEl0ZW0udXJsKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLmZldGNoQ29sbGVjdGlvbihsb2FkUmVzb3VyY2VzVXJsLCBmdW5jdGlvbihyZXNvdXJjZXMpIHtcblxuICAgICAgICBfLmZvckVhY2goaW5jbHVkZWQsIGZ1bmN0aW9uKGl0ZW0sIGtpKSB7XG4gICAgICAgICAgXy5mb3JFYWNoKGl0ZW0sIGZ1bmN0aW9uKHJlbCwga3IpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChyZWwsIGZ1bmN0aW9uKHJlbEl0ZW0sIGtyaSkge1xuICAgICAgICAgICAgICByZXN1bHRba2ldID0gcmVzdWx0W2tpXSB8fCB7fTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl0gPSByZXN1bHRba2ldW2tyXSB8fCBbXTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tpXVtrcl1ba3JpXSA9IHJlc291cmNlc1tyZWxJdGVtLnVybF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbGJhY2socmVzdWx0KVxuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaW5rc1xuICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRGb3JtQnV0dG9uQnlTY2hlbWEobGlua3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIF8uZm9yRWFjaChsaW5rcywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdidXR0b24nLFxuICAgICAgICAgIHRpdGxlOiB2YWx1ZS50aXRsZSxcbiAgICAgICAgICBsaW5rOiB2YWx1ZSxcbiAgICAgICAgICBvbkNsaWNrOiAnZWRpdCgkZXZlbnQsIGZvcm0pJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgfVxufVxuXG5PYmplY3QuYnlTdHJpbmcgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxbKFxcdyspXS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLyhcXHcrKS9nLCAnLiQxJyk7IC8vIGNvbnZlcnQgaW5kZXhlcyB0byBwcm9wZXJ0aWVzXG4gIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC4vLCAnJyk7ICAgICAgICAgICAvLyBzdHJpcCBhIGxlYWRpbmcgZG90XG4gIHZhciBhID0gcGF0aC5zcGxpdCgnLicpO1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGEubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIGsgPSBhW2ldO1xuICAgIGlmIChrIGluIG9iaikge1xuICAgICAgb2JqID0gb2JqW2tdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59OyIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tY3JlYXRlJywgZ3JpZEFjdGlvbkNyZWF0ZSk7XG5ncmlkQWN0aW9uQ3JlYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uQ3JlYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uQ3JlYXRlU3VjY2VzcywgYWN0aW9uQ3JlYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcblxuICAgICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICAgIG1zZzogZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzdWNjZXNzQ3JlYXRlZCcpXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRlRXJyb3IocmVzKSB7XG4gICAgICBzY29wZS5hbGVydHMucHVzaCh7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICBtc2c6IHJlcy5zdGF0dXNUZXh0IHx8IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc2VydmVyRXJyb3InKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1kZWxldGUnLCBncmlkQWN0aW9uRGVsZXRlKTtcbmdyaWRBY3Rpb25EZWxldGUuJGluamVjdCA9IFsnJGh0dHAnLCAnZ3JpZC1lbnRpdHknXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25EZWxldGUoJGh0dHAsIGdyaWRFbnRpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmssIHNjb3BlKSB7XG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIG1ldGhvZDogbGluay5tZXRob2QsXG4gICAgICB1cmw6IGxpbmsuaHJlZlxuICAgIH07XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uRGVsZXRlU3VjY2VzcywgYWN0aW9uRGVsZXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uRGVsZXRlU3VjY2VzcygpIHtcbiAgICAgIGlmIChncmlkRW50aXR5LnR5cGUgPT09IGdyaWRFbnRpdHkuVFlQRV9UQUJMRSkge1xuICAgICAgICBncmlkRW50aXR5LmdldFRhYmxlSW5mbyhmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICBzY29wZS5yb3dzID0gdGFibGUucm93cztcbiAgICAgICAgICBzY29wZS5jb2x1bW5zID0gdGFibGUuY29sdW1ucztcbiAgICAgICAgICBzY29wZS5saW5rcyA9IHRhYmxlLmxpbmtzO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZ3JpZEVudGl0eS50eXBlID09PSBncmlkRW50aXR5LlRZUEVfRk9STSkge1xuICAgICAgICBzY29wZS5oaWRlRm9ybSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc0RlbGV0ZWQnKVxuICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhY3Rpb25EZWxldGVFcnJvcihyZXMpIHtcbiAgICAgIHNjb3BlLmFsZXJ0cy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgIG1zZzogcmVzLnN0YXR1c1RleHQgfHwgZ3JpZEVudGl0eS5nZXRNZXNzYWdlKCdzZXJ2ZXJFcnJvcicpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5mYWN0b3J5KCdncmlkLWFjdGlvbi1nb1RvJywgZ3JpZEFjdGlvbkdvVG8pO1xuZ3JpZEFjdGlvbkdvVG8uJGluamVjdCA9IFsnJGxvY2F0aW9uJ107XG5mdW5jdGlvbiBncmlkQWN0aW9uR29UbygkbG9jYXRpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGxpbmspIHtcbiAgICB2YXIgdGVtcGxhdGVMaW5rID0gbGluay5kZWZpbml0aW9uLmRhdGEucHJvcGVydHlWYWx1ZSgnaHJlZicpO1xuICAgIHZhciByZXN1bHRMaW5rID0gdGVtcGxhdGVMaW5rLnJlcGxhY2UoL3soW15cXHssfV0qKX0vZywgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgIHJldHVybiBsaW5rLnN1YmplY3REYXRhLnByb3BlcnR5VmFsdWUocDEpO1xuICAgIH0pO1xuXG4gICAgJGxvY2F0aW9uLnVybChyZXN1bHRMaW5rKTtcbiAgfTtcbn0iLCIvKiBHcmlkIGxpbmtzIGFjdGlvbnMgKi9cbmFuZ3VsYXIubW9kdWxlKCdncmlkJykucHJvdmlkZXIoJ2dyaWQtYWN0aW9ucycsIGdyaWRBY3Rpb25zKTtcbmdyaWRBY3Rpb25zLiRpbmplY3QgPSBbXTtcbmZ1bmN0aW9uIGdyaWRBY3Rpb25zKCkge1xuXG4gIHZhciBwcm92aWRlciA9IHtcbiAgICBhY3Rpb25zOiB7fSxcbiAgICAkZ2V0OiBncmlkQWN0aW9uc0dldFxuICB9O1xuXG4gIGdyaWRBY3Rpb25zR2V0LiRpbmplY3QgPSBbJ2dyaWQtYWN0aW9uLWdvVG8nLCAnZ3JpZC1hY3Rpb24tZGVsZXRlJywgJ2dyaWQtYWN0aW9uLXVwZGF0ZScsICdncmlkLWFjdGlvbi1jcmVhdGUnXTtcbiAgcmV0dXJuIHByb3ZpZGVyO1xuXG4gIGZ1bmN0aW9uIGdyaWRBY3Rpb25zR2V0KEFjdGlvbkdvVG8sIEFjdGlvbkRlbGV0ZSwgQWN0aW9uVXBkYXRlLCBBY3Rpb25DcmVhdGUpIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICB0aGlzLmFjdGlvbnMgPSB7XG4gICAgICBnb1RvVXBkYXRlOiBBY3Rpb25Hb1RvLFxuICAgICAgZ29Ub0NyZWF0ZTogQWN0aW9uR29UbyxcbiAgICAgIGdvVG9MaXN0OiBBY3Rpb25Hb1RvLFxuICAgICAgcmVhZDogQWN0aW9uR29UbyxcbiAgICAgIGRlbGV0ZTogQWN0aW9uRGVsZXRlLFxuICAgICAgdXBkYXRlOiBBY3Rpb25VcGRhdGUsXG4gICAgICBjcmVhdGU6IEFjdGlvbkNyZWF0ZVxuICAgIH07XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGxpbmssIHNjb3BlKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uc1tsaW5rLmRlZmluaXRpb24uZGF0YS5wcm9wZXJ0eVZhbHVlKCdyZWwnKV0obGluaywgc2NvcGUpO1xuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgfTtcbiAgfVxufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZmFjdG9yeSgnZ3JpZC1hY3Rpb24tdXBkYXRlJywgZ3JpZEFjdGlvblVwZGF0ZSk7XG5ncmlkQWN0aW9uVXBkYXRlLiRpbmplY3QgPSBbJyRodHRwJywgJ2dyaWQtZW50aXR5J107XG5mdW5jdGlvbiBncmlkQWN0aW9uVXBkYXRlKCRodHRwLCBncmlkRW50aXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbihsaW5rLCBzY29wZSkge1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBtZXRob2Q6IGxpbmsubWV0aG9kLFxuICAgICAgdXJsOiBsaW5rLmhyZWYsXG4gICAgICBkYXRhOiBzY29wZS5tb2RlbFxuICAgIH07XG5cbiAgICBzY29wZS4kYnJvYWRjYXN0KCdzY2hlbWFGb3JtVmFsaWRhdGUnKTtcbiAgICBpZiAoIXNjb3BlLnNjb3BlRm9ybS5ncmlkRm9ybS4kdmFsaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAkaHR0cChwYXJhbXMpLnRoZW4oYWN0aW9uVXBkYXRlU3VjY2VzcywgYWN0aW9uVXBkYXRlRXJyb3IpO1xuXG4gICAgZnVuY3Rpb24gYWN0aW9uVXBkYXRlU3VjY2VzcygpIHtcbiAgICAgIGdyaWRFbnRpdHkuZ2V0Rm9ybUluZm8oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAgIHNjb3BlLmZvcm0gPSBmb3JtLmZvcm07XG4gICAgICAgIHNjb3BlLm1vZGVsID0gZm9ybS5tb2RlbDtcbiAgICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtc2c6IGdyaWRFbnRpdHkuZ2V0TWVzc2FnZSgnc3VjY2Vzc1VwZGF0ZWQnKVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFjdGlvblVwZGF0ZUVycm9yKHJlcykge1xuICAgICAgc2NvcGUuYWxlcnRzLnB1c2goe1xuICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgbXNnOiByZXMuc3RhdHVzVGV4dCB8fCBncmlkRW50aXR5LmdldE1lc3NhZ2UoJ3NlcnZlckVycm9yJylcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufSIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkRm9ybScsIGdyaWRGb3JtRGlyZWN0aXZlKTtcblxuLy9UT0RPOiBzaG91bGQgYmUgc2V0IHJlcXVpcmUgLi4uIGRlcGVuZHMgb24gdm1zR3JpZFxuZnVuY3Rpb24gZ3JpZEZvcm1EaXJlY3RpdmUoKSB7XG4gIHZhciBkaXJlY3RpdmUgPSB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICByZXBsYWNlOiB0cnVlLFxuICAgIGNvbnRyb2xsZXI6IGdyaWRGb3JtRGlyZWN0aXZlQ3RybFxuICB9O1xuXG4gIGdyaWRGb3JtRGlyZWN0aXZlQ3RybC4kaW5qZWN0ID0gWyckc2NvcGUnLCAnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkRm9ybURpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgICRzY29wZS5zY29wZUZvcm0gPSB7XG4gICAgICBncmlkRm9ybToge31cbiAgICB9O1xuXG4gICAgJHNjb3BlLnNldEZvcm1TY29wZT0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgJHNjb3BlLnNjb3BlRm9ybSA9IHNjb3BlO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LmdldEZvcm1JbmZvKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAkc2NvcGUuc2NoZW1hID0gZm9ybS5zY2hlbWE7XG4gICAgICAkc2NvcGUuZm9ybSA9IGZvcm0uZm9ybTtcbiAgICAgICRzY29wZS5tb2RlbCA9IGZvcm0ubW9kZWw7XG4gICAgICAkc2NvcGUubGlua3MgPSBmb3JtLmxpbmtzO1xuICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24oJGV2ZW50LCBmb3JtKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24oZm9ybS5saW5rLCAkc2NvcGUpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZ28gPSBmdW5jdGlvbihsaW5rKSB7XG4gICAgICBncmlkQWN0aW9ucy5hY3Rpb24obGluaywgJHNjb3BlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgJHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cbn1cbiIsImFuZ3VsYXIubW9kdWxlKCdncmlkJykuZGlyZWN0aXZlKCdncmlkVGFibGUnLCBncmlkVGFibGVEaXJlY3RpdmUpO1xuXG5ncmlkVGFibGVEaXJlY3RpdmUuJGluamVjdCA9IFsnZ3JpZC1lbnRpdHknLCAnZ3JpZC1hY3Rpb25zJ107XG5cbi8vVE9ETzogc2hvdWxkIGJlIHNldCByZXF1aXJlIC4uLiBkZXBlbmRzIG9uIHZtc0dyaWRcbmZ1bmN0aW9uIGdyaWRUYWJsZURpcmVjdGl2ZShncmlkRW50aXR5LCBncmlkQWN0aW9ucykge1xuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIGNvbnRyb2xsZXI6IGdyaWRUYWJsZURpcmVjdGl2ZUN0cmxcbiAgICB9O1xuXG4gIGdyaWRUYWJsZURpcmVjdGl2ZUN0cmwuJGluamVjdCA9IFsnJHNjb3BlJ107XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcblxuICBmdW5jdGlvbiBncmlkVGFibGVEaXJlY3RpdmVDdHJsKCRzY29wZSkge1xuICAgICRzY29wZS5hbGVydHMgPSBbXTtcblxuICAgIGdyaWRFbnRpdHkuZ2V0VGFibGVJbmZvKGZ1bmN0aW9uKHRhYmxlKSB7XG4gICAgICAkc2NvcGUucm93cyA9IHRhYmxlLnJvd3M7XG4gICAgICAkc2NvcGUuY29sdW1ucyA9IHRhYmxlLmNvbHVtbnM7XG4gICAgICAkc2NvcGUubGlua3MgPSB0YWJsZS5saW5rcztcbiAgICAgIC8vJHNjb3BlLiRkaWdlc3QoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24obGluaykge1xuICAgICAgZ3JpZEFjdGlvbnMuYWN0aW9uKGxpbmssICRzY29wZSk7XG4gICAgfTtcblxuICAgICRzY29wZS5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuICB9XG59IiwiYW5ndWxhci5tb2R1bGUoJ2dyaWQnKS5kaXJlY3RpdmUoJ3Ztc0dyaWQnLCB2bXNHcmlkRGlyZWN0aXZlKTtcblxuZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZSgpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlOiAnPG5nLWluY2x1ZGUgc3JjPVwiZ2V0VGVtcGxhdGVVcmwoKVwiIC8+JyxcbiAgICBzY29wZToge1xuICAgICAgZ3JpZE1vZGVsOiAnPWdyaWRNb2RlbCdcbiAgICB9LFxuICAgIGNvbnRyb2xsZXI6IHZtc0dyaWREaXJlY3RpdmVDdHJsLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbCwgYXR0ciwgY3RybCkge1xuXG4gICAgfVxuICB9O1xuXG4gIHZtc0dyaWREaXJlY3RpdmVDdHJsLiRpbmplY3QgPSBbJyRzY29wZScsICdncmlkLWVudGl0eSddO1xuXG4gIHJldHVybiBkaXJlY3RpdmU7XG5cbiAgZnVuY3Rpb24gdm1zR3JpZERpcmVjdGl2ZUN0cmwoJHNjb3BlLCBncmlkRW50aXR5KSB7XG4gICAgJHNjb3BlLmdldFRlbXBsYXRlVXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoJHNjb3BlLmdyaWRNb2RlbC5wYXJhbXMudHlwZSkge1xuICAgICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL2Zvcm0uaHRtbCc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ3RlbXBsYXRlcy9ncmlkL3RhYmxlLmh0bWwnO1xuICAgIH07XG5cbiAgICBncmlkRW50aXR5LnNldE1vZGVsKCRzY29wZS5ncmlkTW9kZWwpO1xuICB9XG59Il0sInNvdXJjZVJvb3QiOiIuLi9zcmMvIn0=