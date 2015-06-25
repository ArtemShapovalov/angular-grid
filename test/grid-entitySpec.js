describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var userModel;
  var Entity;
  var entity;

  beforeEach(function () {
    module('grid');

    module(function($provide) {
      $provide.factory('userModel', function(){
        return {
          'url': domain,
          'params': {
            resource: 'targets',
            type: '',
            id: ''
          }
        }
      });
    });

  });

  beforeEach(inject(function($injector){
    Entity = $injector.get('grid-entity');
    userModel = $injector.get('userModel');
    entity = new Entity();
  }));


  it('test set entity', function() {
    var paramsUpdate = {
      resource: 'targets',
      type: 'update',
      id: '123'
    };
    var paramsRead = {
      resource: 'targets',
      type: 'read',
      id: '123'
    };
    var paramsCreate = {
      resource: 'targets',
      type: 'create'
    };
    var paramsResource = {
      resource: 'targets'
    };
    expect(entity.getResourceUrl('http://domain.com', paramsUpdate)).toEqual('http://domain.com/targets/update/123');
    expect(entity.getResourceUrl('http://domain.com', paramsRead)).toEqual('http://domain.com/targets/read/123');
    expect(entity.getResourceUrl('http://domain.com', paramsCreate)).toEqual('http://domain.com/targets/schema#/definitions/create');
    expect(entity.getResourceUrl('http://domain.com', paramsResource)).toEqual('http://domain.com/targets');
  });

  it('load data check callback params', function() {
    expect(entity.loadData('http://private-c9370-hyperschemavms.apiary-mock.com/jsonary/targets')).toBe(undefined);
  })


});