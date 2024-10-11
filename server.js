const express = require('express');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
const app = express();
const port = 3000;

// MongoDB connection string
const mongoURI = 'mongodb+srv://rjm4zc:TritonVets%231@digital-file-cabinet.hqp5c.mongodb.net/Digital-File-Cabinet'; // Your MongoDB URI

// Serve static files from the "Vet.Center.Program" folder
app.use(express.static(path.join(__dirname)));

// Middleware to parse JSON requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Initialize GridFS
let gfs;
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');  // Set the collection to store the files
});

// Create storage engine for multer-gridfs-storage
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return {
            filename: file.originalname,  // Use the original filename
            bucketName: 'uploads'         // Set the GridFS bucket name
        };
    }
});
const upload = multer({ storage });

// Route to upload a file (e.g., image or PDF)
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ file: req.file });
});

// Route to fetch a file by filename
app.get('/file/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({ err: 'No file exists' });
        }

        // If file exists, create a read stream and pipe it to the response
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
    });
});

// Define a schema to match the structure of your CSV data
const DummyRFC = new mongoose.Schema({
    "Last Name, First Name (Legal Name)": String
});

// Create a model for the collection
const DummyRFCModel = mongoose.model('DummyRFC', DummyRFC, 'RFC Dummy');

// /scan route to fetch data from MongoDB
app.get('/scan', async (req, res) => {
    try {
        // Fetch the specific fields you want from MongoDB
        const data = await DummyRFCModel.find({}, { 
            _id: 0, 
            "Last Name, First Name (Legal Name)": 1, 
            "Student ID # (This is NOT your Social Security Number or SSO ID)": 1, 
            "Benefit you plan to utilize this term (check all that apply):": 1 
        });

        console.log('Data fetched from MongoDB:', data);  // Log the full document to verify structure
        res.json(data);
    } catch (err) {
        console.log('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
