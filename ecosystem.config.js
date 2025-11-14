module.exports = {
  apps: [
    {
      name: 'stormbot',
      script: 'npm',
      args: 'run start',
      instances: '1',
      exec_mode: 'cluster',
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '1G',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
