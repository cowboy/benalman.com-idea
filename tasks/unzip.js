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
  var unzip = require('unzip');

  grunt.registerMultiTask('unzip', 'Unzip files.', function() {
    grunt.util.async.forEachSeries(this.files, function(f, next) {
      grunt.log.write('Unzipping ' + f.src[0] + '...');
      var stream = fs.createReadStream(f.src[0]);
      stream.pipe(unzip.Extract({path: f.dest}).on('close', next));
    }, this.async());
  });

};
