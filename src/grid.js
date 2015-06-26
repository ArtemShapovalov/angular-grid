angular.module('grid').provider('grid-entity', gridEntity);

function gridEntity() {

  var provider = {
    $get: gridEntityGet
  };

  gridEntityGet.$inject = ['Helper', '$interval', '_'];

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

    }

    /**
     * Jsonary data object
     *
     * @type {Jsonary}
     */
    this.data = {};

    angular.extend(Entity.prototype, {
      default: {
        actionGetResource: 'read'
      },
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
      return result
    }

    /**
     * Fetch data by url and include schema from header data
     * @param url
     * @param callback
     * @returns {boolean}
     */
    function loadData(url, callback) {
      /*jshint validthis: true */

      Jsonary.getData(url, function(jData, request) {
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

      Jsonary.getSchema(url, function(jSchema) {

        var schema = jSchema.data.document.raw.value();
        var data = Jsonary.create(self._getEmptyData(jSchema.data.value(), schema));
        data.document.url = self.getModel().url;
        data.addSchema(jSchema);

        if (callback !== undefined) {
          callback(data, schema);
        }

      });
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

      _.forEach(links, function(url) {

        self.loadData(url, function(data, schema, request) {
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
          }
          if (typeof haystack[key] === 'object' && !Array.isArray(haystack[key]) && (haystack[key] !== 'links')) {
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
            url: self.getResourceUrl(relItem.links.self, {type: self.default.actionGetResource, id: dataObj.id})
          });
        });
        resource = linkArray;

      } else {
        resource = [{
          url: self.getResourceUrl(relItem.links.self, {type: self.default.actionGetResource, id: relItem.data.id})
        }];
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

      _.forEach(rowsRelationships, function(row) {
        _.forEach(row, function(rel) {
          _.forEach(rel, function(relItem) {

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

      self.fetchCollection(getLinkFromRowsDataRelations(rowsRelationships), function(resources) {
        var result = [];

        _.forEach(rowsRelationships, function(row, kRow) {
          _.forEach(row, function(rel, kRel) {
            _.forEach(rel, function(relItem, kRelItem) {
              result[kRow] = result[kRow] || {};
              result[kRow][kRel] = result[kRow][kRel] || [];
              result[kRow][kRel][kRelItem] = resources[relItem.url];
            });
          });
        });

        callback(result);

      });
    }

  }
}