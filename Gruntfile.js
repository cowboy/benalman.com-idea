/*
 * ba-content-massage
 * http://benalman.com/
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    fetch: {
      content: {
        options: {
          src: 'http://benalman.com/ba-export.zip',
          dest: 'temp/ba-export.zip',
        }
      }
    },
    unzip: {
      content: {
        src: '<%= fetch.content.options.dest %>',
        dest: 'temp',
      }
    },
    clean: {
      dl: ['temp/ba-export*'],
      massage: ['temp/massaged'],
      www: ['temp/www'],
    },
    jshint: {
      js: {
        src: '*.js',
        options: {
          jshintrc: '.jshintrc'
        }
      }
    },
    massage: {
      posts: {
        expand: true,
        cwd: 'temp/ba-export',
        src: '*',
        dest: 'temp/massaged',
      }
    },
    build: {
      posts: {
        expand: true,
        cwd: 'temp/massaged',
        src: '*',
        dest: 'temp/www',
        ext: '.html',
      }
    },
    less: {
      options: {
        paths: ['src/less'],
      },
      'temp/www/site.css': 'src/less/site.less'
    },
    watch: {
      less: {
        files: ['src/less/**'],
        tasks: ['less'],
      },
      build: {
        files: ['src/jade/**'],
        tasks: ['build'],
      }
    }
  });

  var path = require('path');

  var http = require('http');
  var fs = require('fs');
  grunt.registerMultiTask('fetch', 'Fetch a remote file.', function() {
    var options = this.options();
    var done = this.async();
    grunt.log.write('Downloading ' + options.src + '...');
    grunt.file.mkdir(path.dirname(options.dest));
    var stream = fs.createWriteStream(options.dest);
    var request = http.get(options.src, function(response) {
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

  var unzip = require('unzip');
  grunt.registerMultiTask('unzip', 'Unzip files.', function() {
    grunt.util.async.forEachSeries(this.files, function(f, next) {
      grunt.log.write('Unzipping ' + f.src[0] + '...');
      var stream = fs.createReadStream(f.src[0]);
      stream.pipe(unzip.Extract({path: f.dest}).on('close', next));
    }, this.async());
  });

  var yamljs = require('js-yaml');

  // Add pages-to-be-checked to nav.
  var pageUrls = [];
  function id(pageid) {
    if (pageUrls.indexOf(pageid) === -1) {
      console.log(pageid);
      pageUrls.unshift(pageid);
    }
  }

  grunt.registerMultiTask('massage', 'Massage some stuff.', function() {
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
    var orig = s;

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
    var p = [
      '2012-09-25-partial-application-in-javascript',
      // '2010-03-28-jquery-special-events',
    ];
    if (p.indexOf(o.id) !== -1) {
      s = s.replace(/(^\s*\*.*$\n)+/m, '\n\n<!-- toc -->\n\n');
      // id(o.id);
    }

    return s;
  }

  var jade = require('jade');
  var hljs = require('highlight.js');
  var slug = require('slug');
  var entities = require('entities');
  var marked = require('marked');
  marked.setOptions({});

  grunt.registerMultiTask('build', 'Build some stuff.', function() {
    if (!pageUrls || pageUrls.length === 0) {
      pageUrls = this.filesSrc.map(path.basename).reverse();
    }
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
        pageUrls: pageUrls,
      });
      grunt.file.write(f.dest, output);
    });
    grunt.log.writeln('Built ' + this.files.length + ' files.');
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('dl', ['jshint', 'clean:dl', 'fetch', 'unzip']);
  grunt.registerTask('in', ['jshint', 'clean:massage', 'massage']);
  grunt.registerTask('out', ['jshint', 'clean:www', 'build', 'less']);

  grunt.registerTask('init', ['dl', 'in', 'out']);

  grunt.registerTask('default', ['in', 'out', 'watch']);
};
