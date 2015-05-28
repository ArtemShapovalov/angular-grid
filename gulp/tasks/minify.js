var gulp = require('gulp'),
  concat = require('gulp-concat'),
  rename = require('gulp-rename'),
  umd = require('gulp-umd'),
  uglify = require('gulp-uglify');

gulp.task('minify', function() {
  gulp.src([
    './src/grid.js',
    './src/services/*.js',
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
          }
        ]
      },
      exports: function() {return 'grid';},
      namespace: function() {return 'grid';}
    }))
    .pipe(gulp.dest('./dist/'))
    .pipe(uglify())
    .pipe(rename('grid.min.js'))
    .pipe(gulp.dest('./dist/'));
});