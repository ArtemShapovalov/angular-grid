// Karma configuration
// Generated on Fri Jun 05 2015 17:52:02 GMT+0300 (EEST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine-ajax', 'jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'bower_components/karma-read-json/karma-read-json.js',

      'bower_components/tv4/tv4.js',
      'bower_components/lodash/lodash.js',
      'bower_components/objectpath/lib/ObjectPath.js',
      'bower_components/jsonary/core/jsonary-core.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'src/module.js',
      'src/**/*.js',
      'test/**/*Spec.js',

      // fixtures
      {pattern: 'test/mock/*.json', watched: true, served: true, included: false}
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/**/*.js': ['wrap', 'coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      type : 'html',
      dir : 'coverage/'
    },

    wrapPreprocessor: {
      template:
      '/* istanbul ignore next */' +
      '(function(root, factory) {'+
        "if (typeof define === 'function' && define.amd) {"+
        'define(["angular","jsonary","angular-bootstrap","bootstrap-decorator","lodash"], factory);'+
        "} else if (typeof exports === 'object') {"+
        "module.exports = factory(require('angular'), require('Jsonary'), require('angularBootstrap'), require('bootstrapDecorator'), require('lodash'));"+
        '} else {'+
        "root.vmsGrid = factory(root.angular, root.Jsonary, root.angularBootstrap, root.bootstrapDecorator, root._);"+
        "}"+
      "})(this, main);" +
      "function main(angular, Jsonary, angularBootstrap, bootstrapDecorator, lodash) {"+
      " <%= contents %> "+
      "return vmsGrid;"+
      "}"
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
