var gulp = require('gulp');
var bower = require('gulp-bower');

gulp.task('bower', function(){

  //gulp.src([
  //  'bower_components/**/*'])
  //  .pipe(gulp.dest('example/bower_components'));

  gulp.src([
    'dist/**/*'])
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));

  return bower({ directory: './bower_components', cwd: './' })
    .pipe(gulp.dest('./example/bower_components'));

});