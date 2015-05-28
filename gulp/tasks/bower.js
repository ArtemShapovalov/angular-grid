var gulp = require('gulp');

gulp.task('bower', function(){

  gulp.src([
    'bower_components/**/*'])
    .pipe(gulp.dest('example/bower_components'));

  gulp.src([
    'dist/**/*'])
    .pipe(gulp.dest('example/bower_components/angular-grid/dist'));

});