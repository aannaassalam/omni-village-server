const router = require("express").Router();
const files_controller = require("../Controllers/files");
const officer_controller = require("../Controllers/officer");
const {
    verifyToken,
    checkUser,
    verifyModeratorToken,
    checkModerator,
} = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");
// The questionnaire's photos and recordings: one file in the field "file".
const oneFile = require("../Middlewares/upload").oneFile("file");

/**
 * @swagger
 * /files:
 *    post:
 *      tags:
 *        - Files
 *      summary: Upload one photo or one recording, to be put in a photo or audio answer.
 *      description: >
 *        One file per request, at most 4 MB (the host refuses a larger request
 *        itself, and not with JSON - check the size before sending). The
 *        answer then stores the _id returned here; POST /responses/submit
 *        accepts an id only from the villager who uploaded it.
 *        A photo may be JPEG, PNG or WebP; it is turned upright, fitted inside
 *        1600 x 1600 and stored as JPEG without its EXIF, with a 320 px
 *        thumbnail. A recording is told by its first bytes, whatever name and
 *        type it is sent with - MPEG-4 audio (what the app records), MP3,
 *        WAV, Ogg, WebM or AAC - and stored as it came. An upload that no
 *        answer holds a day later is deleted the next time the same person
 *        uploads. One person may add 200 files a day.
 *      consumes:
 *        - multipart/form-data
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: file
 *         in: formData
 *         description: The photo or the recording.
 *         required: true
 *         type: file
 *       - name: kind
 *         in: formData
 *         description: photo or audio
 *         required: true
 *         type: string
 *
 *      responses:
 *        200:
 *          description: The stored file - _id, kind, contentType (decided by the server) and size in bytes.
 *        400:
 *          description: Not a photo or not a recording the app can use, no file in the field "file", or no kind
 *        401:
 *          description: Unauthorized
 *        413:
 *          description: The file is larger than 4 MB
 *        429:
 *          description: This person has already added 200 files in the last day
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/",
    verifyToken,
    checkUser,
    oneFile,
    ControllerWrapper(files_controller.upload_file)
);

/**
 * @swagger
 * /files/officer:
 *    post:
 *      tags:
 *        - Files
 *      summary: A field officer uploads one photo or one recording, for an answer about a village.
 *      description: >
 *        As POST /files, for the officers' questionnaire - the same limits,
 *        the same checks of what the file is, the same 200 files a day (per
 *        officer). The file is uploaded FOR the village named, by an approved
 *        officer that village is assigned to, and POST
 *        /officer/responses/submit accepts its id only in an answer about
 *        that village, from the officer who uploaded it. An upload that no
 *        answer about the village holds a day later is deleted at the next
 *        upload for that village.
 *      consumes:
 *        - multipart/form-data
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: file
 *         in: formData
 *         description: The photo or the recording.
 *         required: true
 *         type: file
 *       - name: kind
 *         in: formData
 *         description: photo or audio
 *         required: true
 *         type: string
 *       - name: village_id
 *         in: formData
 *         description: The village the file is for.
 *         required: true
 *         type: string
 *
 *      responses:
 *        200:
 *          description: The stored file - _id, kind, contentType (decided by the server) and size in bytes.
 *        400:
 *          description: Not a photo or not a recording the app can use, no file in the field "file", no kind, or village_id missing or not an id
 *        401:
 *          description: Unauthorized - not an officer's token
 *        403:
 *          description: The account has not been approved yet, or the village is not assigned to it
 *        413:
 *          description: The file is larger than 4 MB
 *        429:
 *          description: This officer has already added 200 files in the last day
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/officer",
    verifyModeratorToken,
    checkModerator,
    oneFile,
    ControllerWrapper(officer_controller.upload_file)
);

/**
 * @swagger
 * /files/officer/{id}:
 *    get:
 *      tags:
 *        - Files
 *      summary: A field officer reads the bytes of a file.
 *      description: >
 *        An approved officer reads a file they uploaded, and any file that an
 *        answer about a village assigned to them holds - the village may have
 *        been another officer's when it was uploaded. Anything else, and an
 *        id that is no file, is answered 404. Answers a Range header with
 *        206, as GET /files/{id} does.
 *      produces:
 *        - image/jpeg
 *        - audio/mp4
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description: The file id, as returned by POST /files/officer or as stored in an answer.
 *         required: true
 *         type: string
 *       - name: thumb
 *         in: query
 *         description: 1 for the 320 px thumbnail of a photo. A recording has none and is sent itself.
 *         required: false
 *         type: string
 *
 *      responses:
 *        200:
 *          description: The file, with the content type the server gave it.
 *        206:
 *          description: The part a Range header asked for
 *        401:
 *          description: Unauthorized - not an officer's token
 *        403:
 *          description: The account has not been approved yet
 *        404:
 *          description: File not found
 *        416:
 *          description: The Range is outside the file
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/officer/:id",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(officer_controller.get_file)
);

/**
 * @swagger
 * /files/admin/{id}:
 *    get:
 *      tags:
 *        - Files
 *      summary: Dashboard - the bytes of a file that a response holds.
 *      description: >
 *        Allowed through the response holding the file, a villager's or a
 *        field officer's - a super admin reads
 *        any, a regional account those of its own place (the villages inside
 *        it, and a response with no village when its country is that place),
 *        a viewer none. A file that no response holds, one outside the
 *        account's place and an id that is no file are all answered 404.
 *        Sent with the Authorization header like every other request, so a
 *        page fetches it and shows it from memory - an img or audio tag
 *        cannot send that header. Answers a Range header with 206.
 *      produces:
 *        - image/jpeg
 *        - audio/mp4
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description: The file id, as stored in the answer.
 *         required: true
 *         type: string
 *       - name: thumb
 *         in: query
 *         description: 1 for the 320 px thumbnail of a photo. A recording has none and is sent itself.
 *         required: false
 *         type: string
 *
 *      responses:
 *        200:
 *          description: The file, with the content type the server gave it.
 *        206:
 *          description: The part a Range header asked for
 *        401:
 *          description: Please sign in
 *        403:
 *          description: A viewer, or an account with no place
 *        404:
 *          description: File not found
 *        416:
 *          description: The Range is outside the file
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/admin/:id",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(files_controller.get_file_admin)
);

/**
 * @swagger
 * /files/{id}:
 *    get:
 *      tags:
 *        - Files
 *      summary: The bytes of a file the caller uploaded.
 *      description: >
 *        Only the villager who uploaded a file reads it here; anyone else's
 *        file, and an id that is no file, are answered 404. Answers a Range
 *        header with 206 (iOS plays a recording by ranges). The bytes behind
 *        an id never change, so the answer may be cached for good.
 *      produces:
 *        - image/jpeg
 *        - audio/mp4
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description: The file id, as returned by POST /files.
 *         required: true
 *         type: string
 *       - name: thumb
 *         in: query
 *         description: 1 for the 320 px thumbnail of a photo. A recording has none and is sent itself.
 *         required: false
 *         type: string
 *
 *      responses:
 *        200:
 *          description: The file, with the content type the server gave it.
 *        206:
 *          description: The part a Range header asked for
 *        401:
 *          description: Unauthorized
 *        404:
 *          description: File not found
 *        416:
 *          description: The Range is outside the file
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(files_controller.get_file)
);

module.exports = router;
