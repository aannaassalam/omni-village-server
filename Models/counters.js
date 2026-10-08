const mongoose = require("mongoose");

/**
 * Named counters. `questionnaireVersion` is raised by one on every publish;
 * a response records the value in force when its page was last saved.
 */
const counterSchema = new mongoose.Schema(
    {
        _id: { type: mongoose.Schema.Types.String },
        seq: { type: mongoose.Schema.Types.Number, default: 1 },
    },
    { timestamps: true }
);

/**
 * Raises the questionnaire's version by one and answers the new value —
 * inside `session` when there is one: every publish writes this document
 * first, so two of them cannot interleave.
 *
 * No counter yet meant "version 1", and every response saved until then is
 * stamped 1, so the first version handed out is 2. ($inc on a document that
 * did not exist counts from 0: the schema default is not applied to a field
 * the update itself sets.)
 */
counterSchema.statics.nextVersion = async function (session) {
    const VERSION = "questionnaireVersion";
    let { seq } = await this.findOneAndUpdate(
        { _id: VERSION },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, session, setDefaultsOnInsert: true }
    ).lean();
    if (seq < 2) {
        seq = 2;
        await this.updateOne({ _id: VERSION }, { $set: { seq } }, { session });
    }
    return seq;
};

module.exports = mongoose.model("counter", counterSchema);
