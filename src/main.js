#! /usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require( 'shelljs' );
require('shelljs-plugin-sleep');
const merge = require('deepmerge')

const APP_ROOT = path.resolve(__dirname, '..');
let PROJECT_ROOT = process.env.PWD;

const packJSON = require( `${APP_ROOT}/package.json` );
const config = require( `${APP_ROOT}/config.json` );

var program = require('commander');

program
    .version( packJSON.version )
    .option('-a, --auto', '使用 -s 初始化项目配置，并执行 -f 全量匹配并添加唯一ID' )
    .option('-s, --setup', '初始化项目配置，在根目录下生成feuid.js、package.json添加pre-commit勾子' )
    .option('-f, --full', '处理所有匹配的文件' )
    .option('-p, --path <path>', '自定义项目路径，默认为当前路径' )
    ;
program.parse(process.argv);

PROJECT_ROOT = program.path || PROJECT_ROOT;

let projectInfo = resolveProjectInfo( PROJECT_ROOT );
resolveConfig( projectInfo )
setupPackage( projectInfo );

PROJECT_ROOT = projectInfo.projectRoot;

require('babel-core/register');
require("babel-polyfill");
const init = require( './app' ).init;

if( program.auto ){
    init( APP_ROOT, PROJECT_ROOT, packJSON, config, program, projectInfo );
}else if( !program.setup ){
    init( APP_ROOT, PROJECT_ROOT, packJSON, config, program, projectInfo );
}

function setupPackage( r ){
    if( !program.setup ) return;

    console.log( 'setup', program.setup );

    if( !r.package ) {
        console.error( 'package.json not exists' );
        return;
    }

    let pack = require( r.package );
    let install = [];
    console.log( pack );

    if( !( ( 'feuid' in pack.dependencies ) || 'feuid' in pack.devDependencies ) ){
        install.push( 'feuid' );
    }
    if( !( ( 'pre-commit' in pack.dependencies ) || 'pre-commit' in pack.devDependencies ) ){
        install.push( 'pre-commit' );
    }

    console.log( 'install:', install );
    if( install.length ){
        installPack( install, r );
        //shell.sleep( 5 );
        delete require.cache[require.resolve(r.package)]
        pack = require( r.package );
    }

    if( !pack.scripts ){
        pack.scripts = {};
    }

    let writePack = 0;

    if( !( pack.scripts && pack.scripts.feuid ) ){
        pack.scripts.feuid = 'node ./node_modules/feuid/bin/main.js';
        writePack = 1;
    }

    if( !pack['pre-commit'] ){
        pack['pre-commit'] = [ 'feuid'];
        writePack = 1;
    }
    if( !pack['pre-commit'].toString().indexOf( 'feuid' ) > -1 ){
        if( typeof pack['pre-commit'] == 'string' ){
            pack['pre-commit'] += ',feuid';
            writePack = 1;
        }else if( typeof pack['pre-comit'] == 'array' ){
            pack['pre-commit'].push( 'feuid' );
            writePack = 1;
        }
    }

    if( writePack ){
        fs.writeFileSync( r.package, JSON.stringify( pack, null, 2 ), { encoding: projectInfo.feuid.encoding || 'utf8' } )
    }
}

function installPack( install, r ){
    let cmd = '';
    if( shell.which( 'yarn' ) ){
        cmd = `yarn add ${install.join(' ')}`
    }else if( shell.which( 'npm' ) ){
        cmd = `npm install ${install.join(' ')}`
    }

    if( cmd ){
        shell.exec( `cd "${r.projectRoot}" && ${cmd}` );
    }
}

function resolveProjectInfo( proot ){
    let r = {};
    r.projectRoot = proot;
    r.currentRoot = proot;
    r.appRoot = APP_ROOT;
    r.package = '';

    let tmpPath = proot;
    while( true ){
        let tmpFile = path.join( tmpPath, 'package.json' );

        if( fs.existsSync( tmpFile ) ){
            r.package = tmpFile;
            r.projectRoot = tmpPath;
            break;
        }else{
            if( tmpPath.length === 1 ){
                break;
            }
            tmpPath = path.join( tmpPath, '../' );
        }
    }

    return r;
}

function resolveConfig( r ){
    r.feuid = merge.all( [
        {}
        , fs.existsSync( `${r.appRoot}/feuid.config.js` ) 
            ? require( `${r.appRoot}/feuid.config.js` ) : {}
        , fs.existsSync( `${r.projectRoot}/feuid.config.js` ) 
            ? require( `${r.projectRoot}/feuid.config.js` ) : {}
        , fs.existsSync( `${r.currentRoot}/feuid.config.js` ) 
            ? require( `${r.currentRoot}/feuid.config.js` ) : {} 
    ], { arrayMerge: (destinationArray, sourceArray, options) => sourceArray });
}

