import fs from 'fs';
import path from 'path';

// const authWrapperImportPath = '../components/Wrapper'; // Adjust the path as necessary
const authWrapperImportPath = '@adminide-stack/user-auth0-browser-ant';

export function getRootPath() {
  const directoryName = path.dirname(process.cwd());
  const rootPath = directoryName.split(path.sep);
  rootPath.splice(rootPath.length - 1, 1);
  
  return rootPath.join(path.sep);
}

export function wrapRouteComponent(file: string) {
  const basePath = getRootPath() + '/node_modules/';
  const filePath = `${basePath}${file}`;
  let fileName = path.basename(file);

  try {
    const wrappedContent = `
import * as React from 'react';
import { authWrapper } from '${authWrapperImportPath}';
import Component from './${fileName}';
var WrappedComponent = (props) => {
  return (authWrapper(React.createElement(Component, props), props));
};export{WrappedComponent as default};
`;
    fileName = `_authenticate${fileName}`;
    const newPath = path.resolve(path.dirname(filePath), fileName);
    fs.writeFileSync(newPath, wrappedContent, 'utf8');
    console.log(`Wrapped ${newPath}`);

    return newPath.replace(basePath, '');
  } catch (e) {
    console.log('Error', e);
  }

  return file;
}
