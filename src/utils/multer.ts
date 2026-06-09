import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";
import fs from "fs";

interface UploadOptions {
  folder: string;
}

export const upload = ({ folder }: UploadOptions) => {
  const storage = diskStorage({
    destination: (_req, file, cb) => {
      const destination = `uploads/${folder}/${file.fieldname}`;
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      cb(null, `${nanoid()}-${file.originalname}`);
    },
  });

  return multer({ storage });
};
