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
    watch: {
      less: {
        files: ['src/less/**'],
        tasks: ['less'],
      },
      massage: {
        files: ['tasks/massage.js'],
        tasks: ['in', 'build'],
      },
      build: {
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
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('dl', ['clean:dl', 'fetch', 'unzip']);
  grunt.registerTask('in', ['clean:massage', 'massage']);
  grunt.registerTask('out', ['clean:www', 'build', 'less']);

  grunt.registerTask('init', ['jshint', 'dl', 'in', 'out']);

  grunt.registerTask('default', ['jshint', 'in', 'out', 'watch']);
};
