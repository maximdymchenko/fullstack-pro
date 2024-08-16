const fs = require('fs');
const { exec } = require('child_process');

function updateLernaJson(filePath, versionArg) {
    // Read the existing lerna.json file
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            return;
        }

        let lernaConfig;
        try {
            lernaConfig = JSON.parse(data);
        } catch (parseErr) {
            console.error(`Error parsing JSON: ${parseErr}`);
            return;
        }

        // Update the version field
        // Extract major and minor version, assuming format vMajor.Minor (e.g., v2.1)
        const versionComponents = versionArg.substring(1).split('.');
        const majorVersion = versionComponents[0];
        const minorVersion = versionComponents.length > 1 ? versionComponents[1] : '0';
        lernaConfig.version = `${majorVersion}.${minorVersion}.0`;

        // Update the allowBranch fields with dash instead of dot
        const branchName = `devpublish${majorVersion}${minorVersion !== '0' ? '-' + minorVersion : ''}`;
        const branchDevelopName = `develop${majorVersion}${minorVersion !== '0' ? '-' + minorVersion : ''}`;

        lernaConfig.command.publish.allowBranch.push(branchName);
        lernaConfig.command.version.allowBranch.push(branchName);
        lernaConfig.command.version.allowBranch.push(branchDevelopName);

        // Write the updated lerna.json file
        fs.writeFile(filePath, JSON.stringify(lernaConfig, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(`Error writing file: ${writeErr}`);
                return;
            }
            console.log(
                `lerna.json updated successfully to version ${lernaConfig.version} with branches ${branchName} and ${branchDevelopName}`,
            );

            // Run prettier to format the updated lerna.json file
            exec(`npx prettier --write ${filePath}`, (execErr, stdout, stderr) => {
                if (execErr) {
                    console.error(`Error running prettier: ${execErr}`);
                    return;
                }
                if (stderr) {
                    console.error(`Prettier stderr: ${stderr}`);
                }
                console.log(`Prettier stdout: ${stdout}`);
                console.log('lerna.json formatted successfully.');
            });
        });
    });
}

// Process command line arguments
const filePath = process.argv[2];
const versionArg = process.argv[3];

if (!filePath || !versionArg || !versionArg.match(/^v\d+(\.\d+)?$/)) {
    console.error('Usage: node updateLernaVersion.js <path-to-lerna.json> v[Major].[Minor]');
    process.exit(1);
}

updateLernaJson(filePath, versionArg);
