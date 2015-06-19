angular.module('grid').factory('gridTable', gridTable);
gridTable.$inject = ['grid-entity', 'gridPagination', '$timeout', '_'];
function gridTable(gridEntity, gridPagination, $timeout, _) {

  function Table() {
    /**
     * @type {gridPagination}
     */
    this.pagination = new gridPagination(),
    this.rows = [];
    this.columns = {};
    this.schema = {};
    this.links = {};
  }

  angular.extend(Table.prototype, {
    getConfig: getConfig,
    getTableInfo: getTableInfo,
    getColumnsBySchema: getColumnsBySchema,
    rowsToTableFormat: rowsToTableFormat,
    _getRowsByData: _getRowsByData
  }, gridEntity);

  return Table;

  function getConfig() {
    var self = this;
    return {
      rows: self.rows,
      columns: self.columns,
      schema: self.schema,
      links: self.links
    }
  }

  function getTableInfo(callback) {
    /*jshint validthis: true */
    var self = this,
      model = self.getModel(),
      url;

    url = self.pagination.getPageUrl(self.getResourceUrl(model.url, model.params));

    $timeout(function() {
      self.fetchData(url, fetchDataSuccess);
    });

    function fetchDataSuccess(data, schema) {
      var schemaWithoutRef = self.mergeRelSchema(data.schemas()[0].data.value(), schema);

      self.pagination.setTotalCount(data.property('meta').propertyValue('total'));

      self.type = self.TYPE_TABLE;

      self._getRowsByData(data, function(rows) {

        self.rows = self.rowsToTableFormat(rows);
        self.links = data.links();
        self.columns = self.getColumnsBySchema(schemaWithoutRef);
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
          var field = row.own.property('relationships').property(key).schemas()[0].data.propertyValue('name');
          /** name additional field(relation row) */
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

}




