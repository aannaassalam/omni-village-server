const jwt = require("jsonwebtoken");
const Admin = require("../Models/admin");
const AppError = require("../AppError");

// Dashboard accounts (Models/admin). A villager's or officer's token is signed
// with the same secret, so a good signature is not enough: the id inside has
// to be an admin's. A user id finds nothing here and is answered 401.
//
// The account is loaded on every request and nothing but that id is taken
// from the token, so a deleted or demoted account loses access on its next
// call.
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
        const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const admin = await Admin.findById(id).select("-password");
        if (!admin) throw new AppError(0, "Please sign in", 401);
        res.locals.admin = admin;
        next();
    } catch (error) {
        // A missing, malformed, forged or expired token is a JsonWebTokenError,
        // except a JWT header with a non-JSON payload: a SyntaxError from jws.
        // Anything else (the database being unreachable) is passed on as it
        // is: the dashboard signs the account out on a 401, and a server
        // fault must not do that.
        next(
            error instanceof jwt.JsonWebTokenError ||
                error instanceof SyntaxError
                ? new AppError(0, "Please sign in", 401)
                : error
        );
    }
};

// Runs after verifyAdmin: the role is the one on the account it loaded, never
// one claimed by the token or the request. No account at all is a 403 too.
const requireRole =
    (...roles) =>
    (req, res, next) => {
        if (roles.includes(res.locals.admin?.role)) return next();
        next(new AppError(0, "You do not have permission to do this", 403));
    };

module.exports = { verifyAdmin, requireRole };

// Self-check, no database: node Middlewares/admin.js
if (require.main === module) {
    const assert = require("assert");
    process.env.JWT_SECRET_KEY = "self-check";
    const roles = { a: "admin", v: "viewer" };
    Admin.findById = (id) => ({
        select: async () => roles[id] && { role: roles[id] },
    });
    const sign = (id, secret = "self-check") => jwt.sign({ id }, secret);
    // What a route guarded by verifyAdmin + requireRole("admin") answers.
    const status = (token) =>
        new Promise((done) => {
            const req = { headers: { authorization: token } };
            const res = { locals: {} };
            const end = (error) => done(error ? error.statusCode : 200);
            verifyAdmin(req, res, (error) =>
                error ? end(error) : requireRole("admin")(req, res, end)
            );
        });
    (async () => {
        assert.equal(await status(undefined), 401);
        assert.equal(await status("Bearer nonsense"), 401);
        // A JWT header with a payload that is not JSON.
        assert.equal(await status("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bm90IGpzb24.c2ln"), 401);
        assert.equal(await status(`Bearer ${sign("a", "wrong secret")}`), 401);
        // A villager's token: the right secret, but not an admin's id.
        assert.equal(await status(`Bearer ${sign("someone")}`), 401);
        assert.equal(await status(`Bearer ${sign("v")}`), 403);
        assert.equal(await status(`Bearer ${sign("a")}`), 200);
        // A server fault is passed on untouched, not dressed up as a 401.
        Admin.findById = () => {
            throw new Error("database down");
        };
        assert.equal(await status(`Bearer ${sign("a")}`), undefined);
        console.log("Middlewares/admin.js self-check passed");
    })();
}
