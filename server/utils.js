"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fsWriteAndMkdir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fsWriteAndMkdir = (file, data, callback) => {
    ensureDirectoryExistence(file);
    fs_1.default.writeFile(file, data, callback);
};
exports.fsWriteAndMkdir = fsWriteAndMkdir;
const ensureDirectoryExistence = (filePath) => {
    var dirname = path_1.default.dirname(filePath);
    if (fs_1.default.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs_1.default.mkdirSync(dirname);
};
