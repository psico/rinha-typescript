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
        CREATE EXTENSION IF NOT EXISTS pg_trgm;

        CREATE OR REPLACE FUNCTION generate_searchable(_nome VARCHAR, _apelido VARCHAR, _stack JSON)
            RETURNS TEXT AS $$
            BEGIN
            RETURN _nome || _apelido || _stack;
            END;
        $$ LANGUAGE plpgsql IMMUTABLE;

        CREATE TABLE IF NOT EXISTS pessoas (
            id uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
            apelido TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            nascimento DATE NOT NULL,
            stack JSON,
            searchable text GENERATED ALWAYS AS (generate_searchable(nome, apelido, stack)) STORED
        );

        CREATE INDEX IF NOT EXISTS idx_pessoas_searchable ON public.pessoas USING gist (searchable public.gist_trgm_ops (siglen='64'));

        CREATE UNIQUE INDEX IF NOT EXISTS pessoas_apelido_index ON public.pessoas USING btree (apelido);
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

export const findById = async (id: any) => {
    const query = `
        SELECT
            id,
            apelido,
            nome,
            to_char(nascimento, 'YYYY-MM-DD') as nascimento,
            stack
        FROM
            pessoas
        WHERE "id" = $1;
    `;

    return pool.query(query, [id]);
}

export const findByTerm = async (term: any) => {
    const query = `
        SELECT
            id,
            apelido,
            nome,
            to_char(nascimento, 'YYYY-MM-DD') as nascimento,
            stack
        FROM
            pessoas
        WHERE
            searchable ILIKE $1
        LIMIT 50
    `;

    return pool.query(query, [`%${term}%`])
}

export const count = async () => {
    return pool.query(`SELECT COUNT(1) FROM pessoas`);
}
