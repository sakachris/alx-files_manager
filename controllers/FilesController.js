const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const File = require('../models/File');

async function postUpload(req, res) {
    try {
        const user = await User.findByToken(req.token);

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
            isPublic,
            parentId,
        });

        if (type === 'folder') {
            await newFile.save();
            return res.status(201).json(newFile);
        } else {
            const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
            const filePath = path.join(folderPath, uuidv4());
            const fileContent = Buffer.from(data, 'base64');

            fs.writeFileSync(filePath, fileContent);

            newFile.localPath = filePath;

            await newFile.save();

            return res.status(201).json(newFile);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    postUpload,
};
