import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendPath = path.join(__dirname, 'backend');
const frontendPath = path.join(__dirname, 'frontend');

console.log('\x1b[36m%s\x1b[0m', 'Starting AuraControlPanel...\n');

// Start backend
console.log('\x1b[33m%s\x1b[0m', 'Starting backend on port 4000...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: backendPath,
  shell: true,
  stdio: 'inherit'
});

// Wait a moment, then start frontend
setTimeout(() => {
  console.log('\x1b[33m%s\x1b[0m', '\nStarting frontend on port 3000...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: frontendPath,
    shell: true,
    stdio: 'inherit'
  });

  frontend.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', 'Frontend error:', err);
  });
}, 3000);

backend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Backend error:', err);
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\x1b[31m%s\x1b[0m', 'Shutting down...');
  backend.kill();
  process.exit();
});

console.log('\n\x1b[32m%s\x1b[0m', 'AuraControlPanel services starting:');
console.log('\x1b[36m%s\x1b[0m', '  Backend:  http://localhost:4000');
console.log('\x1b[36m%s\x1b[0m', '  Frontend: http://localhost:3000');
console.log('\x1b[90m%s\x1b[0m', '\nPress Ctrl+C to stop all services\n');
