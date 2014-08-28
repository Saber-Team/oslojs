var grunt = require('grunt');
var website_config = grunt.file.readJSON('config/website.json');


module.exports = {
    website: {
        files: [ 
            {
                src: website_config['appIndex']['css'],
                dest: website_config.rel_path + 'build/appIndex/appIndex.min.css'
            },
            {
            	src: website_config['required']['css'],
                dest: website_config.rel_path + 'build/required/required.min.css'
            },
            {
                src: website_config['top']['css'],
                dest: website_config.rel_path + 'build/top/top.min.css'
            },
            {
                src: website_config['RecommendList']['css'],
                dest: website_config.rel_path + 'build/RecommendList/RecommendList.min.css'
            },
            {
                src: website_config['RecommendDetail']['css'],
                dest: website_config.rel_path + 'build/RecommendDetail/RecommendDetail.min.css'
            },
            {
                src: website_config['Guessyoulike']['css'],
                dest: website_config.rel_path + 'build/Guessyoulike/Guessyoulike.min.css'
            },
            {
                src: website_config['appCategory']['css'],
                dest: website_config.rel_path + 'build/appCategory/appCategory.min.css'
            }
            
        ]
    }

};
