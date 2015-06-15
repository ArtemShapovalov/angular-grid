angular.module('grid').factory('gridTable', gridTable);
gridTable.$inject = ['grid-entity', '$timeout', '$interval', '_'];
function gridTable(gridEntity) {

  angular.extend(this, gridEntity);

  function Table() {
    this.rows = {};
    this.columns = {};
    this.schema = {};
    this.links = {};

    return {
      getTableInfo: getTableInfo,
      _getRowsByData: _getRowsByData,
      _getLinkFromRowsDataRelations: _getLinkFromRowsDataRelations,
    }
  }

  return Table;
}