/*
 * ba-content-massage
 * http://benalman.com/
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');

  grunt.registerMultiTask('fetch', 'Fetch a remote file.', function() {
    var options = this.options();
    var done = this.async();
    grunt.log.write('Downloading ' + options.src + '...');
    grunt.file.mkdir(path.dirname(options.dest));
    var stream = fs.createWriteStream(options.dest);
    http.get(options.src, function(response) {
      response.pipe(stream);
      response.on('end', function() {
        grunt.log.ok();
        done();
      });
    }).on('error', function(e) {
      grunt.log.error();
      done(e);
    });
  });

};
