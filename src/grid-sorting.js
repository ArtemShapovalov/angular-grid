angular.module('grid').factory('Sorting', sortingSrv);
sortingSrv.$inject = ['Helper', '_'];
function sortingSrv(Helper, _) {
  /**
   * @class
   * @constructor
   */
  function Sorting() {
    this.sortParam = 'sort';
  }

  Sorting.DIRECTION_ASC = 'asc';
  Sorting.DIRECTION_DESC = 'desc';
  Sorting.field = undefined;
  Sorting.direction = '';
  Sorting.sortFields = [];

  angular.extend(Sorting.prototype, {
    getColumn: getColumn,
    getDirectionColumn: getDirectionColumn,
    setSortFields: setSortFields,
    setSorting: setSorting,
    getUrl: getUrl
  });

  return Sorting;

  /**
   * @name Sorting#getDirectionColumn
   * @param currentDirection
   * @returns {*}
   */
  function getDirectionColumn(currentDirection) {
    if (!currentDirection) {
      return 'asc';
    }
    return currentDirection == 'asc' ? 'desc' : '';
  }

  /**
   * Get column for field if field have '.' then get first part
   * For example: 'user.name' return 'user'
   *
   * @name Sorting#getColumn
   *
   * @returns {string|undefined}
   */
  function getColumn() {
    if (this.field) {
      if (this.field.indexOf('.')>=0) {
        return this.field.slice(0, this.field.indexOf('.'));
      }

      return this.field;
    }

    return undefined;
  }

  /**
   * @name Sorting#setSorting
   * @param field
   * @param direction
   */
  function setSorting(field, direction) {
    this.field = field;
    this.direction = direction;
  }

  /**
   * @name Sorting#setSortFields
   * @param fields
   */
  function setSortFields(fields) {
    this.sortFields = fields;
  }

  /**
   * @name Sorting#getUrl
   * @param url
   * @returns {string}
   */
  function getUrl(url) {
    var result;
    var searchParams;

    if (!this.field) {
      return url;
    }

    searchParams = Helper.parseLocationSearch(url);

    searchParams[this.sortParam + '['+ this.field +']'] = this.direction;

    result = Helper.setLocationSearch(url, searchParams);

    return result;
  }



}

