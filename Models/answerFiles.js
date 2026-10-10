const mongoose = require("mongoose");
const { FILE_TYPES } = require("../utils/fileKinds");

/**
 * One file of a "photo" or "audio" answer: the bytes themselves, in one
 * document. The host caps a request at about 4.5 MB, so a file always fits
 * (a document holds 16 MB) and needs no GridFS and no disk, which this host
 * does not have.
 *
 * An answer holds the ids of its files and nothing else about them
 * (utils/answerValidator.js). A response lists every id it holds, at any
 * depth, as `fileIds`: that is what says a file is in use, and what a
 * dashboard account's right to read one is decided by. See
 * Controllers/files.js
 *
 * `data` and `thumb` are never selected unless asked for by name: a listing
 * that brought them along would bring megabytes per row.
 */
const answerFileSchema = new mongoose.Schema(
    {
        // Who uploaded it, which is who may put it in an answer. Always the
        // authenticated caller, never a field of the request.
        ownerType: {
            type: mongoose.Schema.Types.String,
            enum: ["user", "moderator"],
            required: [true, "Owner type is required!"],
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Owner id is required!"],
        },
        kind: {
            type: mongoose.Schema.Types.String,
            enum: FILE_TYPES,
            required: [true, "File kind is required!"],
        },
        // Decided by the server from the bytes, never what the sender claimed.
        contentType: {
            type: mongoose.Schema.Types.String,
            required: [true, "Content type is required!"],
        },
        // Bytes of `data`.
        size: {
            type: mongoose.Schema.Types.Number,
        },
        data: {
            type: mongoose.Schema.Types.Buffer,
            required: [true, "File data is required!"],
            select: false,
        },
        // A small JPEG of a photo, for lists of them. A recording has none.
        thumb: {
            type: mongoose.Schema.Types.Buffer,
            default: null,
            select: false,
        },
        // Only an officer's upload names a village: the one it was taken
        // for, and the only one whose answers may hold it. A villager's is
        // theirs wherever they live.
        villageId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true }
);

answerFileSchema.index({ ownerId: 1, createdAt: -1 });
// A village's files are looked through whoever uploaded them (its officer
// may have changed). Without this, that would read every file there is.
answerFileSchema.index({ villageId: 1, createdAt: -1 });

module.exports = mongoose.model(
    "answer_file",
    answerFileSchema,
    "answer_files"
);
