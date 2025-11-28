#!/usr/bin/env node

/**
 * Cross-platform script to run both frontend and backend dev servers
 * Works on Windows (PowerShell), Mac, and Linux
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'packages', 'admin-frontend');
const backendDir = path.join(rootDir, 'packages', 'admin-backend');

console.log('🚀 Starting admin panel development servers...\n');

// Start backend
console.log('📦 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

// Start frontend
console.log('🎨 Starting frontend server...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

