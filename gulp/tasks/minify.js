  var gulp = require('gulp'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
       //umd = require('gulp-umd'),
       //wrapUmd = require('gulp-wrap-umd'),
    uglify = require('gulp-uglify');

var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var ngAnnotate = require('gulp-ng-annotate');
var wrapJS = require("gulp-wrap-js");

gulp.task('minify', function() {
  gulp.src([
    'src/**/module.js',
    'src/**/*.js'
  ])
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(gulp.dest('example/bower_components/angular-grid/src'))
    .pipe(concat('grid.js'))
    .pipe(ngAnnotate())
    .pipe(wrapJS(
      '(function(root, factory) {'+
        "if (typeof define === 'function' && define.amd) {"+
          'define(["angular","jsonary","angular-bootstrap","bootstrap-decorator","lodash"], factory);'+
        "} else if (typeof exports === 'object') {"+
          "module.exports = factory(require('angular'), require('Jsonary'), require('angularBootstrap'), require('bootstrapDecorator'), require('lodash'));"+
        '} else {'+
          "root.vmsGrid = factory(root.angular, root.Jsonary, root.angularBootstrap, root.bootstrapDecorator, root._);"+
        "}"+
      "}(this, function(angular, Jsonary, angularBootstrap, bootstrapDecorator, lodash) {"+
        " {%= body %} "+
        "return vmsGrid;"+
      "}));"
    ))
    /*.pipe(umd({
     dependencies: function() {
     return [
     {name: 'angular'},
     {
     name: 'Jsonary',
     amd: 'jsonary'
     },
     {
     name: 'angularBootstrap',
     amd: 'angular-bootstrap'
     },
     {
     name: 'bootstrapDecorator',
     amd: 'bootstrap-decorator'
     },
     {
     name: 'lodash',
     amd: 'lodash',
     global: '_'
     }
     ]
     },
     exports: function() {return 'vmsGrid';},
     namespace: function() {return 'vmsGrid';}
     }))*/
    /*.pipe(wrapUmd({
      deps: [
          {name: 'angular'},
          {
            name: 'Jsonary',
            amdName: 'jsonary'
          },
          {
            name: 'angularBootstrap',
            amdName: 'angular-bootstrap'
          },
          {
            name: 'bootstrapDecorator',
            amdName: 'bootstrap-decorator'
          },
          {
            name: 'lodash',
            amdName: 'lodash',
            globalName: '_'
          }
        ],
      exports: 'vmsGrid',
      namespace: 'vmsGrid'
    }))*/
    .pipe(sourcemaps.write({includeContent: true, sourceRoot: '../src/'}))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'))
    .pipe(uglify())
    .pipe(rename('grid.min.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));
});