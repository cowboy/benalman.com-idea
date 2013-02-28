/*
 * ba-content-massage
 * http://benalman.com/
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var path = require('path');
  var _ = require('lodash');

  var jade = require('jade');
  var hljs = require('highlight.js');
  var slug = require('slug');
  var entities = require('entities');

  var marked = require('marked');
  marked.setOptions({});

  grunt.registerMultiTask('build', 'Build some stuff.', function() {
    var calloutIds = [];
    if (grunt.file.exists('temp/nav.yaml')) {
      calloutIds = grunt.file.readYAML('temp/nav.yaml');
    }
    var navIds = this.filesSrc.map(path.basename).reverse();
    this.files.forEach(function(f, i) {
      var s = grunt.file.read(path.join(f.src[0], 'index.md'));
      var title = s.match(/#\s+(.*)/)[1];

      // Parse as markdown.
      s = marked(s);

      // Add anchor links to headers and build a TOC.
      var toc = [];
      s = s.replace(/(<h(\d)>)([^<]+)(<\/h\2>)/g, function(_, open, depth, header, close) {
        depth = Number(depth);
        if (depth === 1) { return _; }
        var name = header.toLowerCase();
        name = entities.decode(name);
        name = name.replace(/'/g, '');
        name = name.replace(/[:"!\(\)]+/g, '-');
        name = slug(name);
        name = name.replace(/^-+|-+$/g, '');
        // toc.push({header: header, name: name});
        toc.push(new Array(depth - 1).join('  ') + '* [' + header + '](#' + name + ')');
        var anchor = '<a href="#' + name + '" name="' + name + '">' + header + '</a>';
        return open + anchor + close;
      });
      toc = toc.join('\n');

      // Replace <!-- ??? --> comment directives with stuff.
      s = s.replace(/<!--\s*(.*?)\s*-->/g, function(_, args) {
        args = args.split(/\s+/);
        var cmd = args.shift();
        var map = {
          toc: function() {
            return marked(toc);
          },
          include: function(filename) {
            var src = grunt.file.read(path.join(f.src[0], filename));
            var lang = path.extname(filename).slice(1);
            var langMap = {
              js: 'javascript',
              html: 'xml',
            };
            if (lang in langMap) { lang = langMap[lang]; }
            var hlsource = /^te?xt$/.test(lang) ? src : hljs.highlight(lang, src).value;
            return '\n<pre><code>' + hlsource + '</code></pre>';
          },
        };
        return cmd in map ? map[cmd].apply(null, args) : _;
      });

      // Compile output with Jade.
      var output = jade.compile(grunt.file.read('src/jade/page.jade'), {
        // nothing
      })({
        title: title,
        url: path.basename(f.src[0]),
        content: s,
        calloutIds: calloutIds,
        navIds: navIds,
      });
      grunt.file.write(f.dest, output);
    });
    grunt.log.writeln('Built ' + this.files.length + ' files.');
  });

};
