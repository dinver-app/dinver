const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Deleted ${key} from S3`);
  } catch (error) {
    console.error(`Failed to delete ${key} from S3`, error);
  }
};

module.exports = { deleteFromS3 };
