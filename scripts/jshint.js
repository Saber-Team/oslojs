var grunt = require('grunt');

module.exports = {
    build: {
        src: ['*.js', '*/**.js']
    },
    filter: function (src) {
        return !/\/lib\/sogou\//i.test(src);
    },
    options: {
        // options here to override JSHint defaults
        undef: true,
        unused: true,
        es3: true,
        globals: {
            sogou: false,
            console: false,
            window: false,
            document: false
        }
    }
};