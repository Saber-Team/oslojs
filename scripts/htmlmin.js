var grunt = require('grunt');
var website_config = grunt.file.readJSON('config/website.json');

module.exports = {
    website: {
        category: {
            src: website_config.rel_path + website_config['appIndex']['html'],
            dest: website_config.rel_path + 'html/appIndex.html'
        },
       
    },
    options: {
        collapseWhitespace: true, // <div> <p> foo </p> </div> => <div><p>foo</p></div>
        // so use html entity `&nbsp;` instead whitespace
        removeComments: true, // 移除页面中的注释
        useShortDoctype: false // 为保证兼容性暂不使用html5doctype
    }
};
