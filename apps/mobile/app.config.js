const fs = require('node:fs');
const path = require('node:path');

// app.json holds the config; this only adds Android's Firebase file, which push
// notifications need (FCM). On EAS it is the file env var GOOGLE_SERVICES_JSON;
// for a local build, put google-services.json next to this file (git-ignored).
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(path.join(__dirname, 'google-services.json'))
      ? './google-services.json'
      : undefined);

  if (!googleServicesFile) return config;

  return { ...config, android: { ...config.android, googleServicesFile } };
};
