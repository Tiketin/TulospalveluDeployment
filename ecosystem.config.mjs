export default {
  apps: [
    {
      name: 'tulospalvelu-deployment',
      script: './server.mjs',
      node_args: '-r dotenv/config', // <-- Loads your .env automatically
      watch: false,
    },
  ],
};
