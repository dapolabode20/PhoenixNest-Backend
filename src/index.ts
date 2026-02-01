import config from './config/config';
import './config/db';
import app from './app/app';

async function main() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err.name, err.message, err.stack);
    // process.exit(1);
  });

  // Start the server
  const PORT = config.port || 3001;
  app.listen(PORT, () => {
    console.log(`Server running in ${config.environment} mode on port: ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Rejection at:', err.name, err.message, err.stack);
    // Optionally exit the process
    // process.exit(1);
  });
}

main().catch((err) => console.error('Error starting the application:', err));
