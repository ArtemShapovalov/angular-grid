var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');

var index = require('./routes/index');

var app = express();

app.use(express.static(path.join(__dirname, '../')));
app.use(favicon('../favicon.ico'));
app.use(logger('dev'));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;