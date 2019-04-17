#! /usr/bin/env node
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var shell = require('shelljs');
var merge = require('deepmerge');

var APP_ROOT = path.resolve(__dirname, '..');
var PROJECT_ROOT = process.env.PWD;

var packJSON = require(APP_ROOT + '/package.json');
var config = require(APP_ROOT + '/config.json');

var program = require('commander');

program.version(packJSON.version).option('-a, --auto', '使用 -s 初始化项目配置，并执行 -f 全量匹配并添加唯一ID').option('-s, --setup', '初始化项目配置，在根目录下生成feuid.js、package.json添加pre-commit勾子').option('-f, --full', '处理所有匹配的文件').option('-p, --path <path>', '自定义项目路径，默认为当前路径');
program.parse(process.argv);

PROJECT_ROOT = program.path || PROJECT_ROOT;

var projectInfo = resolveProjectInfo(PROJECT_ROOT);
resolveConfig(projectInfo);
setupPackage(projectInfo);

PROJECT_ROOT = projectInfo.projectRoot;

require('babel-core/register');
require("babel-polyfill");
var init = require('./app').init;
init(APP_ROOT, PROJECT_ROOT, packJSON, config, program, projectInfo);

function setupPackage(r) {
    if (!program.setup) return;

    console.log('setup', program.setup);

    if (!r.package) {
        console.error('package.json not exists');
        return;
    }

    var pack = require(r.package);
    console.log(pack);
}

function resolveProjectInfo(proot) {
    var r = {};
    r.projectRoot = proot;
    r.currentRoot = proot;
    r.appRoot = APP_ROOT;
    r.package = '';

    var tmpPath = proot;
    while (true) {
        var tmpFile = path.join(tmpPath, 'package.json');

        if (fs.existsSync(tmpFile)) {
            r.package = tmpFile;
            r.projectRoot = tmpPath;
            break;
        } else {
            if (tmpPath.length === 1) {
                break;
            }
            tmpPath = path.join(tmpPath, '../');
        }
    }

    return r;
}

function resolveConfig(r) {
    r.feuid = merge.all([{}, fs.existsSync(r.appRoot + '/feuid.config.js') ? require(r.appRoot + '/feuid.config.js') : {}, fs.existsSync(r.projectRoot + '/feuid.config.js') ? require(r.projectRoot + '/feuid.config.js') : {}, fs.existsSync(r.currentRoot + '/feuid.config.js') ? require(r.currentRoot + '/feuid.config.js') : {}], { arrayMerge: function arrayMerge(destinationArray, sourceArray, options) {
            return sourceArray;
        } });
}