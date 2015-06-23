describe('GridEntity testing', function() {

  var Sorting;
  var sorting;

  beforeEach(function () {
    module('grid');
  });

  beforeEach(inject(function($injector){
    Sorting = $injector.get('Sorting');
    sorting = new Sorting();
  }));

  afterEach(function() {

  });

  it('test set sorting', function() {
    sorting.setSorting('title', sorting.DIRECTION_ASC);

    expect(sorting.field).toEqual('title');
    expect(sorting.direction).toEqual(sorting.DIRECTION_ASC);
  });

  it ('check url with sorting params', function() {
    sorting.setSorting('user.email', 'asc');
    expect(sorting.getUrl('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2&page[offset]=10&page[limit]=10'))
      .toEqual('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2&page[offset]=10&page[limit]=10&sort[user.email]=asc');

    expect(sorting.getUrl('http://localhost:3030/grid/targets'))
      .toEqual('http://localhost:3030/grid/targets?sort[user.email]=asc');

  })

  it ('check url with sorting params', function() {
    expect(sorting.getUrl('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2&page[offset]=10&page[limit]=10'))
      .toEqual('http://localhost:3030/grid/targets?foo[bar]=1&bar[foo]=2&page[offset]=10&page[limit]=10');
  })

});