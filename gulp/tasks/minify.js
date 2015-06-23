var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var ngAnnotate = require('gulp-ng-annotate');
var wrapJS = require("gulp-wrap-js");
var templateCache = require('gulp-angular-templatecache');
var streamqueue = require('streamqueue');

gulp.task('minify', function() {

  var stream = streamqueue({objectMode: true});
  stream.queue(
    gulp.src([
      'src/**/module.js',
      'src/**/*.js'
    ])
  );
  stream.queue(
    gulp.src('templates/**/*.html')
      /*.pipe(minifyHtml({
       empty: true,
       spare: true,
       quotes: true
       }))*/
      .pipe(templateCache({
        module: 'grid',
        root: 'templates/grid'
      }))
  );
  stream.done()
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
    .pipe(sourcemaps.write({includeContent: true, sourceRoot: '../src/'}))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'))
    .pipe(uglify())
    .pipe(rename('grid.min.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));
});