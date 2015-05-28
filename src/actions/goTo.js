angular.module('grid').factory('grid-action-goTo', gridActionGoTo);
gridActionGoTo.$inject = ['$location'];
function gridActionGoTo($location) {
  return function(link) {
    var templateLink = link.definition.data.propertyValue('href');
    var resultLink = templateLink.replace(/{([^\{,}]*)}/g, function(match, p1){
      return link.subjectData.propertyValue(p1);
    });

    $location.url(resultLink);
  };
}