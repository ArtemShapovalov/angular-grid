angular.module('grid').factory('gridForm', gridForm);
gridForm.$inject = ['grid-entity', '$timeout', '_'];
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
    }
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

    $timeout(function() {
      self.fetchData(url, fetchDataSuccess);
    });

    function fetchDataSuccess(data, schema) {

      self._getFormConfig(data, callbackFormConfig);

      function callbackFormConfig(config) {

        self.links = data.links();
        self.model = self._fieldsToFormFormat(data);
        self.form = config;

        self.schema = data.attributesData().schemas()[0].data.value();
        _.forEach(self.schema.properties, function(value, key) {
          self.schema.properties[key] = self._convertExtendSchema(data, key);
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
    var fields = data.attributesData().value();

    data.relationshipsData().properties(function(key, relation) {

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
   * @param data
   * @param callback
   * @private
   */
  function _getFormConfig(data, callback) {
    var self = this;

    var result = [];

    self._createTitleMap(data.property('data'), function(titleMaps) {
      var attributes = data.schemas().propertySchemas('data').getFull().propertySchemas('attributes').definedProperties();

      _.forEach(attributes, function(key) {
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

    data.property('data').items(function(index, value) {
      enumValues.push(value.propertyValue('id'));
    });

    return enumValues;
  }

  function _getTitleMapsForRelations(data, callback) {
    var self = this;
    var sourceTitleMaps = [];
    var resources = [];

    data.property('relationships').properties(function(propertyName, propertyData) {

      if (!_.isEmpty(propertyData.links('relation'))) {
        resources.push({
          url: propertyData.links('relation')[0].href,
          data: propertyData
        });
      }

    });

    self.fetchCollection(_.map(resources, 'url'), function(loadResources) {

      _.forEach(resources, function(enums) {

        var propertyData = enums.data;
        var attributeData = data.property('attributes').property(propertyData.parentKey());

        var sourceEnum = self._getEnumValues(loadResources[enums.url].data);

        var attributeSchemas = data.property('attributes').schemas().propertySchemas(propertyData.parentKey());
        attributeData.addSchema(self._getExtendEnumSchema(attributeSchemas, sourceEnum));

        _.forEach(sourceEnum, function(enumItem) {
          var url = self.getResourceUrl(propertyData.links('relation')[0].href, {
              type: self.default.actionGetResource,
              id: enumItem
            }
          );

          sourceTitleMaps.push({
            url: url,
            enumItem: enumItem,
            relationName: propertyData.parentKey(),
            attributeName: propertyData.schemas().relationField()
          })
        });
      });

      callback(sourceTitleMaps);

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
  function _convertExtendSchema(data, key) {
    var schemas = data.property('data').property('attributes').schemas().propertySchemas(key).getFull();
    var schemasEnum = data.property('data').property('attributes').property(key).schemas().getFull();

    if (schemas[0].andSchemas().length) {
      var replaceAllOfSchema = schemas[0].data.value();
      delete replaceAllOfSchema.allOf;

      angular.forEach(schemas[0].andSchemas(), function(andSchema) {
        replaceAllOfSchema = angular.extend(andSchema.data.value(), replaceAllOfSchema)
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
    var self = this;
    var mergeObj;
    var result;

    if (schemaList.basicTypes().toString() == 'array') {
      mergeObj = {
        items: {
          enum: sourceEnum
        }
      }
    } else {
      mergeObj = {enum: sourceEnum}
    }

    result = Jsonary.createSchema(
      _.merge({}, schemaList[0].data.value(), mergeObj)
    );

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

    self._getTitleMapsForRelations(data, function(sourceTitleMaps) {

      self.fetchCollection(_.map(sourceTitleMaps, 'url'), function(resources) {
        var titleMaps = {};

        _.forEach(sourceTitleMaps, function(item) {

          if (!titleMaps[item.relationName]) {
            titleMaps[item.relationName] = [];
          }

          titleMaps[item.relationName].push({
            value: item.enumItem,
            name: resources[item.url].data.property('data').property('attributes')
              .propertyValue(item.attributeName) || item.enumItem
          });
        });

        callback(titleMaps)
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
