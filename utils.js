import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import Path from "path";
import Axios from "axios";
import client from 'https';
import { spawn } from "child_process"

const salt = "ab91%&@$QZ".toString('hex');

export function hashPassword(password) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
};

export function verifyPassword(password, hash) {
    const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    return hash === newHash;
};

export const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, "images")
        },
        filename: function (req, file, callback) {
            callback(null, "image1.png")
        }
    }),
    limits: {
        fileSize: "5mb"
    }
}).single("image")

export function download(url) {
    const filepath = Path.join("images", "image2.png");
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

            }
        });
    });
}

export const verifyFace = async () => {
    const response = spawn('python3', ['test.py']);
    return new Promise((resolve, reject) => {
        response.stdout.on('data', (data) => {
            resolve(data);
        })
        response.stderr.on('data', (err) => {
            reject(err)
        })
        response.on('close', (code) => {
            reject("Exited with code: " + code)
        })
    })
}