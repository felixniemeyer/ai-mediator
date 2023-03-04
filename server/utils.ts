import fs from 'fs'; 
import path from 'path'; 


export { fsWriteAndMkdir }

const fsWriteAndMkdir = (file: string, data: string, callback: (err: any) => any) => {
    ensureDirectoryExistence(file);
    fs.writeFile(file, data, callback);
}

const ensureDirectoryExistence = (filePath: string) => {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}
