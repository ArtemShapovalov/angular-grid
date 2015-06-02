  var gulp = require('gulp'),
    //concat = require('gulp-concat-sourcemap'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
       umd = require('gulp-umd'),
    uglify = require('gulp-uglify');

var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var ngAnnotate = require('gulp-ng-annotate');

gulp.task('minify', function() {
  gulp.src([
    'src/**/module.js',
    'src/**/*.js'
  ])
    //.pipe(sourcemaps.init({loadMaps: true}))
    .pipe(gulp.dest('example/bower_components/angular-grid/src'))
    .pipe(concat('grid.js'))
    //.pipe(ngAnnotate())
    .pipe(umd({
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
    }))
    //.pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: '../src/'}))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'))
    .pipe(uglify())
    .pipe(rename('grid.min.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));
});