const fs = require('fs');
const archiver = require('archiver');

const metadata = JSON.parse(fs.readFileSync('src/metadata.json'));

if (!fs.existsSync('dist')) {
	fs.mkdirSync('dist');
}

const archive = archiver('zip');
archive.on('error', (err) => {
	throw err;
});
archive.pipe(fs.createWriteStream(`dist/${metadata.uuid}-v${metadata.version}.zip`));
archive.directory('src', false);
archive.file('LICENSE');
archive.finalize();
