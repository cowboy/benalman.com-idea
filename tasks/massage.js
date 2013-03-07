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
  var yamljs = require('js-yaml');

  // Add pages-to-be-checked to nav.
  var navIds = [];
  function nav(pageid) {
    if (navIds.indexOf(pageid) === -1) {
      console.log(pageid);
      navIds.push(pageid);
    }
  }
  function writeNav() {
    if (navIds.length) {
      grunt.file.write('temp/nav.yaml', yamljs.dump(navIds, {flowLevel: 1}));
    }
  }

  grunt.registerMultiTask('massage', 'Massage some stuff.', function() {
    if (grunt.file.exists('temp/nav.yaml')) {
      grunt.file.delete('temp/nav.yaml');
    }
    this.files.forEach(function(f, i) {
      var indexPre = grunt.file.read(path.join(f.src[0], 'index.md'));
      var meta = grunt.file.readYAML(path.join(f.src[0], 'meta.yaml'));
      var o = {
        src: f.src,
        dest: f.dest,
        id: path.basename(f.src[0]),
      };
      // Exclude any page with a @tag.
      if (/@/.test(meta.tags.join(' '))) { return; }

      meta = massageMetadata(meta, o);
      var yaml = yamljs.dump(meta, {flowLevel: 1});
      grunt.file.write(path.join(f.dest, 'meta.yaml'), yaml);
      var indexPost = massageIndex(indexPre, o);
      grunt.file.write(path.join(f.dest, 'index.md'), indexPost);
      // logging
      var log = 0;
      if (log && i === 141) {
        console.log('\n====== src YAML ======');
        console.log(grunt.file.read(path.join(f.src[0], 'meta.yaml')));
        console.log('\n====== dest YAML ======');
        console.log(yaml);
        console.log('\n====== src INDEX ======');
        console.log(indexPre);
        console.log('\n====== dest INDEX ======');
        console.log(indexPost);
      }
    });
    writeNav();
  });

  // massage metadata
  function massageMetadata(meta, o) {
    Object.keys(meta).forEach(function(key) {
      if (/allow/.test(key) && typeof meta[key] === 'number') {
        meta[key] = Boolean(meta[key]);
      }
    });
    return meta;
  }

  // massage index
  function massageIndex(s, o) {
    // var orig = s;

    // INLINE SOURCE CODE -> EXTERNAL FILES
    var i = 0;
    // Find <pre class="brush:js">...</pre>.
    s = s.replace(/<pre(\b[^>]*)>\n*([\s\S]*?)\n*<\/pre>/gi, function(_, attrs, code) {
      var attrMatches = attrs.match(/brush:([a-z]+)/i);
      var lang = attrMatches && attrMatches[1] || 'XXX';
      i++;
      var filename = 'source' + (i < 10 ? '0' + i : i) + '.' + lang;
      // Un-escape escaped html crap.
      code = code.replace(/\&(\w+?);/g, function(_, k) {
        return {lt: '<', gt: '>', quot: "'"}[k];
      });
      // Remove whitespace-only lines.
      code = code.replace(/^\s+$/mg, '');
      // Find smallest shared indent.
      var sharedIndent = Math.min.apply(null, code.split('\n').filter(function(s) {
        // Ignore empty lines.
        return s !== '';
      }).map(function(s) {
        return s.match(/^\s*/)[0].length;
      }));
      // Remove smallest shared indent.
      if (sharedIndent > 0) {
        code = code.replace(new RegExp('^ {' + sharedIndent + '}', 'mg'), '');
      }
      code += '\n';
      grunt.file.write(path.join(o.dest, filename), code);
      return '<!-- include ' + filename + ' -->';
    });

    // Fix indented lines starting with [
    s = s.replace(/^[ \t]+\[/gm, function() {
      return '[';
    });

    // Replace manually-entered TOC with dynamic TOC.
    function replaceTOC(s) {
      return s.replace(/(^\s*\*.*$\n)+/m, '\n\n<!-- toc -->\n\n');
    }

    s = s.replace(/<a\s+([^>]*?)>/gi, function(_, attrs) {
      if (/name=|href=['"]#/i.test(attrs)) {
        // nav(o.id);
        // console.log('>', attrs);
      }
      return _;
      // return '<a debug ' + attrs + '>';
    });

    s = s.replace(/\((#.*?)\)|:\s+(#\w.*)/g, function(_) {
      // nav(o.id);
      // console.log('>', _);
      return _;
    });
    s = s.replace(/##/, function(_) {
      // nav(o.id);
      return _;
    });

    s = s.replace(/(# .*)/i, '$1\n<!--toc-->\n');
    if (o.id === '2012-09-25-partial-application-in-javascript') {
      // s = replaceTOC(s);
      s = s.replace(/^_(Note that because.*)_$/m, '*$1*');
      // nav(o.id);
    }

    return s;
  }

};
