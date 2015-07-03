angular.module('grid').factory('gridTable', gridTable);
gridTable.$inject = ['grid-entity', 'gridPagination', 'Sorting', '$timeout', '_'];
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
    }
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

    $timeout(function() {
      self.fetchData(url, fetchDataSuccess);
    });

    function fetchDataSuccess(data, schema) {
      var schemaWithoutRef = self.mergeRelSchema(data.schemas()[0].data.value(), schema);

      self.pagination.setTotalCount(data.property('meta').propertyValue('total'));

      self._getRowsByData(data, function(rows) {

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
    this.sorting.setSorting(field, direction)
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
      return this.getSortingParamByField(this.sorting.field) + '_' + this.sorting.direction
    }
    return null
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
    _.forEach(columns.definedProperties(), function(key) {
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
    _.forEach(rows, function(row) {
      var data = row.own;
      var rowResult = data.property('attributes').value();

      _.forEach(row.relationships, function(relation, key) {
        rowResult[key] = _.map(relation, function(relationItem) {
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
      _.forOwn(data.links(), function(link) {
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
            _.forEach(n, function(item, index) {
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