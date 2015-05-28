var express = require('express');
var router = express.Router();

/* Redirect to index.html file */
router.get('/*', function (req, res, next) {
    res.sendFile('index.html', {root: '../'});
});

module.exports = router;