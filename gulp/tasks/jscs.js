var gulp = require('gulp');
var jscs = require('gulp-jscs');

gulp.task('jscs', function() {
  return gulp.src([
    'src/**/*.js'
  ])
    .pipe(jscs());
});