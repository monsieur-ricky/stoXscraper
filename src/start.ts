import { spawn } from 'child_process';

// Launch Node.js with the --max-http-header-size flag and point to your actual startup file
const server = spawn('node', ['--max-http-header-size=80000', 'main.js'], {
  stdio: 'inherit', // inherit standard IO (stdout, stderr)
  shell: true,
});

// Log any errors
server.on('error', (err) => {
  console.error('Failed to start server:', err);
});
