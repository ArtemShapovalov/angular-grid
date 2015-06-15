angular.module('grid').factory('gridFormSrv', gridForm);
gridForm.$inject = ['grid-entity', '$timeout', '$interval', '_'];
function gridForm(gridEntity, $timeout, $interval, _) {
  angular.extend(this, gridEntity);

  function Form() {
    this.model = {};
    this.form = [];
    this.schema = {};
    this.links = {};

    return {
      getFormInfo: getFormInfo,
      _getTitleMapsForRelations: _getTitleMapsForRelations,
      _createTitleMap: _createTitleMap,
      _getFormConfig: _getFormConfig,
      _getFieldsForm: _getFieldsForm,
      _getEmptyData: _getEmptyData,
      _getFormButtonBySchema: _getFormButtonBySchema
    }
  }


  return Form;
}