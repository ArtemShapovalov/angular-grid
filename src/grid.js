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

  gridEntityGet.$inject = ['_', '$q'];

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
        relationshipsValue: function() {
          return this.propertyValue('relationships');
        },
        attributesValue: function() {
          return this.propertyValue('attributes');
        },
        relationships: function() {
          return this.property('data').property('relationships');
        },
        attributes: function() {
          return this.property('data').property('attributes');
        }
      });

      Jsonary.extendSchema({
        relationField: function() {
          return this.data.propertyValue('relationField');
        }
      });
      Jsonary.extendSchemaList({
        relationField: function() {
          var relationField = null;
          this.getFull().each(function(index, schema) {
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
    Entity.prototype.default = {
      actionGetResource: 'read'
    };

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
      return $q(function(resolve) {

        Jsonary.getData(url, function(jData, request) {
          var data = jData;
          var schema = jData.property('data').schemas()[0].data.document.raw.value();

          resolve({
            data: data,
            schema: schema,
            request: request
          });

        });

      })
    }

    /**
     * Fetch schema by url, create empty data and join them
     * @param url
     */
    function loadSchema(url) {
      var self = this;

      return $q(function(resolve) {
        Jsonary.getSchema(url, function(jSchema) {

          var schema = jSchema.data.document.raw.value();
          var data = Jsonary.create(self._getEmptyData(jSchema));
          data.document.url = self.getModel().url;
          data.addSchema(jSchema);

          resolve({data: data, schema: schema});

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
      _.forEach(schemaAttributes.definedProperties(), function(propertyName) {

        result.data.attributes[propertyName] = schemaAttributes.propertySchemas(propertyName).createValue() != undefined
          ? schemaAttributes.propertySchemas(propertyName).createValue()
          : schemaAttributes.propertySchemas(propertyName)[0].defaultValue();
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

      _.forEach(relationsSchema.definedProperties(), function(relationName) {

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

      _.forEach(links, function(url) {

        var request = self.loadData(url).then(function(response) {
          resources[url] = response;
        });

        allRequest.push(request);
      });

      $q.all(allRequest).then(function() {
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
          result[kRow] = result[kRow] || {};
          _.forEach(row, function(rel, kRel) {
            result[kRow][kRel] = result[kRow][kRel] || [];
            _.forEach(rel, function(relItem, kRelItem) {
              result[kRow][kRel][kRelItem] = resources[relItem.url];
            });
          });
        });

        callback(result);

      });
    }

  }
}
