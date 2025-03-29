const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: ["http://localhost:5173"],  // Sesuaikan dengan port frontend Vite
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Konfigurasi multer untuk upload gambar
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "myblog"
})

db.connect((err) => {
    if(err) {
        console.log("Error connecting to database:", err);
        return;
    }
    console.log("Connected to database");
});

// Akses SSH key dari environment variable
const sshPrivateKey = process.env.SSH_PRIVATE_KEY;

// Jika Anda perlu menggunakan SSH key untuk operasi tertentu
function useSSHKey() {
    if (!sshPrivateKey) {
        console.error('SSH key not found in environment variables');
        return;
    }
    
    // Contoh: Simpan ke file temporary jika diperlukan untuk operasi tertentu
    // fs.writeFileSync('./temp_key', sshPrivateKey, {mode: 0o600});
    
    // Lakukan operasi yang membutuhkan SSH key
    
    // Hapus file temporary jika sudah dibuat
    // fs.unlinkSync('./temp_key');
}

app.post('/login', (req, res) => {
    // Hash the incoming password
    const hashedPassword = crypto
        .createHash('sha256')
        .update(req.body.password)
        .digest('hex');

    const sql = "SELECT * FROM admin WHERE name = ? AND password = ?";
    db.query(sql, [req.body.username, hashedPassword], (err, data) => {
        if(err) return res.json("Error");
        if(data.length > 0) {
            return res.json({Status: "Success"})
        } else {
            return res.json({Status: "Error"})
        }
    })
})

app.post('/insert-activity', upload.single('image'), (req, res) => {
    console.log('Received request:', req.body);
    console.log('File:', req.file);
    const imagePath = req.file ? req.file.filename : null;
    const { since_when, title, information, skill1, skill2, skill3, skill4 } = req.body;
    const likes = 0;

    const sql = "INSERT INTO activity (image, since_when, title, information, skill1, skill2, skill3, skill4, likes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [
        imagePath,
        since_when,
        title,
        information,
        skill1,
        skill2,
        skill3,
        skill4,
        likes
    ], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

app.get('/get-activities', (req, res) => {
    const sql = `
        SELECT * FROM activity 
        ORDER BY STR_TO_DATE(since_when, '%d %b %Y') DESC
    `;
    db.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json(result);
    });
});

app.post('/update-likes/:id', (req, res) => {
    const id = req.params.id;
    const sql = "UPDATE activity SET likes = likes + 1 WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

// Get single activity
app.get('/get-activity/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM activity WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json(result[0]);
    });
});

// Update activity
app.put('/update-activity/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    
    let imagePath;
    if (req.file) {
        // Jika ada file baru yang diupload
        imagePath = req.file.filename;
    } else {
        // Jika tidak ada file baru, gunakan currentImage dari form
        imagePath = req.body.currentImage;
    }

    const { since_when, title, information, skill1, skill2, skill3, skill4, likes } = req.body;

    const sql = "UPDATE activity SET image = ?, since_when = ?, title = ?, information = ?, skill1 = ?, skill2 = ?, skill3 = ?, skill4 = ?, likes = ? WHERE id = ?";
    
    db.query(sql, [
        imagePath,
        since_when,
        title,
        information,
        skill1,
        skill2,
        skill3,
        skill4,
        likes,
        id
    ], (err, result) => {
        if(err) {
            console.log('Update error:', err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

// Delete activity
app.delete('/delete-activity/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM activity WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

// Get all projects
app.get('/get-projects', (req, res) => {
    const sql = "SELECT * FROM project ORDER BY id DESC";
    db.query(sql, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json(result);
    });
});

// Get single project
app.get('/get-project/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM project WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json(result[0]);
    });
});

// Insert project
app.post('/insert-project', upload.fields([
    { name: 'image1' }, { name: 'image2' }, { name: 'image3' }, { name: 'image4' }, { name: 'image5' },
    { name: 'image6' }, { name: 'image7' }, { name: 'image8' }, { name: 'image9' }, { name: 'image10' }
]), (req, res) => {
    const images = {};
    // Handle uploaded images
    for (let i = 1; i <= 10; i++) {
        const fieldName = `image${i}`;
        images[fieldName] = req.files && req.files[fieldName] ? req.files[fieldName][0].filename : '';
    }

    const sql = `INSERT INTO project (
        image1, image2, image3, image4, image5, image6, image7, image8, image9, image10,
        title, information,
        sub_information1, sub_information2, sub_information3, sub_information4, sub_information5,
        sub_information6, sub_information7, sub_information8, sub_information9, sub_information10,
        skill1, skill2, skill3, skill4
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        images.image1, images.image2, images.image3, images.image4, images.image5,
        images.image6, images.image7, images.image8, images.image9, images.image10,
        req.body.title, req.body.information,
        req.body.sub_information1, req.body.sub_information2, req.body.sub_information3,
        req.body.sub_information4, req.body.sub_information5, req.body.sub_information6,
        req.body.sub_information7, req.body.sub_information8, req.body.sub_information9,
        req.body.sub_information10,
        req.body.skill1, req.body.skill2, req.body.skill3, req.body.skill4
    ];

    db.query(sql, values, (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

// Update project
app.put('/update-project/:id', upload.fields([
    { name: 'image1' }, { name: 'image2' }, { name: 'image3' }, { name: 'image4' }, { name: 'image5' },
    { name: 'image6' }, { name: 'image7' }, { name: 'image8' }, { name: 'image9' }, { name: 'image10' }
]), (req, res) => {
    const id = req.params.id;
    const images = {};
    
    // Handle images - use new uploaded image or keep existing one
    for (let i = 1; i <= 10; i++) {
        const fieldName = `image${i}`;
        images[fieldName] = req.files && req.files[fieldName] ? 
            req.files[fieldName][0].filename : 
            req.body[`currentImage${i}`];
    }

    const sql = `UPDATE project SET 
        image1=?, image2=?, image3=?, image4=?, image5=?, 
        image6=?, image7=?, image8=?, image9=?, image10=?,
        title=?, information=?,
        sub_information1=?, sub_information2=?, sub_information3=?, 
        sub_information4=?, sub_information5=?, sub_information6=?,
        sub_information7=?, sub_information8=?, sub_information9=?, 
        sub_information10=?,
        skill1=?, skill2=?, skill3=?, skill4=?
        WHERE id=?`;

    const values = [
        images.image1, images.image2, images.image3, images.image4, images.image5,
        images.image6, images.image7, images.image8, images.image9, images.image10,
        req.body.title, req.body.information,
        req.body.sub_information1, req.body.sub_information2, req.body.sub_information3,
        req.body.sub_information4, req.body.sub_information5, req.body.sub_information6,
        req.body.sub_information7, req.body.sub_information8, req.body.sub_information9,
        req.body.sub_information10,
        req.body.skill1, req.body.skill2, req.body.skill3, req.body.skill4,
        id
    ];

    db.query(sql, values, (err, result) => {
        if(err) {
            console.log('Update error:', err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

// Delete project
app.delete('/delete-project/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM project WHERE id = ?";
    
    db.query(sql, [id], (err, result) => {
        if(err) {
            console.log(err);
            return res.json({Status: "Error", Error: "Error in query"});
        }
        return res.json({Status: "Success"});
    });
});

app.listen(8081, () => {
    console.log("listening");
})

