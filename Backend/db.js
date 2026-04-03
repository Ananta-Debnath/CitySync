const { Pool } = require("pg");
require("dotenv").config();

const USE_NEON = process.env.USE_NEON === 'true';

// Support either a single DATABASE_URL (Neon/managed Postgres) or
// legacy individual DB_* env vars (local Postgres).
const connectionStringRaw = process.env.DATABASE_URL;

// pool options (tune as needed)
const commonPoolOptions = {
    max: parseInt(process.env.PG_MAX_CLIENTS || "10", 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || "10000", 10),
};

// If a raw connection string exists but doesn't include an explicit sslmode
// parameter, append sslmode=verify-full to keep current pg behavior
let connectionString = connectionStringRaw;
if (connectionStringRaw && !/([?&])sslmode=/.test(connectionStringRaw) && !/([?&])uselibpqcompat=/.test(connectionStringRaw)) {
    const sep = connectionStringRaw.includes("?") ? "&" : "?";
    connectionString = `${connectionStringRaw}${sep}sslmode=verify-full`;
}

let pool;
if (USE_NEON && connectionString) {
    pool = new Pool({
        connectionString,
        // For Neon and some managed Postgres providers, rejecting unauthorized
        // can cause failures if the CA isn't available locally. You can set
        // `PG_REJECT_UNAUTHORIZED=false` in `.env` to allow connecting anyway
        // (not recommended for production without proper certs).
        ssl: process.env.PG_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
        ...commonPoolOptions,
    });
} else {
    pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        ...commonPoolOptions,
    });
}

module.exports = pool;
