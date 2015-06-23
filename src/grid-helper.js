angular.module('grid').factory('Helper', helperSrv);
helperSrv.$inject = ['_'];
function helperSrv() {

  var factory =  {
    parseLocationSearch: parseLocationSearch,
    setLocationSearch: setLocationSearch
  };

  return factory;

  /**
   * Parse search param url
   * @param url
   * @returns {*}
   */
  function parseLocationSearch(url) {
    var searchParams;
    var pos = url.indexOf('?');

    if (pos>=0) {
      // Remove the '?' at the start of the string and split out each assignment
      searchParams = _.chain( url.slice(url.indexOf('?') + 1).split('&') )
          // Split each array item into [key, value] ignore empty string if search is empty
          .map(function(item) { if (item) return item.split('='); })
          // Remove undefined in the case the search is empty
          .compact()
          // Turn [key, value] arrays into object parameters
          .object()
          // Return the value of the chain operation
          .value();
    }

    return searchParams || {};
  }

  function setLocationSearch(url, searchParams) {
    var searchPath;
    var pos = url.indexOf('?');
    var result = url;

    if (pos>=0) {
      result = url.slice(0, pos);
    }

    searchPath = Object.keys(searchParams).map(function(k) {
      return k + '=' + encodeURIComponent(searchParams[k])
    }).join('&');

    searchPath = searchPath ? '?'+searchPath: '';

    return result + searchPath;
  }
}