/* eslint-disable jest/require-hook */
/* eslint-disable no-loop-func */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable consistent-return */

const glob = require('glob');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const { execSync } = require('child_process');

const git = simpleGit();
const monorepoRoot = path.resolve(__dirname, '..');

const JSON_SPACING = 4;
const findPackageJsonFiles = () => {
    return new Promise((resolve, reject) => {
        glob(
            `${monorepoRoot}/+(servers|portable-devices|packages|packages-modules)/**/package.json`,
            { onlyFiles: false, ignore: '**/node_modules/**' },
            (err, files) => {
                if (err) reject(`Unable to scan directory: ${err}`);
                resolve(files);
            },
        );
    });
};

const buildPackageMap = async () => {
    const packageJsonFiles = await findPackageJsonFiles();
    const packageMap = new Map();

    packageJsonFiles.forEach((file) => {
        const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (packageJson.name) {
            packageMap.set(packageJson.name, {
                path: path.dirname(file),
                version: packageJson.version,
            });
        }
    });

    return packageMap;
};

const searchAndUpdate = (dependencies, filePath, obj, packageMap) => {
    const packageDir = path.dirname(filePath);

    for (const key in dependencies) {
        if (dependencies[key].startsWith('link:')) {
            const relativeDepFolder = dependencies[key].split('link:')[1];
            const dependencyFolder = path.join(packageDir, relativeDepFolder);

            try {
                const packageJsonPath = path.join(dependencyFolder, 'package.json');
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                dependencies[key] = packageJson.version;
                const str = JSON.stringify(obj, null, JSON_SPACING);
                fs.writeFileSync(filePath, str, 'utf8');
            } catch (err) {
                console.error(`Error updating ${key} in ${filePath}: ${err.message}`);
                throw err;
            }
        } else if (packageMap.has(key)) {
            dependencies[key] = packageMap.get(key).version;
            const str = JSON.stringify(obj, null, JSON_SPACING);
            fs.writeFileSync(filePath, str, 'utf8');
        }
    }
};

const updateDependencies = async () => {
    const packageMap = await buildPackageMap();
    const packageJsonFiles = await findPackageJsonFiles();

    packageJsonFiles.forEach((file) => {
        if (!file.includes('node_modules')) {
            fs.readFile(file, 'utf-8', (err, data) => {
                if (err) return console.error(`Unable to read file: ${err}`);
                try {
                    const obj = JSON.parse(data);
                    const { dependencies, peerDependencies, devDependencies } = obj;
                    searchAndUpdate(dependencies, file, obj, packageMap);
                    searchAndUpdate(peerDependencies, file, obj, packageMap);
                    searchAndUpdate(devDependencies, file, obj, packageMap);
                } catch (err) {
                    console.error(`Error processing ${file}: ${err.message}`);
                }
            });
        }
    });

    try {
        execSync('npx prettier --write "**/package.json"', { stdio: 'inherit' });
    } catch (err) {
        console.error(`Error running prettier: ${err.message}`);
    }

    await git.add('.');
    const status = await git.status();
    console.log('POST GIT CHANGES', status);

    if (status.modified.length) {
        const fileArray = status.modified.filter((element) => element.includes('package.json'));
        const addArray = fileArray.map((element) => `./${element}`);
        await git.add(addArray);
        await git.commit('Updated packages to use correct versions and linked dependencies');
    } else {
        console.log('No changes detected');
    }
};

updateDependencies()
    .then(() => {
        console.log('Dependencies updated done!');
    })
    .catch((err) => console.error(`Error in updateDependencies: ${err.message}`));
