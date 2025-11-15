// Test MediaConvert connection
const { initializeMediaConvert } = require('./services/awsMediaConvertService');

// Load env vars manually
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

process.env.AWS_REGION = envVars.AWS_REGION;
process.env.AWS_ACCESS_KEY_ID = envVars.AWS_ACCESS_KEY_ID;
process.env.AWS_SECRET_ACCESS_KEY = envVars.AWS_SECRET_ACCESS_KEY;
process.env.AWS_MEDIACONVERT_ROLE = envVars.AWS_MEDIACONVERT_ROLE;
process.env.AWS_S3_BUCKET_NAME = envVars.AWS_S3_BUCKET_NAME;

console.log('Testing MediaConvert connection...');
console.log('Region:', process.env.AWS_REGION);
console.log('Role:', process.env.AWS_MEDIACONVERT_ROLE);

initializeMediaConvert()
  .then(client => {
    console.log('\n✅ MediaConvert OK!');
    console.log('Endpoint:', client.config.endpoint?.hostname || client.config.endpoint);
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
