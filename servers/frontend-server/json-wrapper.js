import fs from 'fs';
import _ from 'lodash';
import globAll from 'glob-all';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { without, union } from 'lodash-es';
import { getSortedRoutes } from '@common-stack/client-react/lib/route/get-routes.js';
const combine = (routes) => without(union(routes), undefined);

function getRootPath() {
    const directoryName = dirname(fileURLToPath(import.meta.url));
    console.log('---diretocrtoryName', directoryName);
    const rootPath = directoryName.split('/node_modules')[0];
    return rootPath;
}

export function resolvePathsUsingPackages(packages, fileName, rootPath) {
    console.log('---PACKGAGE', packages, rootPath);
    const basePath = rootPath || getRootPath();
    console.log('--BBBBB', basePath);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const folders = globAll.sync(
        packages.map((item) => {
            console.log('test---', `${basePath}/node_modules/${item}`);

            return `${basePath}/node_modules/${item}`;
        }),
    );
    console.log('---folders', folders);
    const localesDirs = folders.reduce((acc, curr) => {
        const dir = `${curr}/lib/${fileName}`;
        if (fs.existsSync(dir)) {
            return [...acc, dir];
        }
        return acc;
    }, []);
    console.log('-_LOCALES DIRS', localesDirs);
    return localesDirs;
}
function customizer(objValue, srcValue) {
    if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
    }
}

export function loadRoutesConfig(options) {
    const fileName = options.routesFileName || 'route.json';
    console.log('--OPTIONS---', options);
    const directories = resolvePathsUsingPackages(options.packages, fileName, options.rootPath);
    console.log('---directories', directories);
    let content = [];
    directories.forEach((dir) => {
        console.log('--_DIR SEA', dir);
        const fileContent = String(fs.readFileSync(dir));
        const parsedContent = JSON.parse(fileContent);
        const mergedContent = _.mergeWith(content, parsedContent, customizer);
        if (mergedContent) {
            content = mergedContent;
        }
    });
    const result = content.length ? getSortedRoutes('/', Object.assign({}, ...content)) : null;
    console.log('--_RESULT----json', JSON.stringify(result));
    return result;
}

export function jsonRoutes(defineRoutes, routes) {
    return defineRoutes((route) => routes.forEach((r) => defineRoute(route, r)));
}

function genFilePath(file, module){
    // if (process.env.NODE_ENV === 'development') {
    //   let link = dependencies[module];
    //   let filePath = file;

    //   if (link && link.startsWith('link:')) {
    //     link = link.replace('link:', '');
    //     filePath = filePath.replace(module, link);
    //     filePath = '../' + filePath; // escape from src/
    //   } else {
    //     filePath = '../node_modules/' + filePath; // escape from src/, enter node_modules/
    //   }
    //   return filePath;
    // }
    return `../../../node_modules/${module}${file}`; // servers/frontend-server/src
}

function defineRoute(routeFn, jsonRoute) {
    console.log('---GIVEN JSON ---', jsonRoute)
    let path = jsonRoute.path;
    let file = genFilePath(jsonRoute.file, jsonRoute.module);
    console.log('---FILE-', file);
    const { routes = null, ...rest } = jsonRoute;
    // let routes = jsonRoute.routes;
    let opts = { ...rest };
    delete opts.path;
    delete opts.file;
    console.log(`
    --------------
    file: ${file}
    path: ${path}
    opts: ${JSON.stringify(opts)}
    ----------------
    `)
    if (routes) {
        routeFn(path, file, opts, () => {
            routes.forEach((c) => defineRoute(routeFn, c));
        });
    } else {

        routeFn(path, file, opts);
    }
}
export function defineRoutesConfig(routeFn, options) {
    const jsonRoute = loadRoutesConfig(options);
    console.log('----JSON ROUTE', jsonRoute)
    const definedRoutes =  defineRoute(routeFn, jsonRoute[0]);
    console.log('_--JSON DEFINED ROUTES', JSON.stringify(definedRoutes.stringify()))
    return definedRoutes;
}
