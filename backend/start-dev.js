const { spawn } = require('child_process');
const path = require('path');

const backendDir = __dirname;
const nestCli = path.join(backendDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');

const child = spawn(process.execPath, [nestCli, 'start', '--watch'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
