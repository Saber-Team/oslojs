var grunt = require('grunt');

module.exports = {
    build: {
        src: ['src/*.js', 'src/*/**.js']
    },
    filter: function (src) {
        return !/\/lib\/sogou\//i.test(src);
    },
    // options here to override JSHint defaults
    options: {
        undef: true,
        unused: true,
        es3: true,
        globals: {
            sogou: false,
            console: false,
            window: false,
            document: false
        },
        reporter: require('jshint-stylish'),
        ignores: ['scripts/', 'build/'],
        force: true
    }
};