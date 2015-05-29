var gulp = require('gulp');
var bower = require('gulp-bower');

gulp.task('bower', function(){

  //gulp.src([
  //  'bower_components/**/*'])
  //  .pipe(gulp.dest('example/bower_components'));

  return bower({ directory: './bower_components', cwd: './' })
    .pipe(gulp.dest('./example/bower_components'));

});