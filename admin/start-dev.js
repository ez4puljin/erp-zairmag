const { spawn } = require('child_process');
const path = require('path');

const adminDir = __dirname;
const nextCli = path.join(adminDir, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextCli, 'dev', '--port', '3001', '--hostname', '0.0.0.0'], {
  cwd: adminDir,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
