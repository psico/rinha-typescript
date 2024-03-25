import express from 'express';
import { count, insertPerson } from './database';
const { v4: uuidv4 } = require('uuid');

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

    return response.send({
      message: `pessoas com params`,
    });
  });

app.get('/pessoas', (request, response) => {

  return response.send({
    message: `pessoas`,
  });
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


app.listen(3000, () => console.log('Listening 3000'));