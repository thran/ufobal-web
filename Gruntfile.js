module.exports = function(grunt) {

grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
        libs: {
            src: [
                'bower_components/foundation/js/vendor/modernizr.js',
                'bower_components/foundation/js/vendor/fastclick.js',
                'bower_components/angular/angular.min.js',
                'bower_components/angular-cookies/angular-cookies.min.js',
                'bower_components/angular-foundation/mm-foundation-tpls.min.js',
                'bower_components/jquery/dist/jquery.min.js',
                'bower_components/foundation/js/foundation.min.js'
            ],
            dest: 'static/dist/libs.min.js'
        },
        managestats: {
            src: ['managestats/static/managestats/js/*.js'],
            dest: 'managestats/static/managestats/dist/managestats.js'
        }
    },
    uglify: {
        options: {
            banner: '/*! <%= pkg.name %>-libs <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        managestats: {
            src: 'managestats/static/managestats/dist/managestats.js',
            dest: 'managestats/static/managestats/dist/managestats.min.js'
        }
    },
    watch: {
        files: ['managestats/static/managestats/js/*.js', "managestats/static/managestats/css/*.css"],
        tasks: ['jshint', 'concat', 'uglify', "cssmin"]
    },
    cssmin: {
        target: {
            files: {
                'managestats/static/managestats/dist/managestats.min.css': [
                    "bower_components/foundation/css/normalize.css",
                    "bower_components/foundation/css/foundation.css",
                    "bower_components/foundation-icon-fonts/foundation-icons.css",
                    'managestats/static/managestats/css/*.css'
                ]
            }
        }
    },
    ngtemplates:  {
        //ufobalapp: {
        //    src: 'static/ng-parts/*.html',
        //    dest: 'static/ng-parts/templates.js'
        //}
    },
    jshint: {
        files: ['managestats/static/managestats/js/*.js']
    },
    copy: {
        fonts: {
            expand: true,
            cwd: "bower_components/foundation-icon-fonts/",
            src: [
                    "foundation-icons.eot",
                    "foundation-icons.svg",
                    "foundation-icons.ttf",
                    "foundation-icons.woff"
                ],
            dest: 'managestats/static/managestats/dist/'
        }
    }
});

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify', "cssmin", "copy"]);
};