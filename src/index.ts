import express from 'express';
import { count, findById, findByTerm, insertPerson } from './database';
const { v4: uuidv4 } = require('uuid');
const cluster = require('cluster');
const process = require('process');

const app = express();
app.use(express.json());

interface RequestBody {
  name: string;
}

app.post('/pessoas', (request, response) => {

  const id = uuidv4();
  
    insertPerson(id, request.body).then(() => {
      response.status(201).location(`/pessoas/${id}`).end();
    }).catch(() => {
      response.status(422).end()
    });

  // const user = request.body as RequestBody;

  // return response.send({
  //   message: `pessoas post`,
  // });
});

app.get('/pessoas/:id', (request, response) => {
  findById(request.params.id).then((queryResult) => {
    
    const [result] = queryResult.rows;
    if (!result) {
        return response.status(404).end();
    }
    response.json(result).end();
  }).catch(() => {
    response.status(404).end();
  })

});

app.get('/pessoas', (request, response) => {
  if (!request.query['t']) {
    return response.status(400).end();
  };

  findByTerm(request.query.t).then((queryResults) => {
    response.json(queryResults.rows).end()
  }).catch(() => {
    response.status(404).end();
  })

});

app.get('/contagem-pessoas', (request, response) => {

  count().then((queryResult) => {
      const [countResult] = queryResult.rows;
      response.json(countResult).end();
  }).catch(() => {
    response.status(422).end();
  })

  // return response.send({
  //   message: `contagem-pessoas`,
  // });
});


// app.listen(process.env.API_PORT, () => console.log(`Listening ${process.env.API_PORT}`));

const numForks = Number(process.env.CLUSTER_WORKERS) || 1;
const TIMEOUT = Number(process.env.REQ_TIMEOUT) || 5000;

if(cluster.isPrimary && process.env.CLUSTER === 'true'){
    console.info(`index.js: Primary ${process.pid} is running`);

    for (let i = 0; i < numForks; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker: any, code: any, signal: any) => {
        console.info(`index.js: worker ${worker.process.pid} died: code ${code} signal ${signal}`);
    });
} else {
    const serverApp = app.listen(process.env.API_PORT, () => {
        console.info(`index.js:${process.pid}:Listening on ${process.env.API_PORT}`);
    });

    if (process.env.USE_TIMEOUT === 'true') {
        serverApp.setTimeout(TIMEOUT)
        console.info(`Starting with timeout as ${TIMEOUT}ms`)

        serverApp.on('timeout', (socket) => {
            console.warn(`Timing out connection`);
            socket.end();
        })
    }
}