import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morganBody from 'morgan-body';

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging setup
morganBody(app, { immediateReqLog: true });

// Routes
// app.use('/api');

// Sample route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Phoenix Nest Backend',
    status: 'Running',
    description: 'Backend API for Phoenix Nest Application',
    endpoints: {
      users: '/api/users',
      auth: '/api/auth',
      products: '/api/products'
    }
  })
});

export default app;