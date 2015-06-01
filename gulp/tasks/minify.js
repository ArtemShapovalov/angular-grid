  var gulp = require('gulp'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
       umd = require('gulp-umd'),
    uglify = require('gulp-uglify');

gulp.task('minify', function() {
  gulp.src([
    './src/module.js',
    './src/grid.js',
    './src/actions/*.js',
    './src/directives/*.js'
  ])
    .pipe(concat('grid.js'))
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
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'))
    .pipe(uglify())
    .pipe(rename('grid.min.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));
});