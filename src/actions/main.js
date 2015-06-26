/* Grid links actions */
angular.module('grid').provider('grid-actions', gridActions);
gridActions.$inject = [];
function gridActions() {

  var provider = {
    actions: {},
    $get: gridActionsGet
  };

  gridActionsGet.$inject = ['grid-action-goTo', 'grid-action-delete', 'grid-action-update', 'grid-action-create'];
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
      action: function(obj, link, scope) {
        this.actions[link.definition.data.propertyValue('rel')](obj, link, scope);
      }.bind(this)
    };
  }
}