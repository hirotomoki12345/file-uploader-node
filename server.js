const express = require('express');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4852;
const uploadDir = 'uploads';
const fileInfoPath = path.join(__dirname, 'fileInfo.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(fileInfoPath)) fs.writeFileSync(fileInfoPath, JSON.stringify([]));

const deleteIntervals = {
  1: 1 * 86400000,
  5: 5 * 86400000,
  10: 10 * 86400000,
  30: 30 * 86400000
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 * 1024 } // 8GB
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/upload', upload.single('file'), (req, res) => {
  const deleteAfterDays = parseInt(req.body.deleteAfterDays, 10);
  const deleteTimestamp = Date.now() + deleteIntervals[deleteAfterDays];
  const fileInfo = {
    fileName: req.file.filename,
    deleteAt: deleteTimestamp,
    password: req.body.deletePassword
  };
  saveFileInfo(fileInfo);
  res.status(200).json({ fileName: req.file.filename, url: `/dl.html?fileName=${req.file.filename}` });
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  checkAndDeleteExpiredFiles();
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  ws.on('message', (message) => {});
});

setInterval(checkAndDeleteExpiredFiles, 6 * 60 * 60 * 1000);

function saveFileInfo(newFileInfo) {
  let fileInfos = JSON.parse(fs.readFileSync(fileInfoPath, 'utf8'));
  fileInfos.push(newFileInfo);
  fs.writeFileSync(fileInfoPath, JSON.stringify(fileInfos));
}

function checkAndDeleteExpiredFiles() {
  let fileInfos = JSON.parse(fs.readFileSync(fileInfoPath, 'utf8'));
  const now = Date.now();
  const updatedFileInfos = fileInfos.filter(fileInfo => {
    if (now > fileInfo.deleteAt) {
      const filePath = path.join(uploadDir, fileInfo.fileName);
      fs.unlink(filePath, (err) => {});
      return false;
    }
    return true;
  });
  fs.writeFileSync(fileInfoPath, JSON.stringify(updatedFileInfos));
}

app.post('/delete', (req, res) => {
  const { fileName, password } = req.body;
  let fileInfos = JSON.parse(fs.readFileSync(fileInfoPath, 'utf8'));
  const fileInfo = fileInfos.find(info => info.fileName === fileName);

  if (fileInfo && fileInfo.password === password) {
    const filePath = path.join(uploadDir, fileName);
    fs.unlink(filePath, (err) => {
      if (err) return res.status(500).json({ error: 'Error deleting file.' });
      fileInfos = fileInfos.filter(info => info.fileName !== fileName);
      fs.writeFileSync(fileInfoPath, JSON.stringify(fileInfos));
      return res.json({ message: 'File deleted successfully.' });
    });
  } else {
    return res.status(403).json({ error: 'Invalid password or file not found.' });
  }
});
