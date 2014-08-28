var grunt = require('grunt');
var website_config = grunt.file.readJSON('config/website.json');


module.exports = {

    website: {
        src: website_config['appIndex']['css']
    },
    options: {
        banner: '/* My linted css file */',
        'box-model': false, /* box-sizing属性并不常用 */
        'display-property-grouping': false,
        'duplicate-properties' : false, /* 很多时候需要重复命名 fallback-colors */
        'known-properties': false, /* 针对ie67可能写hack */
        'non-link-hover': 2, /* 为了兼容性只有a可跟hover伪类 */
        'box-sizing': false, /* 同box-model对立 */
        'compatible-vendor-prefixes': 2,
        'text-indent': false,
        'star-property-hack': false,
        'underscore-property-hack': false,
        'bulletproof-font-face': 2,
        import: 2, /* 不允许使用@import */
        'regex-selectors': false, /* 为了向后兼容允许css3新特性 */
        'universal-selector': 2, /* 不允许使用通配符 */
        'zero-units': false, /* 代码中遗留的有带单位的0 */
        'overqualified-elements': false, /* 有时为了权重 */
        'duplicate-background-images': false, /* 代码中遗留的 */
        floats: false, /* 目前整体布局仍然采用float: left | right */
        'font-sizes': false, /* 暂时允许多次出现 */
        ids: false,
        'outline-none': false,
        'qualified-headings': false, // todo
        'unique-headings': false /* reset.css多次定义h */
    }
};
