const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const imageThumbnail = require('image-thumbnail');
const Bull = require('bull');
const { User, File } = require('../models');

const fileQueue = new Bull('fileQueue');

exports.createFile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await File.findById(parentId);
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = new File({
      userId: user._id,
      name,
      type,
      parentId,
      isPublic,
      localPath: null
    });
    await newFile.save();

    if (type === 'folder') {
      return res.status(201).json(newFile);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const filePath = `${folderPath}/${fileName}`;
    const buffer = Buffer.from(data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    newFile.localPath = filePath;
    await newFile.save();

    fileQueue.add({
      fileId: newFile._id,
      userId: user._id,
    });

    return res.status(201).json(newFile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.getFileById = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await File.findOne({ _id: req.params.id, userId: user._id });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.getAllFiles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page) || 0;
    const limit = 20;
    const skip = page * limit;

    const files = await File.find({ parentId, userId: user._id }).skip(skip).limit(limit);
    return res.json(files);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.publishFile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await File.findOneAndUpdate({ _id: req.params.id, userId: user._id }, { isPublic: true }, { new: true });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.unpublishFile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await File.findOneAndUpdate({ _id: req.params.id, userId: user._id }, { isPublic: false }, { new: true });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.getFileData = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!req.user || req.user.id !== file.userId.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    if (!file.localPath) {
      return res.status(404).json({ error: 'Not found' });
    }

    let size = req.query.size || 500;
    size = parseInt(size);

    let thumbnailPath = `${file.localPath}_${size}`;
    if (!fs.existsSync(thumbnailPath)) {
      thumbnailPath = file.localPath;
    }

    const mimeType = mime.lookup(thumbnailPath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    return res.sendFile(thumbnailPath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
};
