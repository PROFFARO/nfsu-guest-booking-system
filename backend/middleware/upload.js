import multer from 'multer';

// Use memory storage for Buffer-based uploads (Required for Vercel/MongoDB storage)
const storage = multer.memoryStorage();

// File filter to allow only image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png and .webp formats allowed!'), false);
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  },
  fileFilter: fileFilter
});

export default upload;
