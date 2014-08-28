var fs = require('fs'),
    grunt = require('grunt');
var config = grunt.file.readJSON('./config.json');

// used for config file's key map to real file name
var FileNameMap = {
    category: 'Category.html',
    children: 'children.html',
    detail: 'final.html',
    girl: 'Girl.html',
    hd: 'HD.html',
    newArrival: 'NewArrival.html',
    news: 'News.html',
    portal: 'Portal.html',
    required: 'Required.html',
    result: 'result.html',
    top: 'Top.html',
    topic: 'Topic.html',
    topicfinal: 'Topicfinal.html',
    installmust: 'installmust.html',
    adsfinal: 'Adsfinal.html'
};

var base = '../html/',
    RECOMMENTS = /<!--([\s|\S])*?-->/mg,
    RECSSLINK = /<link(?:[\s|\S])*?(\/)?>/ig,
    RESCRIPT = /<script(?:[^<])*><\/script>/ig,
    indexCss = 0,
    indexJs = 0;

// replace link files with a single built one
function parse (fname) {
    indexCss = 0;
    indexJs = 0;
    var realpath = base + FileNameMap[fname];
    var data = fs.readFileSync(realpath, {encoding: "utf-8"});
    data = data
    .replace(RECOMMENTS, function () { return ''; })
    .replace(RECSSLINK, function (match) {
        indexCss++;
        if (indexCss == 1)
            return '<link type="text/css" rel="stylesheet" href="' +
                '../build/' + fname + '/' + fname + '.min.css" />';
        else
            return '';
    })
    .replace(RESCRIPT, function (match) {
        indexJs++;
        if (indexJs == 1)
            return '<script type="text/javascript" src="' +
                '../build/' + fname + '/' + fname + '.min.js"></script>';
        else
            return '';
    });
    fs.writeFileSync(realpath, data, {encoding: "utf-8"});
}

var targetArr = [
    'category', 'top', 'portal', 'girl', 'children', 'topic',
    'topicfinal', 'hd', 'newArrival', 'required', 'result',
    'detail', 'news', 'installmust', "adsfinal"
];

module.exports.exec = function (mod) {
    switch (mod) {
        case 'website':
            for (var i = 0; i < targetArr.length; ++i) {
                parse(targetArr[i])
            }
            break;
    }
};