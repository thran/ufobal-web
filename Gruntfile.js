module.exports = function(grunt) {

grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
        libs: {
            src: [
                'bower_components/foundation/js/vendor/modernizr.js',
                'bower_components/foundation/js/vendor/fastclick.js',
                'bower_components/jquery/dist/jquery.min.js',
                'bower_components/angular/angular.min.js',
                'bower_components/angular-cookies/angular-cookies.min.js',
                'bower_components/angular-foundation/mm-foundation-tpls.min.js',
                'bower_components/angular-route/angular-route.min.js',
                'bower_components/angular-smart-table/dist/smart-table.min.js',
                'bower_components/foundation/js/foundation.min.js'
            ],
            dest: 'static/dist/libs.min.js'
        },
        managestats: {
            src: ['managestats/static/managestats/js/*.js'],
            dest: 'static/dist/managestats.js'
        },
        ufobalapp: {
            src: ['ufobalapp/static/ufobalapp/js/*.js', 'static/dist/templates.js'],
            dest: 'static/dist/ufobalapp.js'
        }
    },
    uglify: {
        options: {
            banner: '/*! <%= pkg.name %>-libs <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        managestats: {
            src: 'static/dist/managestats.js',
            dest: 'static/dist/managestats.min.js'
        },
        ufobalapp: {
            src: 'static/dist/ufobalapp.js',
            dest: 'static/dist/ufobalapp.min.js'
        }
    },
    watch: {
        files: [
            'managestats/static/managestats/js/*.js',
            "managestats/static/managestats/css/*.css",
            'ufobalapp/static/ufobalapp/js/*.js',
            "ufobalapp/static/ufobalapp/css/*.css",
            "ufobalapp/static/ufobalapp/ng-parts/**/*.html"
        ],
        tasks: ['jshint', 'ngtemplates', 'concat', 'uglify:ufobalapp', 'uglify:managestats', "cssmin"]
    },

    cssmin: {
        target: {
            files: {
                'static/dist/managestats.min.css': [
                    "bower_components/foundation/css/normalize.css",
                    "bower_components/foundation/css/foundation.css",
                    "bower_components/foundation-icon-fonts/foundation-icons.css",
                    'managestats/static/managestats/css/*.css'
                ],
                'static/dist/ufobalapp.min.css': [
                    "bower_components/foundation/css/normalize.css",
                    "bower_components/foundation/css/foundation.css",
                    "bower_components/foundation-icon-fonts/foundation-icons.css",
                    'ufobalapp/static/ufobalapp/css/*.css'
                ]
            }
        }
    },
    ngtemplates:  {
        ufoIS: {
            cwd: "ufobalapp/static/ufobalapp/ng-parts",
            src: '**/*.html',
            dest: 'static/dist/templates.js'
        }
    },
    jshint: {
        files: ['managestats/static/managestats/js/*.js', 'ufobalapp/static/ufobalapp/js/*.js']
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
            dest: 'static/dist/'
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

    grunt.registerTask('default', ['jshint', 'ngtemplates', 'concat', 'uglify', "cssmin", "copy"]);
};