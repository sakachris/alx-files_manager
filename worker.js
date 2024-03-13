const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const { File } = require('./models');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];
  for (const size of thumbnailSizes) {
    const thumbnailPath = `${file.localPath}_${size}`;
    await imageThumbnail(file.localPath, { width: size, height: size, responseType: 'buffer' })
    .then(thumbnailBuffer => fs.promises.writeFile(thumbnailPath, thumbnailBuffer))
    .catch(error => console.error(`Error generating thumbnail: ${error}`));
  }
});
