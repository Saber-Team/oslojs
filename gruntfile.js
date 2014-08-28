module.exports = function(grunt) {

    // 项目配置信息
	grunt.initConfig({
        // 检查源代码中的语法错误
        // jshint: require('./scripts/jshint.js'),
        // 合并js文件操作
        uglify: require('./scripts/uglify.js')
        // 检查css
        //csslint: require('./scripts/csslint.js'),
        // 合并压缩css
        //cssmin: require('./scripts/cssmin.js')
    });

	// 加载所有的所需任务插件.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-contrib-cssmin');


    // 执行lib的代码压缩
    grunt.registerTask('jsmin', function() {
        grunt.task.run(['uglify']);
    });


    // 默认执行所有项目的构建工作
    grunt.registerTask('default', function() {
        grunt.task.run(['jsmin']);
    });

};