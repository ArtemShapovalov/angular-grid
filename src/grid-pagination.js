angular.module('grid').factory('gridPagination', gridPagination);
gridPagination.$inject = ['Helper', '_'];
function gridPagination(Helper, _) {

  function Pagination() {
    /** Name of the parameter storing the current page index */
    this.pageParam = 'page';
    /** The zero-based current page number */
    this.currentPage = 1;
    /** Number of pages */
    this.pageCount = 0;
    /** The number of items per page */
    this.perPage = 1;
    /** Total number of items */
    this.totalCount = 2;
  }

  angular.extend(Pagination.prototype, {
    getPageParam: getPageParam,
    setTotalCount: setTotalCount,
    getTotalCount: getTotalCount,
    setPerPage: setPerPage,
    getPerPage: getPerPage,
    getPageCount: getPageCount,
    setCurrentPage: setCurrentPage,
    getCurrentPage: getCurrentPage,
    getOffset: getOffset,
    getPageUrl: getPageUrl
  });

  return Pagination;

  function getPageParam() {
    return this.pageParam;
  }

  function setTotalCount(totalCount) {
    this.totalCount = totalCount;
  }

  function getTotalCount() {
    return this.totalCount;
  }

  function setPerPage(perPage) {
    this.perPage = perPage;
  }

  function getPerPage() {
    return this.perPage;
  }

  function getPageCount() {
    var totalPages = this.perPage < 1 ? 1 : Math.ceil(this.totalCount / this.perPage);
    return Math.max(totalPages || 0, 1);
  }

  function setCurrentPage(currentPage) {
    this.currentPage = currentPage;
  }

  function getCurrentPage() {
    return this.currentPage;
  }

  function getOffset() {
    var result;

    result = Math.max(this.currentPage || 0, 1) * this.perPage - this.perPage;

    return result;
  }

  function getPageUrl(url) {
    var result;
    var searchParams;

    searchParams = Helper.parseLocationSearch(url);

    searchParams[this.pageParam + '[offset]'] = this.getOffset();
    searchParams[this.pageParam + '[limit]'] = this.getPerPage();

    result = Helper.setLocationSearch(url, searchParams);

    return result;
  }



}

