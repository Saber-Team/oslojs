var grunt = require('grunt');

module.exports = {
    build: {
        src: ['src/*.debug.js', 'src/*/**.debug.js']
    },
    // options here to override JSHint defaults
    options: {
        bitwise: false,         // 禁用位运算符
        camelcase: false,       // 是否只允许驼峰命名或下划线相连的大写命名
        curly: false,           // 循环时不强制用括号
        eqeqeq: true,           // ===代替==
        es3: true,              // 仍然需要支持IE678
        forin: false,           // 遍历对象不需要全用for-in
        freeze: true,           // 禁止修改原生对象
        immed: true,            // 直接调用的函数需要wrapper
        indent: true,           // 缩进全用tab
        latedef: false,         // 同undef
        newcap: true,           // 构造函数需要大写
        noarg: true,            // 禁用arguments.callee
        noempty: true,          // 不能有空白代码块
        nonbsp: false,          //
        nonew: true,            // 构造函数只能通过new运算符调用
        plusplus: false,
        quotmark: 'single',     // 字符串全部单引号
        undef: true,            // 不能使用未定义的变量
        unused: 'vars',         // 检查定义但未被使用的变量, 不包括形参     
        strict: true,           // ES5的严格模式
        maxparams: false,       // 不限制形参数量
        maxdepth: false,        // 不限制代码块内嵌层次
        maxstatements: 200,     // 每个函数语句数目最大不超过200
        maxcomplexity: false,
        maxlen: 120,            // 每行代码最大长度
        
        asi: true,              // 允许省略不必要的分号
        boss: true,
        debug: false,           // 默认代码中不含有debugger
        evil: false,            // 不允许用eval
        laxcomma: false,
        browser: true,          // 浏览器环境
        devel: true,            // 不要含有alert console.log等代码
        

        globals: {
            sogou: false,
            module: false,
            define: false
        },
        reporter: require('jshint-stylish'),
        ignores: ['scripts/', 'build/'],
        force: true
    }
};