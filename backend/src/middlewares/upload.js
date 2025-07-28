import multer from "multer";
import path from "path";
import fs from "fs";

const adminUploadDir = path.resolve("uploads", "admin");
const userUploadDir = path.resolve("uploads", "user");
fs.mkdirSync(adminUploadDir, { recursive: true });
fs.mkdirSync(userUploadDir, { recursive: true });

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
};

const createFilename = (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${safeName}`;
    cb(null, uniqueName);
};

const adminStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, adminUploadDir),
    filename: createFilename,
});

const userStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, userUploadDir),
    filename: createFilename,
});

export const uploadAdminProfileImage = multer({
    storage: adminStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
});

export const uploadUserProfileImage = multer({
    storage: userStorage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
});