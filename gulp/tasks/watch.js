var gulp = require('gulp');
var watch = require('gulp-watch');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var coffee = require('gulp-coffee');

gulp.task('watch', function() {
  gulp.watch('./src/**/*', ['default']);
  gulp.watch('bower.json', ['bower']);
});