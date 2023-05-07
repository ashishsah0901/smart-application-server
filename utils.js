import crypto from "crypto";
import { spawn } from "child_process";

const salt = "ab91%&@$QZ".toString("hex");

export function hashPassword(password) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
}

export function verifyPassword(password, hash) {
  const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
  return hash === newHash;
}

export const verifyFace = async () => {
  const response = spawn("python3", ["test.py"]);
  return new Promise((resolve, reject) => {
    response.stdout.on("data", (data) => {
      resolve(data);
    });
    response.stderr.on("data", (err) => {
      reject(err);
    });
    response.on("close", (code) => {
      reject("Exited with code: " + code);
    });
  });
};

export const myLogger = function (req, res, next) {
  console.log(req);
  next();
};

export function download(url, path) {
  download.image({
    url: url,
    dest: path,
  });
}
