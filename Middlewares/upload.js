const multer = require("multer");
const AppError = require("../AppError");
const { MAX_FILE_BYTES } = require("../utils/fileKinds");

/**
 * One file of a multipart form, read into memory, never onto a disk: this
 * host has none to write to. The size limit is what keeps "into memory"
 * safe. multer's refusals are put in words: its own errors are not
 * AppErrors and would come out of the error handler as "500 Internal Server
 * Error".
 *
 * Always placed AFTER the middleware that knows the caller: nobody's file is
 * read into memory before they have signed in.
 *
 * `required: false` lets a request through with no file, and one that is not
 * a form at all (multer leaves those alone).
 */
const oneFile = (field, { required = true } = {}) => {
    // One byte more than the most a file may be, because the parser counts a
    // file that REACHES its limit as over it.
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_FILE_BYTES + 1, files: 1 },
    }).single(field);

    return (req, res, next) => {
        // multer drops every listener of its parser when it gives up, and a
        // body that ends inside the file then reports "Unexpected end of
        // form" to nobody: an unhandled 'error' event, which ends the
        // process. So the parser is remembered as the request is piped into
        // it, and keeps one listener of ours.
        let parser;
        const pipe = req.pipe;
        req.pipe = (to, ...rest) => {
            parser = to;
            return pipe.call(req, to, ...rest);
        };
        upload(req, res, (error) => {
            parser?.on("error", () => {});
            if (error?.code === "LIMIT_FILE_SIZE") {
                return next(
                    new AppError(
                        0,
                        `This file is larger than ${
                            MAX_FILE_BYTES / 1024 / 1024
                        } MB.`,
                        413
                    )
                );
            }
            // Everything else the parser objects to (another field name, a
            // second file, a body cut short), and no file where one is due.
            if (error || (required && !req.file)) {
                return next(
                    new AppError(0, `Send one file in the field “${field}”.`, 400)
                );
            }
            next();
        });
    };
};

module.exports = { oneFile };
