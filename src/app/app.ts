import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morganBody from 'morgan-body';
import apiRoutes from '../routes';
import { httpStatus } from '../helpers/httpStatus.utils';

const app = express();

// Middleware setup
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging setup
morganBody(app, { immediateReqLog: true });

// Routes
app.use('/api', apiRoutes);

// Sample route
app.get('/', (req: Request, res: Response) => {
  res.status(httpStatus.ok).json({
    name: 'Phoenix Nest Backend',
    status: 'Running',
    description: 'Backend API for Phoenix Nest Application'
  })
});

export default app;