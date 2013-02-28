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
        src: ['*.js', 'tasks/*.js'],
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
    connect: {
      serve: {
        options: {
          port: 9001,
          base: 'temp/www',
          middleware: function(connect, options) {
            return [
              function(req, res, next) {
                var parts = req.url.slice(1).split('/');
                var actions = {
                  edit: function(id) {
                    id = id.replace(/\?.*/, '');
                    grunt.log.ok('edit: ' + id);
                    grunt.util.spawn({
                      cmd: 'subl',
                      args: [
                        '-w',
                        'temp/ba-export/' + id,
                        'temp/massaged/' + id
                      ]
                    }, console.error);
                  }
                };
                var action = parts.shift();
                if (actions[action]) {
                  actions[action].apply(null, parts);
                } else {
                  next();
                }
              },
              connect.static(options.base),
              connect.directory(options.base)
            ];
          },
        }
      }
    },
    watch: {
      less: {
        options: {interrupt: true},
        files: ['src/less/**'],
        tasks: ['less'],
      },
      massage: {
        options: {interrupt: true},
        files: ['tasks/massage.js'],
        tasks: ['in', 'build'],
      },
      build: {
        options: {interrupt: true},
        files: ['src/jade/**', 'temp/massaged/**/*', 'tasks/build.js'],
        tasks: ['build'],
      },
    }
  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('dl', ['clean:dl', 'fetch', 'unzip']);
  grunt.registerTask('in', ['clean:massage', 'massage']);
  grunt.registerTask('out', ['clean:www', 'build', 'less']);

  grunt.registerTask('init', ['dl', 'default']);

  grunt.registerTask('default', ['jshint', 'in', 'out', 'connect', 'watch']);
};
