export default {
  apps: [
    {
      name: 'tulospalvelu-deployment',
      script: './server.mjs',
      env: {
         PALVELIN_SECRET: process.env.PALVELIN_SECRET,
         CLIENT_SECRET: process.env.CLIENT_SECRET,
         PORT: process.env.PORT,
         GIT_BRANCH: process.env.GIT_BRANCH,
      },
    },
  ],
};
