var grunt = require('grunt');
var config = grunt.file.readJSON('./config.json');

module.exports = {
    portal: {
        src: config['portal']['js']
    },
    girl: {
        src: config['girl']['js']
    },
    category: {
        src: config['category']['js']
    },
    required: {
        src: config['required']['js']
    },
    filter: function (src) {
        return !/\/lib\/dojo\//i.test(src);
    },
    options: {
        // options here to override JSHint defaults
        undef: true,
        unused: true,
        es3: true,
        globals: {
            dojo: true,
            console: true,
            window: true,
            document: true
        }
    }
};