var grunt = require('grunt');
var config = grunt.file.readJSON('./config.json');

module.exports = {
    category: {
        src: config['appIndex']['js'],
        dest: '../dist/appIndex.concat.js'
    },
    required: {
    	src: config['required']['js'],
    	dest: '../dist/required.concat.js'
    },
    top: {
        src: config['top']['js'],
        dest: '../dist/top.concat.js'
    }
    options: {
        separator: ';',
        nonull: true
    }
};
