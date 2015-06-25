describe('Pagination service testing', function() {

  var gridPagination;
  var pagination;

  beforeEach(function () {
    module('grid');
  });

  beforeEach(inject(function($injector){
    gridPagination = $injector.get('gridPagination');
    pagination = new gridPagination();
  }));

  afterEach(function() {

  });

  it('test pagination', function() {

    //this.currentPage = 0;
    /** Number of pages */
    //this.pageCount = 0;
    /** The number of items per page */
    //this.perPage = 10;
    /** Total number of items */
    //this.totalCount = 0;

    pagination.setTotalCount(88);
    pagination.setPerPage(10);
    expect(pagination.getPageCount()).toEqual(9);

    pagination.setPerPage(1);
    pagination.setTotalCount(0);
    expect(pagination.getPageCount()).toEqual(1);

    expect(pagination.perPage).toBeDefined();
  });

  it ('check count items on one page as 0', function(){
    pagination.setPerPage(0);
    expect(pagination.getPageCount()).toEqual(1);
  });

  it('check offset if not set current page', function() {
    pagination.setCurrentPage(undefined);
    expect(pagination.getOffset()).toEqual(0);
  });

  it('check getters', function () {
    expect(pagination.getPageParam()).toEqual('page');
    expect(pagination.getTotalCount()).toEqual(2);
    expect(pagination.getCurrentPage()).toEqual(1);
  });

  it('create url', function() {

    pagination.setTotalCount(88);
    pagination.setPerPage(10);
    pagination.setCurrentPage(2);

    expect(pagination.getPageUrl('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2'))
      .toEqual('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2&page[offset]=10&page[limit]=10');

    pagination.setCurrentPage(4);
    expect(pagination.getPageUrl('http://localhost:3030/grid/targets'))
      .toEqual('http://localhost:3030/grid/targets?page[offset]=30&page[limit]=10');

    pagination.setCurrentPage(1);
    expect(pagination.getPageUrl('http://localhost:3030/grid/targets'))
      .toEqual('http://localhost:3030/grid/targets?page[offset]=0&page[limit]=10');

  })

});