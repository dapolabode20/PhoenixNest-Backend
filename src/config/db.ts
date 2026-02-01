import mongoose from 'mongoose';
import config from './config';

const url: string = config.dbUrl;

mongoose
  .connect(url)
  .then(() => {
    console.log('DB connected...');
  })
  .catch((err) => {
    console.log('Error connecting DB!!', err.name, err.message);
  });

export default mongoose.connection;
