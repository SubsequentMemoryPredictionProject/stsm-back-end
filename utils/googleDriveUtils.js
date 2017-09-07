// const fs = require('fs');
//
// const downloadDrive = (fileId, callback) => {
//     const fileExt = fileId.split('.');
//     const file = Date.now() + "." + fileExt[fileExt.length - 1];
//     const dest = fs.createWriteStream('./files/' + file);
//     service.files.get({
//         auth: oauth2Client,
//         fileId: fileExt[0],
//         alt: 'media',
//     })
//         .on('finish', () => {
//             callback(file);
//         })
//         .on('error', (err) => {
//             console.log('Error during download', err);
//         })
//         .pipe(dest);
// }
//
// module.exports({
//     downloadDrive,
// });
