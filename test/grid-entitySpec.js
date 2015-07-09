describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var userModel;
  var Entity;
  var entity;

  beforeEach(function() {
    module('grid');

    module(function($provide) {
      $provide.factory('userModel', function() {
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

  beforeEach(inject(function($injector) {
    Entity = $injector.get('grid-entity');
    userModel = $injector.get('userModel');
    entity = new Entity();
  }));

  describe('Jsonary extend data', function() {

    var data;

    beforeEach(inject(function($injector) {
      data = Jsonary.create({
        relationships: true,
        attributes: false
      })
    }));

    it('relationships', function() {
      expect(data.relationshipsValue()).toEqual(true)
    });

    it('attributes', function() {
      expect(data.attributesValue()).toEqual(false)
    });
  });

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

  describe('Empty Data Relations', function() {

    var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';
    var $timeout;
    var TestResponses = {
      targets: {
        schema: {
          success: {
            status: 200,
            contentType: 'application/schema+json',
            responseText: JSON.stringify(readJSON('test/mock/targetSchema.json'))
          }
        }
      }
    };

    beforeEach(function() {
      jasmine.Ajax.install();

      jasmine.Ajax.stubRequest(domain + '/targets/schema', '', 'GET')
        .andReturn(TestResponses.targets.schema.success);
    });

    beforeEach(inject(function($injector) {
      $timeout = $injector.get('$timeout');
    }));

    afterEach(function() {
      jasmine.Ajax.uninstall();
    });

    it('check create new form', function() {
      var schema;
      var relationArray = {
        links: {},
        data: []
      };
      var relationObject = {
        links: {},
        data: {}
      };

      Jsonary.getSchema(domain + '/targets/schema#/definitions/create', function(jSchema) {
        schema = jSchema
      });

      expect(entity._getEmptyDataRelations(schema).users).toEqual(relationArray);
      expect(entity._getEmptyDataRelations(schema).user).toEqual(relationObject);
    })

  });

});