angular.module('grid').run(['$templateCache', function ($templateCache) {
  $templateCache.put('templates/grid/table.html',
    '<grid-table>' +
      '<span ng-repeat="link in links">' +
        '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
      '</span>'+
      '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>'+
      '<table class="table grid">'+
        '<thead>'+
          '<tr>'+
            '<th ng-repeat="column in columns">{{column.title}}</th>'+
          '</tr>'+
        '</thead>'+
        '<tbody>'+
          '<tr ng-repeat="row in rows">'+
            '<td ng-repeat="column in columns">'+
              '<span ng-if="column.attributeName !== \'links\'">{{row[column.attributeName]}}</span>'+
              '<span ng-if="column.attributeName == \'links\'">'+
                '<span ng-repeat="link in row.links">' +
                  '<a href="javascript:void(0);" ng-click="edit(link)">{{link.title}}</a> ' +
                '</span>'+
              '</span>'+
            '</td>'+
          '</tr>'+
        '</tbody>'+
      '</table>' +
    '</grid-table>'
  );

  $templateCache.put('templates/grid/form.html',
    '<grid-form>' +
      '<span ng-repeat="link in links">' +
        '<a href="javascript:void(0);" ng-click="go(link)">{{link.title}}</a> ' +
      '</span>'+
      '<div>' +
        '<alert ng-repeat="alert in alerts" type="{{alert.type}}" close="closeAlert($index)">{{alert.msg}}</alert>'+
      '</div>' +
      '<form novalidate name="gridForm" ng-init="setFormScope(this)"' +
        'sf-schema="schema" sf-form="form" sf-model="model"' +
        'class="form-horizontal" role="form" ng-if="hideForm !== true">'+
      '</form>'+
    '</grid-form>'
  );
}]);

angular.module('grid').factory('_', function () {
  return lodash;
});

angular.module('grid').provider('grid-entity', gridEntity);

function gridEntity() {
  var data,
      schema;

  var provider = {
    $get: gridEntityGet
  };

  gridEntityGet.$inject = ['$timeout', '$interval', '_'];

  return provider;

  function gridEntityGet($timeout, $interval, _) {
    var model,
        messages = {
          successDeleted: 'Successfully delete',
          successCreated: 'Successfully create',
          successUpdated: 'Successfully update',
          serverError: 'Oops! server error'
        };

    return {
      default: {
        actionGetResource: 'read'
      },
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
      loadCollectionResource: loadCollectionResource,
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

    function _getEmptyData(schema, fullSchema) {
      var result;
      var schemaWithoutRef = mergeRelSchema(schema, fullSchema);

      result = _.clone(schemaWithoutRef.properties);
      result.data = getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties));
      result.data.attributes = getTypeProperty(_.clone(schemaWithoutRef.properties.data.properties.attributes.properties));

      function getTypeProperty(obj) {
        var tmpObj = obj;
        _.forEach(tmpObj, function(value, key) {
          if (value.type) {
            switch(value.type) {
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
      return result
    }

    function getTableInfo(callback) {
      /*jshint validthis: true */
      var self = this,
        model = self.getModel(),
        url;

      url = getResourceUrl(model.url, model.params);

      $timeout(function() {
        self.fetchData(url, fetchDataSuccess);
      });

      function fetchDataSuccess(data, schema) {

        var schemaWithoutRef = mergeRelSchema(data.schemas()[0].data.value(), schema);

          self.type = self.TYPE_TABLE;
          if (!self.config.table) {
            self.config.table = {};
          }


        self._getRowsByData(data, function(rows, relations) {

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
      var self = this,
          model = self.getModel(),
          url;

      url = getResourceUrl(model.url, model.params);

      $timeout(function() {
        self.fetchData(url, fetchDataSuccess);
      });

      function fetchDataSuccess(data, schema) {
        var newData = data.property('data').property('attributes');
        var schemaWithoutRef = mergeRelSchema(newData.schemas()[0].data.value(), schema);

        self.type = self.TYPE_FORM;
        if (!self.config.form) {
          self.config.form = {};
        }

        self._getFieldsForm(data, function(fields, relations) {

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

        })

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

      self._createTitleMap(data.property('data'), function(titleMaps) {

        var attributes = mergeRelSchema(
          data.property('data').schemas()[0].data.value(),
          data.schemas()[0].data.document.raw.value()
        ).properties.attributes.properties;

        _.forEach(attributes, function(value, key) {
          var obj = {key: key};

          if (titleMaps[key]) {
              obj.titleMap = titleMaps[key]
          }
          result.push(obj)
        });

        $timeout(function() {
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
            relationships: _.mapValues(relationResources[0], function(n) {
              _.forEach(n, function(item, index){
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

      _.forEach(relations, function(item, key) {

        var resourceLink = item.links.self;
        /** get name from schema */
        var attributeName = dataRelations.property(key).schemas()[0].data.propertyValue('name');
        var schemaAttributeWithoutRef = self._replaceFromFull(dataAttributes.schemas()[0].data.value(), documentSchema)['properties'][key];

        var sourceEnum = {};

        if (schemaAttributeWithoutRef.items && schemaAttributeWithoutRef.items.enum) {
          sourceEnum = schemaAttributeWithoutRef.items.enum
        } else if (schemaAttributeWithoutRef.enum) {
          sourceEnum = schemaAttributeWithoutRef.enum
        }

        _.forEach(sourceEnum, function (enumItem) {
          var url = resourceLink + '/' + self.default.actionGetResource +'/' + enumItem;

          sourceTitleMaps.push({
            url: url,
            enumItem: enumItem,
            relationName: key,
            attributeName: attributeName
          })
        });

      });

      self.loadCollectionResource(_.map(sourceTitleMaps, 'url'), function(resources) {
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

        callback(titleMaps)
      });

    }

    /**
     * Multiple load resource by array links
     * @param linkResources
     * @param callback
     */
    function loadCollectionResource(linkResources, callback) {
      var self = this;
      var loaded = 0;
      var total = 0;
      var resources = {};

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

      var interval = $interval(function() {
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
          if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && (haystack[key] !== 'links')) {
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


      _.forEach(columns, function(value, key) {
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

      _.forEach(resource.relationships, function(relation, key) {
        fields[key] = _.map(relation, function(relationItem) {
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
      _.forEach(rows, function(resource) {
        var data = resource.own;
        var tmp = data.property('attributes').value();

        _.forEach(resource.relationships, function(relation, key) {
          tmp[key] = _.map(relation, function(relationItem) {
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
        _.forOwn(data.links(), function(link) {
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
      data.property('data').items(function(index, value) {

        included.push(self._getRelationResource(value));

        rows.push(value);
      });

      self._batchLoadData(included, batchLoaded);

      function batchLoaded(relationResources) {
        var res = [];

        _.forEach(rows, function(row, index) {
          var tmpRow = {
            own: row,
            relationships: _.mapValues(relationResources[index], function(n) {
              _.forEach(n, function(item, index){
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
        _.forEach(relations, function(relItem, relKey) {
          result[relKey] = self._getRelationLink(relItem);
        })
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
        _.forEach(relItem.data, function(dataObj) {

          linkArray.push({
            url: getResourceUrl(relItem.links.self, {type: self.default.actionGetResource, id: dataObj.id})
          });
        });
        resource = linkArray;

      } else {
        resource = [{
          url: getResourceUrl(relItem.links.self, {type: self.default.actionGetResource, id: relItem.data.id})
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
      var result = [];
      var resources = {};
      var cached = {};
      var total = 0;
      var loaded = 0;

      _.forEach(included, function(item) {
        _.forEach(item, function(rel) {
          _.forEach(rel, function(relItem) {
            if (cached[relItem.url]) {
              console.log('cache');
              total++;
            } else {
              loadData(relItem.url, success);
              cached[relItem.url] = {};
              total++;
              loaded++;
            }
          });
        });
      });

      var interval = $interval(function() {
        if (_.size(resources) === loaded) {
          $interval.cancel(interval);

          _.forEach(included, function(item, ki) {
            _.forEach(item, function(rel, kr) {
              _.forEach(rel, function(relItem, kri) {
                result[ki] = result[ki] || {};
                result[ki][kr] = result[ki][kr] || [];
                result[ki][kr][kri] = resources[relItem.url];
              });
            });
          });

          callback(result)
        }
      }, 100);

      function success(data, schema) {
        resources[data.document.url] = {
          data: data,
          schema: schema
        };
        console.log('load');
      }
    }

    /**
     *
     * @param links
     * @returns {Array}
     */
    function getFormButtonBySchema(links) {
      var result = [];
      _.forEach(links, function(value) {
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

Object.byString = function(obj, path) {
  path = path.replace(/\[(\w+)]/g, '.$1'); // convert indexes to properties
  path = path.replace(/\/(\w+)/g, '.$1'); // convert indexes to properties
  path = path.replace(/^\./, '');           // strip a leading dot
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