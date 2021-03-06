// todo: current use 0.2.3, but the source map option cannot
// resolve the relative path correctly. We shouldn't update uglify
// automatically because the lastest 0.3.1(even 0.2.4) cannot minify
// json2.js successfully.
// see here: https://github.com/gruntjs/grunt-contrib-uglify/issues/143
// 在这里提了issue

module.exports = {
   
    build: {
        files: [{
            expand: true,
            cwd: 'src/',
            src: ['*.js', '*/**.js'],
            dest: 'build',
            ext: '.js'
        }]
        /*
        options: {
            sourceMap: 'build/xx.map', // 这个路径要相对于gruntfile.js才能生成文件
            sourceMappingURL: './xx.map' // 这个路径是 相对于压缩后的文件生成地址
        }*/
    },
  
    options: {
        banner: '/** Oslo JavaScript Framework. */\n',
        report: 'none',     // 输出gzip后的文件体积
        beautify: false,  // 不需要格式化良好的压缩代码 默认false
        compress: {
            properties: true,   // 引号的属性改为点符号方便压缩
            dead_code: true,    // 移除无用代码
            drop_debugger: true,// 移除debugger语句
            unsafe: false,      // 一些不安全的激进压缩方法 todo
            conditionals: true, // 优化if-else
            comparisons: true,  // 优化比较运算
            evaluate: true,
            booleans: true,
            loops: true,        // 优化循环逻辑 todo
            unused: true,       // 优化不用的变量
            hoist_funs: false,  // 函数提升
            hoist_vars: false,  // 是否变量提升
            if_return: true,
            join_vars: true,
            side_effects: false,
            warnings: false,    // todo
            global_defs: {
                DEBUG: false    // 目前没用,但是鼓励写debug条件代码
            }
        },
        wrap: null,
        enclose: null,
        // 这个路径是 相对于压缩后的文件生成
        sourceMapRoot: '/'
    }
};