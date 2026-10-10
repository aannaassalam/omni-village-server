/**
 * The two answer types that are files, "photo" and "audio": what counts as
 * one, how large it may be, and everything about them that needs no database.
 *
 * An answer of these types is a list of file ids (Models/answerFiles.js), at
 * most the question's `max` of them. Pure on purpose, like the other rule
 * files, so it is checked without a database or an image library
 * (`node utils/fileKinds.js`). The image work is Controllers/files.js.
 */
const FILE_TYPES = ["photo", "audio"];

// The host refuses a request over about 4.5 MB before this code sees it, and
// its refusal is not JSON. So: under that, and one file per request.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// The most files an admin may let one answer hold (a question's `max`).
const MAX_FILES = 10;

// The most files one person may add in a day: far more than a questionnaire
// asks for. The files share a database with everything else, and one token
// in a loop must not be able to fill it.
const MAX_FILES_PER_DAY = 200;

// How a build of the app says which of these types it can answer.
const ANSWER_TYPES_HEADER = "X-Answer-Types";

const FILE_ID = /^[a-f0-9]{24}$/i;

/**
 * What a recording is, told by its first bytes: the name and the type a
 * sender gives a file prove nothing. null for anything a browser cannot play,
 * AMR (what older Android recorders write) among them.
 */
const audioTypeOf = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    const text = (from, to) => buffer.toString("latin1", from, to);

    // MPEG-4 (.m4a, .mp4): what the app records on both platforms.
    if (text(4, 8) === "ftyp") return "audio/mp4";
    if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE") return "audio/wav";
    if (text(0, 4) === "OggS") return "audio/ogg";
    if (buffer.readUInt32BE(0) === 0x1a45dfa3) return "audio/webm";
    if (text(0, 3) === "ID3") return "audio/mpeg";
    if (buffer[0] === 0xff) {
        // AAC in ADTS frames: an MP3 frame's sync bits, but no layer.
        if (buffer[1] === 0xf1 || buffer[1] === 0xf9) return "audio/aac";
        // An MPEG audio frame: eleven sync bits, then a real version and layer.
        if (
            (buffer[1] & 0xe0) === 0xe0 &&
            (buffer[1] & 0x18) !== 0x08 &&
            (buffer[1] & 0x06) !== 0
        ) {
            return "audio/mpeg";
        }
    }
    return null;
};

/**
 * The part of a file of `length` bytes a `Range` header asks for, as
 * `{ start, end }` with both ends included: "bytes=a-b", "bytes=a-" (to the
 * end) or "bytes=-n" (the last n). iOS plays a recording by ranges.
 *
 * null when the whole file is to be sent: no header, or one that is not a
 * single range of bytes (the standard says to ignore those). `false` when
 * the range is one, but lies outside the file.
 */
const rangeOf = (header, length) => {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || "").trim());
    if (!match) return null;
    const [, from, to] = match;
    if (from === "") {
        if (to === "") return null;
        const last = Number(to);
        return last > 0 && length > 0
            ? { start: Math.max(length - last, 0), end: length - 1 }
            : false;
    }
    const start = Number(from);
    if (to !== "" && Number(to) < start) return null;
    if (start >= length) return false;
    return {
        start,
        end: to === "" ? length - 1 : Math.min(Number(to), length - 1),
    };
};

/**
 * Every file a list of answer snapshots holds, at any depth (in an entry, in
 * an entry of an entry): a Map of file id, in lower case, to the kind of the
 * answer holding it.
 */
const filesIn = (answers, found = new Map()) => {
    (answers || []).forEach((answer) => {
        if (!Array.isArray(answer?.value)) return;
        if (FILE_TYPES.includes(answer.type)) {
            answer.value.forEach((id) =>
                found.set(String(id).toLowerCase(), answer.type)
            );
        } else if (answer.type === "repeatable_group") {
            answer.value.forEach((row) => filesIn(row?.answers, found));
        }
    });
    return found;
};

/** Their ids alone: what a response keeps as `fileIds`. */
const fileIdsIn = (answers) => [...filesIn(answers).keys()];

/**
 * The file types a caller says it can answer, from its `X-Answer-Types`
 * header ("photo,audio"), as a Set. A build older than these types sends no
 * such header and gets an empty one: it is then not asked those questions at
 * all (servedTo in utils/questionTree.js), instead of being asked something
 * it can only answer with "Update the app".
 */
const answerTypesOf = (headerValue) =>
    new Set(
        String(headerValue || "")
            .toLowerCase()
            .split(",")
            .map((type) => type.trim())
            .filter((type) => FILE_TYPES.includes(type))
    );

module.exports = {
    FILE_TYPES,
    MAX_FILE_BYTES,
    MAX_FILES,
    MAX_FILES_PER_DAY,
    ANSWER_TYPES_HEADER,
    FILE_ID,
    audioTypeOf,
    rangeOf,
    filesIn,
    fileIdsIn,
    answerTypesOf,
};

/* Self-check: node utils/fileKinds.js */
if (require.main === module) {
    const assert = require("assert");

    /* ---- recordings, by their first bytes ---- */
    const bytes = (...parts) =>
        Buffer.concat([
            ...parts.map((part) =>
                typeof part === "string" ? Buffer.from(part, "latin1") : Buffer.from(part)
            ),
            Buffer.alloc(16),
        ]);
    assert.strictEqual(audioTypeOf(bytes([0, 0, 0, 0x1c], "ftypM4A ")), "audio/mp4");
    assert.strictEqual(audioTypeOf(bytes([0, 0, 0, 0x18], "ftypmp42")), "audio/mp4");
    assert.strictEqual(audioTypeOf(bytes("ID3", [3, 0, 0])), "audio/mpeg");
    assert.strictEqual(audioTypeOf(bytes([0xff, 0xfb, 0x90, 0x64])), "audio/mpeg");
    assert.strictEqual(audioTypeOf(bytes([0xff, 0xf3, 0x40, 0xc4])), "audio/mpeg");
    assert.strictEqual(audioTypeOf(bytes("RIFF", [0x24, 0, 0, 0], "WAVE")), "audio/wav");
    assert.strictEqual(audioTypeOf(bytes("OggS", [0, 2])), "audio/ogg");
    assert.strictEqual(audioTypeOf(bytes([0x1a, 0x45, 0xdf, 0xa3])), "audio/webm");
    // ADTS has an MP3 frame's first byte: it must not be taken for one.
    assert.strictEqual(audioTypeOf(bytes([0xff, 0xf1, 0x50, 0x80])), "audio/aac");
    assert.strictEqual(audioTypeOf(bytes([0xff, 0xf9, 0x50, 0x80])), "audio/aac");
    // What is refused: AMR, a video in a RIFF, a picture, text, nothing.
    assert.strictEqual(audioTypeOf(bytes("#!AMR\n")), null);
    assert.strictEqual(audioTypeOf(bytes("RIFF", [0x24, 0, 0, 0], "AVI ")), null);
    assert.strictEqual(audioTypeOf(bytes([0xff, 0xd8, 0xff, 0xe0], "\0\x10JFIF")), null);
    assert.strictEqual(audioTypeOf(bytes([0x89], "PNG\r\n")), null);
    assert.strictEqual(audioTypeOf(bytes("just some words")), null);
    assert.strictEqual(audioTypeOf(Buffer.from("ID3")), null);
    assert.strictEqual(audioTypeOf(Buffer.alloc(0)), null);
    assert.strictEqual(audioTypeOf("ID3 as a string, not bytes"), null);
    assert.strictEqual(audioTypeOf(undefined), null);

    /* ---- ranges ---- */
    assert.strictEqual(rangeOf(undefined, 1000), null);
    assert.strictEqual(rangeOf("", 1000), null);
    assert.deepStrictEqual(rangeOf("bytes=0-1", 1000), { start: 0, end: 1 });
    assert.deepStrictEqual(rangeOf("bytes=0-499", 1000), { start: 0, end: 499 });
    assert.deepStrictEqual(rangeOf("bytes=500-", 1000), { start: 500, end: 999 });
    assert.deepStrictEqual(rangeOf("bytes=-200", 1000), { start: 800, end: 999 });
    assert.deepStrictEqual(rangeOf(" bytes=999-999 ", 1000), { start: 999, end: 999 });
    // Past the end is cut to the end; longer than the file is the whole file.
    assert.deepStrictEqual(rangeOf("bytes=900-5000", 1000), { start: 900, end: 999 });
    assert.deepStrictEqual(rangeOf("bytes=-5000", 1000), { start: 0, end: 999 });
    // Outside the file: cannot be satisfied.
    assert.strictEqual(rangeOf("bytes=1000-", 1000), false);
    assert.strictEqual(rangeOf("bytes=1000-1001", 1000), false);
    assert.strictEqual(rangeOf("bytes=-0", 1000), false);
    assert.strictEqual(rangeOf("bytes=0-", 0), false);
    // Not one range of bytes: ignored, and the whole file goes out.
    assert.strictEqual(rangeOf("bytes=5-2", 1000), null);
    assert.strictEqual(rangeOf("bytes=-", 1000), null);
    assert.strictEqual(rangeOf("bytes=0-1,5-6", 1000), null);
    assert.strictEqual(rangeOf("bytes=a-b", 1000), null);
    assert.strictEqual(rangeOf("items=0-1", 1000), null);

    /* ---- the files an answer list holds ---- */
    const a = "66f0a1b2c3d4e5f601234560";
    const b = "66f0a1b2c3d4e5f601234561";
    const c = "66f0a1b2c3d4e5f601234562";
    const d = "66f0a1b2c3d4e5f601234563";
    const answers = [
        { questionId: "q1", type: "photo", value: [a, b.toUpperCase()] },
        // A multi_select's keys look like ids here, and are not files.
        { questionId: "q2", type: "multi_select", value: [d] },
        { questionId: "q3", type: "text", value: d },
        { questionId: "q4", type: "audio", value: null },
        {
            questionId: "g",
            type: "repeatable_group",
            value: [
                {
                    rowId: "r1",
                    answers: [
                        { questionId: "q5", type: "audio", value: [c] },
                        // The same photo again: listed once.
                        { questionId: "q6", type: "photo", value: [a] },
                        {
                            questionId: "g2",
                            type: "repeatable_group",
                            value: [
                                {
                                    rowId: "r2",
                                    answers: [
                                        { questionId: "q7", type: "photo", value: [d] },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                { rowId: "r3", answers: [] },
            ],
        },
    ];
    assert.deepStrictEqual(fileIdsIn(answers), [a, b, c, d]);
    assert.deepStrictEqual(
        [...filesIn(answers)],
        [
            [a, "photo"],
            [b, "photo"],
            [c, "audio"],
            [d, "photo"],
        ]
    );
    assert.deepStrictEqual(fileIdsIn([]), []);
    assert.deepStrictEqual(fileIdsIn(undefined), []);
    // An older response, saved before these types: nothing in it is a file.
    assert.deepStrictEqual(
        fileIdsIn([{ questionId: "q", type: "single_select", value: a }]),
        []
    );

    /* ---- what a build says it can answer ---- */
    assert.deepStrictEqual([...answerTypesOf("photo,audio")], ["photo", "audio"]);
    assert.deepStrictEqual([...answerTypesOf(" Photo , AUDIO ")], ["photo", "audio"]);
    assert.deepStrictEqual([...answerTypesOf("audio")], ["audio"]);
    // Only the file types are a build's to claim; anything else is ignored.
    assert.deepStrictEqual([...answerTypesOf("photo,video,text")], ["photo"]);
    assert.strictEqual(answerTypesOf(undefined).size, 0);
    assert.strictEqual(answerTypesOf("").size, 0);

    assert.strictEqual(MAX_FILE_BYTES, 4194304);
    assert.ok(FILE_ID.test(a) && FILE_ID.test(a.toUpperCase()));
    assert.ok(!FILE_ID.test("uploads/1.png") && !FILE_ID.test(`${a}0`));

    console.log("fileKinds: all checks passed");
}
