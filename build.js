const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const ADDON_PATH = 'addons/hexagon_tilemaplayer';
const REPO_URL = 'https://github.com/Zehir/godot-hexagon-tile-map-layer';

const category_ids = {
    "2D Tools": "1",
    "3D Tools": "2",
    "Shaders": "3",
    "Materials": "4",
    "Tools": "5",
    "Scripts": "6",
    "Misc": "7",
}

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const content = `[plugin]

name="${packageJson.displayName}"
description="${packageJson.description}"
author="${packageJson.author}"
version="${packageJson.version}"
script="${packageJson.main}"
`;

const filePath = `${ADDON_PATH}/plugin.cfg`;
fs.writeFileSync(filePath, content);

console.log(`Plugin configuration file ${filePath} updated (version ${packageJson.version})`);

// Copy all .md files from root to addon directory
const mdFiles = fs.readdirSync('.').filter(file => file.endsWith('.md'));
mdFiles.forEach(file => {
    fs.copyFileSync(file, `${ADDON_PATH}/${file}`);
    console.log(`Copied ${file} to ${ADDON_PATH}/${file}`);
});

// Remove dist directory if it exists and create it
const DIST_PATH = 'dist';
if (fs.existsSync(DIST_PATH)) {
    fs.rmSync(DIST_PATH, { recursive: true });
    console.log(`Removed existing ${DIST_PATH} directory`);
}
fs.mkdirSync(DIST_PATH);
console.log(`Created ${DIST_PATH} directory`);

// Function to add files recursively to zip
function addFilesToZip(zip, sourceDir, zipPath = '', excludes = []) {
    const files = fs.readdirSync(sourceDir);
    files.forEach(file => {
        const filePath = path.join(sourceDir, file);
        const zipFilePath = path.join(zipPath, file);

        // Skip if path matches any exclude pattern
        if (excludes.some(pattern => filePath.includes(pattern))) {
            return;
        }

        if (fs.statSync(filePath).isDirectory()) {
            addFilesToZip(zip, filePath, zipFilePath, excludes);
        } else {
            zip.addLocalFile(filePath, path.dirname(zipFilePath));
        }
    });
}

// Create archives
const baseArchiveName = `${packageJson.name}-${packageJson.version}`;
const fullArchiveName = `${baseArchiveName}-full`;
const addonArchiveName = `${baseArchiveName}-addon`;

// Create full archive
const fullZip = new AdmZip();
addFilesToZip(fullZip, '.', fullArchiveName, [
    'dist',
    '.git',
    'images',
    'node_modules'
]);
fullZip.writeZip(path.join(DIST_PATH, `${fullArchiveName}.zip`));

// Create addon archive
const addonZip = new AdmZip();
addFilesToZip(addonZip, ADDON_PATH, path.join(addonArchiveName, ADDON_PATH), [
    'example'
]);
addonZip.writeZip(path.join(DIST_PATH, `${addonArchiveName}.zip`));

console.log(`Created archives in ${DIST_PATH}:`);
console.log(`- ${fullArchiveName}.zip`);
console.log(`- ${addonArchiveName}.zip`);

const download_url = `${REPO_URL}/releases/download/v${packageJson.version}/${addonArchiveName}.zip`;

// Function to parse README and extract description
function getDescriptionFromReadme() {
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    const lines = readmeContent.split('\n');

    // Get first paragraph (excluding lines starting with #)
    const firstParagraph = lines.find(line => line.trim() && !line.startsWith('#'));

    // Get features list (excluding the "Features" header)
    const featureStart = lines.findIndex(line => line.includes('## Features'));
    const featureEnd = lines.findIndex((line, idx) => idx > featureStart && line.startsWith('##'));
    const features = lines
        .slice(featureStart + 1, featureEnd)
        .filter(line => line.trim() && line.startsWith('-'))
        .map(line => line.trim())
        .join('\n');

    return `${firstParagraph}\n\nFeatures:\n${features}`;
}

// Create asset template
const assetTemplate = {
    "title": packageJson.displayName,
    "description": getDescriptionFromReadme(),
    "category_id": category_ids[packageJson.category],
    "godot_version": packageJson.godotVersion,
    "version_string": packageJson.version,
    "cost": packageJson.license,
    "download_provider": "Custom",
    "download_commit": download_url,
    "download_url": download_url,
    "browse_url": REPO_URL,
    "issues_url": `${REPO_URL}/issues`,
    "icon_url": `${REPO_URL.replace('github.com', 'raw.githubusercontent.com')}/main/images/hexagon_tilemaplayer.png`,
};

// Write asset template to dist
fs.writeFileSync(
    path.join(DIST_PATH, 'asset-template.json.hb'),
    JSON.stringify(assetTemplate, null, 2)
);
console.log('Created asset template file in dist directory');
