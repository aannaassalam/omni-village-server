const Joi = require("joi");
const sharp = require("sharp");
const AnswerFiles = require("../Models/answerFiles");
const AppError = require("../AppError");
const { STORES, storeFor } = require("../utils/responseStores");
const {
    FILE_TYPES,
    FILE_ID,
    MAX_FILES_PER_DAY,
    audioTypeOf,
    rangeOf,
} = require("../utils/fileKinds");
const { listPlaces, indexPlaces, scopeOf } = require("../utils/places");

/**
 * The files of photo and audio answers: taking one in, handing one out, and
 * removing what no answer holds any more.
 *
 * The bytes sit in MongoDB (Models/answerFiles.js) and nothing outside this
 * file reads, writes or deletes them, so keeping them somewhere else one day
 * is a change to this file alone. An answer only ever holds ids.
 *
 * Every rule here is about WHO: a file is its uploader's to read and to put
 * in an answer; a dashboard account reads the files of the responses it may
 * read; everyone else is told "File not found", never "not yours".
 *
 * There are two kinds of uploader, a villager and a field officer, and one
 * set of rules for both: villagerFiles and officerFiles below say what
 * differs between them.
 */

const DAY = 24 * 60 * 60 * 1000;

// A photo is kept inside a square of this many pixels a side, at this JPEG
// quality; its thumbnail likewise.
const PHOTO = { side: 1600, quality: 80 };
const THUMB = { side: 320, quality: 70 };

// More pixels than any phone photo under the size limit has. A picture is
// refused above it BEFORE it is decoded: a few hundred kilobytes of one
// colour can unpack into a gigabyte of memory.
const MAX_PHOTO_PIXELS = 50 * 1000 * 1000;

const notFound = () => new AppError(0, "File not found", 404);

/** What says a file is this villager's own. */
const ownedBy = (user) => ({ ownerType: "user", ownerId: user._id });

/**
 * Whose files a request deals with, as the three things asked of them here:
 *
 *   `own`    what says a file is the caller's own upload. Written on a new
 *            file, and the only files the caller may put in an answer;
 *   `among`  the files looked through for ones that no answer holds;
 *   `held`   reads the ids of the files the answers concerned do hold.
 *
 * A villager's are theirs alone, whichever of their pages holds them.
 */
const villagerFiles = (user) => ({
    own: ownedBy(user),
    among: ownedBy(user),
    held: () =>
        storeFor("villager").distinct("fileIds", { userId: user._id }),
});

/**
 * A field officer's, for ONE village. An officer answers about a village,
 * and a village can be given to another officer, who carries on in the same
 * responses. So a file is uploaded FOR a village and goes into that
 * village's answers only, and what those answers no longer hold is removed
 * whichever officer uploaded it.
 */
const officerFiles = (moderator, village) => ({
    own: {
        ownerType: "moderator",
        ownerId: moderator._id,
        villageId: village._id,
    },
    among: { ownerType: "moderator", villageId: village._id },
    held: () =>
        storeFor("officer").distinct("fileIds", { villageId: village._id }),
});

/**
 * Which responses a dashboard account may read, as a test of one response:
 * the rule the Responses list is held to (parseQuery in
 * Controllers/responses.js). A super admin reads all of them; a regional
 * account those of the villages inside its place, and, where the village did
 * not resolve, those of the country when the country IS its place.
 *
 * Worked out before any file is looked for, so an account without a place is
 * refused the same way whether or not the id exists.
 */
const responsesOpenTo = async (admin) => {
    if (admin.role === "admin") return () => true;
    const places = await listPlaces();
    const scope = scopeOf(admin, places);
    const placed = indexPlaces(places);
    return (response) =>
        scope.ids.has(String(response.villageId)) ||
        (!placed.has(String(response.villageId)) &&
            String(response.countryId) === String(scope.rootId));
};

/* ---------------- taking a file in ---------------- */

/**
 * A photo as it is stored: checked by decoding it, turned upright, fitted
 * inside 1600 x 1600 and saved again as JPEG, with a small copy beside it.
 * Saving it again is also what drops its EXIF: a phone photo can carry the
 * place it was taken.
 */
const photoFrom = async (buffer) => {
    const refuse = () => {
        throw new AppError(
            0,
            "This is not a photo the app can use. Send a JPEG, PNG or WebP picture.",
            400
        );
    };
    // Asked first: sharp throws on an empty buffer where it is given one,
    // before there is a promise to catch it on.
    if (!buffer.length) refuse();
    const open = () => sharp(buffer, { limitInputPixels: MAX_PHOTO_PIXELS });

    // What the bytes are, not what the sender called them. sharp reads SVG
    // and GIF too, which are no photos.
    const { format } = await open().metadata().catch(refuse);
    if (!["jpeg", "png", "webp"].includes(format)) refuse();

    const fitted = ({ side, quality }) =>
        open()
            // By its EXIF orientation, which is about to be dropped.
            .rotate()
            .resize({
                width: side,
                height: side,
                fit: "inside",
                withoutEnlargement: true,
            })
            .jpeg({ quality })
            .toBuffer();
    // A picture that starts well and is cut off half-way fails here.
    const [data, thumb] = await Promise.all([
        fitted(PHOTO),
        fitted(THUMB),
    ]).catch(refuse);

    return { contentType: "image/jpeg", data, thumb };
};

/**
 * A recording as it is stored: as it came, once its first bytes say what it
 * is (nothing installed here can decode one, so nothing is re-encoded).
 */
const audioFrom = (buffer) => {
    const contentType = audioTypeOf(buffer);
    if (!contentType) {
        throw new AppError(
            0,
            "This is not a recording the app can use. Record it in the app, or send an MP3, M4A, WAV or Ogg file.",
            400
        );
    }
    return { contentType, data: buffer, thumb: null };
};

/**
 * Deletes those of `files` (a villager's, or a village's: see villagerFiles)
 * that none of the responses concerned holds. `which` narrows them: the
 * files an answer has just lost, or everything uploaded more than a day ago.
 *
 * "Holds" is asked of ALL those responses: the same file may sit in two
 * answers, and must outlive the first one that lets go of it.
 *
 * ponytail: to find the day-old files nobody attached, MongoDB reads every
 * older file of this person (or village), bytes included: the index it comes
 * in by (ownerId, createdAt; villageId, createdAt) has no `_id` to pass over
 * the attached ones with. Fine for the tens of files a villager has; add
 * `_id` to those indexes if uploads ever get slow.
 */
const removeUnheld = async (files, which) => {
    const held = await files.held();
    await AnswerFiles.deleteMany({
        $and: [{ ...files.among, _id: { $nin: held } }, which],
    });
};

/**
 * Takes one file in for `files` (whose it will be) and answers what the app
 * is told of it. One file per request (Routes/files.js has seen to that, and
 * to its size); the answer then stores the `_id` returned here.
 */
const takeIn = async (req, files) => {
    const schema = Joi.object({
        kind: Joi.string()
            .valid(...FILE_TYPES)
            .required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    // Counted on the index alone (ownerId, createdAt), before any work is
    // done on the file. Per person: an officer's across all their villages.
    const today = await AnswerFiles.countDocuments({
        ownerId: files.own.ownerId,
        createdAt: { $gte: new Date(Date.now() - DAY) },
    });
    if (today >= MAX_FILES_PER_DAY) {
        throw new AppError(
            0,
            "Too many files were added today. Try again tomorrow.",
            429
        );
    }

    const stored =
        value.kind === "photo"
            ? await photoFrom(req.file.buffer)
            : audioFrom(req.file.buffer);

    const file = await AnswerFiles.create({
        ...files.own,
        kind: value.kind,
        size: stored.data.length,
        ...stored,
    });

    // An upload whose form was never saved is held by nothing. There is no
    // scheduled job on this host to sweep those, so each upload clears this
    // person's own (for an officer: this village's), once they are a day
    // old. If that fails, the upload has still succeeded.
    await removeUnheld(files, {
        createdAt: { $lt: new Date(Date.now() - DAY) },
    }).catch(() => {});

    return {
        _id: file._id,
        kind: file.kind,
        contentType: file.contentType,
        size: file.size,
    };
};

/** App-facing: a villager adds a file of their own. */
module.exports.upload_file = async (req, res) =>
    res.json(await takeIn(req, villagerFiles(res.locals.user)));

/* ---------------- handing a file out ---------------- */

/**
 * The id in the address, as ids are stored. One that cannot be an id is
 * "not found" like any other miss, not a cast error.
 */
const idOf = (req) => {
    if (!FILE_ID.test(req.params.id)) throw notFound();
    return req.params.id.toLowerCase();
};

/**
 * The bytes of the one file `filter` matches: its thumbnail when `thumb` is
 * asked for and it has one, else the file itself (a recording has none).
 *
 * Read as a document, not lean: Mongoose hands a Buffer path over as a
 * Buffer, the driver alone as a BSON Binary.
 */
const bytesOf = async (filter, thumb) => {
    const field = thumb ? "thumb" : "data";
    const file = await AnswerFiles.findOne(filter).select(`+${field}`);
    if (!file) throw notFound();
    if (thumb && !file.thumb) return bytesOf(filter, false);
    return { contentType: file.contentType, body: file[field] };
};

/**
 * Sends `body`, whole or the part a Range header asks for: iOS plays a
 * recording by asking for ranges of it.
 *
 * The bytes are in memory already, so nothing can fail once the headers have
 * gone (the error handler could not answer after that).
 */
const send = (req, res, { contentType, body }) => {
    const range = rangeOf(req.headers.range, body.length);
    if (range === false) {
        res.set("Content-Range", `bytes */${body.length}`);
        throw new AppError(0, "That part of the file does not exist.", 416);
    }
    const part = range ? body.subarray(range.start, range.end + 1) : body;

    res.status(range ? 206 : 200).set({
        // As decided here when it was uploaded, and not to be second-guessed
        // by the browser.
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Length": String(part.length),
        "Accept-Ranges": "bytes",
        // An id never changes its bytes, and they are for this caller only.
        "Cache-Control": "private, max-age=31536000, immutable",
        ...(range
            ? {
                  "Content-Range": `bytes ${range.start}-${range.end}/${body.length}`,
              }
            : {}),
    });
    // "This caller" by the token: a browser keeps the file for a year, and
    // must not hand it to whoever signs in on it next without asking here.
    res.vary("Authorization");
    return res.end(part);
};

/** App-facing: a villager reads a file they uploaded, and no one else's. */
module.exports.get_file = async (req, res) => {
    const { user } = res.locals;
    return send(
        req,
        res,
        await bytesOf(
            { _id: idOf(req), ...ownedBy(user) },
            req.query.thumb === "1"
        )
    );
};

/**
 * App-facing, for a field officer (Controllers/officer.js has settled that
 * the caller is one, and which villages are theirs: `villageIds`). They read
 * a file they uploaded, and any file an answer about one of their villages
 * holds: the village may have been another officer's when the photo was
 * taken. Anything else is "File not found".
 */
module.exports.sendOfficerFile = async (req, res, moderator, villageIds) => {
    const id = idOf(req);
    const held = await storeFor("officer").exists({
        fileIds: id,
        villageId: { $in: villageIds },
    });
    return send(
        req,
        res,
        await bytesOf(
            {
                _id: id,
                ownerType: "moderator",
                ...(held ? {} : { ownerId: moderator._id }),
            },
            req.query.thumb === "1"
        )
    );
};

/**
 * Dashboard. A file is read through the response that holds it: one that no
 * response holds (never attached, or not any more) is nobody's to see here,
 * a super admin's included.
 */
module.exports.get_file_admin = async (req, res) => {
    const id = idOf(req);
    const readable = await responsesOpenTo(res.locals.admin);

    // Every response holding it, a villager's or an officer's: the same
    // file may sit in two answers.
    const holders = (
        await Promise.all(
            STORES.map((Store) =>
                Store.find({ fileIds: id })
                    .select({ villageId: 1, countryId: 1 })
                    .lean()
            )
        )
    ).flat();
    if (!holders.some(readable)) throw notFound();

    return send(req, res, await bytesOf({ _id: id }, req.query.thumb === "1"));
};

/* ---------------- for the controllers that save answers ---------------- */

/**
 * Which of `ids` may be put in an answer by whoever `files` is (see
 * villagerFiles), as the Map utils/answerValidator.js is handed (`files`):
 * id to `{ kind, mine }`. Only their own uploads are looked for, so an id
 * that is no file and one that is somebody else's are equally absent. The
 * bytes are not sent for.
 */
module.exports.filesOf = async (ids, files) => {
    const found = await AnswerFiles.find({ _id: { $in: ids }, ...files.own })
        .select({ kind: 1 })
        .lean();
    return new Map(
        found.map((file) => [String(file._id), { kind: file.kind, mine: true }])
    );
};

module.exports.removeUnheld = removeUnheld;
module.exports.villagerFiles = villagerFiles;
module.exports.officerFiles = officerFiles;
module.exports.takeIn = takeIn;
