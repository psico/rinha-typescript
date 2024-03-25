const pg = require('pg');

const URL = process.env.DB_URL || "postgres://postgres:12345678@localhost:5432/postgres";

const pool = new pg.Pool({ connectionString: URL,
    max: (Number(process.env.DB_POOL) || 200),
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000
    });

pool.once('connect', () => {
    console.info(`database.js: Connected  to db ${URL}`)
    console.info(`Creating table "pessoas" if not exists`);
    return pool.query(`
        CREATE TABLE IF NOT EXISTS pessoas (
            id uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
            apelido TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            nascimento DATE NOT NULL,
            stack JSON
        );
        `)
});

async function connect() {
    try {
        // logger.info(`Connecting to db ${URL}`);
        await pool.connect();
    } catch(err){
        setTimeout(() => {
            connect();
            // logger.error(`database.js: an error occured when connecting ${err} retrying connection on 3 secs`);
        }, 3000)
    }
}

pool.on('error', connect);


connect();

export const insertPerson = async (id: any, { apelido, nome, nascimento, stack }: any) => {
    const query = `
    INSERT INTO
     pessoas(
        id,
        apelido,
        nome,
        nascimento,
        stack
     )
    VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::json
    )
    `
    return pool.query(query, [id, apelido, nome, nascimento, JSON.stringify(stack)]);
}

export const count = async () => {
    return pool.query(`SELECT COUNT(1) FROM pessoas`);
}
