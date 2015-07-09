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
    getColumns: getColumns,
    getColumnsBySchema: getColumnsBySchema,
    rowsToTableFormat: rowsToTableFormat,
    rowToTableFormat: rowToTableFormat,
    getSortingParamByField: getSortingParamByField,
    getSortingParamValue: getSortingParamValue,
    setSorting: setSorting,
    _getRelationResources: _getRelationResources,
    _getRelationLink: _getRelationLink,
    _getRowsByData: _getRowsByData,
    _getLinks: _getLinks
  });

  return Table;
  /**
   * Get all data needed for rendering table
   *
   * @returns {{rows: *, columns: *, links: *}}
   */
  function getConfig() {
    var self = this;
    return {
      rows: self.rows,
      columns: self.columns,
      links: self.links
    }
  }

  /**
   * Main function for get rendering data
   *
   * @param callback
   */
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

    function fetchDataSuccess(data) {

      self.pagination.setTotalCount(data.property('meta').propertyValue('total'));
      self._getRowsByData(data, function(rows) {

        self.rows = self.rowsToTableFormat(rows);
        self.links = data.links();
        self.columns = self.getColumns(data);

        if (callback !== undefined) {
          callback(self.getConfig());
        }

      });
    }

  }

  /**
   * Get name sorting field and set it
   *
   * @param field
   * @param direction
   */
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
    var rel = this.data.property('data').item(0).property('relationships').property(field).schemas().relationField();

    if (rel) {
      result += '.' + rel;
    }

    return result;
  }

  /**
   * Get value for sorting GET param
   *
   * @returns {*}
   */
  function getSortingParamValue() {
    if (this.sorting.direction) {
      return this.getSortingParamByField(this.sorting.field) + '_' + this.sorting.direction
    }
    return null
  }

  /**
   * Get Columns info by schema and set sortable fields
   *
   * @name Table#getColumnsBySchema
   * @param data
   * @returns {Array}
   */
  function getColumns(data) {
    var self = this;
    var attributes = data.property('data').item(0).property('attributes');
    var relationships = data.property('data').item(0).property('relationships');

    var allColumns = _.union(self.getColumnsBySchema(attributes), self.getColumnsBySchema(relationships));

    self.sorting.setSortFields(_.map(allColumns, 'attributeName'));

    allColumns.push({
      title: 'Actions',
      type: 'string',
      attributeName: 'links'
    });

    return allColumns;
  }

  /**
   * Get columns and attach attributeName in column for rendering
   *
   * @param columns
   * @returns {Array}
   */
  function getColumnsBySchema(columns) {
    var result = [];
    columns.properties(function(key, property) {
      var value = property.schemas()[0].data.value();
      value.attributeName = key;
      result.push(value);
    });
    return result;
  }

  /**
   * Convert array Jsonary Data to result array for rendering table
   *
   * @name Table#rowsToTableFormat
   * @param rows
   * @returns {Array}
   */
  function rowsToTableFormat(rows) {
    var self = this;
    var result = [];
    _.forEach(rows, function(row) {
      result.push(self.rowToTableFormat(row));
    });
    return result;
  }

  /**
   * Convert Jsonary data to render view data in table
   *
   * @param row Consists of own and relationships data
   * @returns {*}
   */
  function rowToTableFormat(row) {
    var self = this;
    var rowResult = row.own.property('attributes').value();

    _.forEach(row.relationships, function(relation, key) {

      rowResult[key] = _.map(relation, function(relationItem) {
        var field = row.own.schemas().propertySchemas('relationships').propertySchemas(key).relationField();
        if (field) {
          return relationItem.property('data').property('attributes').propertyValue(field);
        }
        return relationItem.property('data').propertyValue('id');
      }).join(', ');

    });

    rowResult.links = self._getLinks(row.own);

    return rowResult;
  }

  /**
   * Get links for current data
   *
   * @param data
   * @returns {Array}
   * @private
   */
  function _getLinks(data) {
    var result = [];
    _.forOwn(data.links(), function(link) {
      result.push(link);
    });
    return result;
  }

  /**
   * Get array rows by Jsonary Data
   *
   * @name Table#_getRowsByData
   * @param data Jsonary
   * @param callback
   * @returns {Array}
   */
  function _getRowsByData(data, callback) {
    var self = this;
    var rows = [];
    var included = [];
    data.property('data').items(function(index, value) {
      included.push(self._getRelationResources(value));
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

  /**
   * Circumvention the array relationships and get links for late them load
   *
   * @param data
   * @returns {Object} link for get resource
   */
  function _getRelationResources(data) {
    var self = this;
    var result = {};

    data.property('relationships').properties(function(relName, relData) {
      result[relName] = self._getRelationLink(relData);
    });

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
    var resources = [];

    if (Array.isArray(relItem.propertyValue('data'))) {

      relItem.property('data').items(function(index, dataObj) {
        resources.push({
          url: self.getResourceUrl(relItem.links()[0].href, {
            type: self.default.actionGetResource,
            id: dataObj.propertyValue('id')
          })
        });
      });

    } else {

      if (!_.isEmpty(relItem.links('relation'))) {
        resources = [{
          url: self.getResourceUrl(relItem.links('relation')[0].href, {
            type: self.default.actionGetResource,
            id: relItem.property('data').propertyValue('id')
          })
        }];
      }

    }
    return resources;
  }

}