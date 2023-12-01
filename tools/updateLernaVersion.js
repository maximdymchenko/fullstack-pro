const fs = require('fs');

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
        const majorVersion = versionArg.substring(1).split('.')[0];
        lernaConfig.version = `${majorVersion}.0.0`;

        // Update the allowBranch fields
        const branchName = `devpublish${majorVersion}`;
        lernaConfig.command.publish.allowBranch.push(branchName);
        lernaConfig.command.version.allowBranch.push(branchName);

        // Write the updated lerna.json file
        fs.writeFile(filePath, JSON.stringify(lernaConfig, null, 2), 'utf8', writeErr => {
            if (writeErr) {
                console.error(`Error writing file: ${writeErr}`);
                return;
            }
            console.log(`lerna.json updated successfully to version ${lernaConfig.version} with branch ${branchName}`);
        });
    });
}

// Process command line arguments
const filePath = process.argv[2];
const versionArg = process.argv[3];

if (!filePath || !versionArg || !versionArg.match(/^v\d+$/)) {
    console.error('Usage: node updateLernaVersion.js <path-to-lerna.json> v[Major]');
    process.exit(1);
}

updateLernaJson(filePath, versionArg);
