/**
 * AWS MediaConvert Service - Professional Video Processing
 *
 * Handles video transcoding with:
 * - HLS adaptive streaming (240p, 480p, 720p, 1080p)
 * - MP4 progressive download formats
 * - Multiple thumbnail generation
 * - 9:16 aspect ratio optimization (TikTok/Instagram style)
 *
 * Cost estimate: ~$0.015 per minute of video
 */

const {
  MediaConvertClient,
  CreateJobCommand,
  GetJobCommand,
  DescribeEndpointsCommand,
} = require('@aws-sdk/client-mediaconvert');
const { v4: uuidv4 } = require('uuid');

// MediaConvert client will be initialized after getting endpoint
let mediaConvertClient = null;
let mediaConvertEndpoint = null;

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'dinver-restaurant-thumbnails';
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';

/**
 * Initialize MediaConvert client with the account-specific endpoint
 */
async function initializeMediaConvert() {
  if (mediaConvertClient) {
    return mediaConvertClient;
  }

  try {
    // First, get the account-specific MediaConvert endpoint
    const describeClient = new MediaConvertClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const endpointCommand = new DescribeEndpointsCommand({
      MaxResults: 1,
    });

    const endpointResponse = await describeClient.send(endpointCommand);
    mediaConvertEndpoint = endpointResponse.Endpoints[0].Url;

    console.log('MediaConvert endpoint:', mediaConvertEndpoint);

    // Create client with the specific endpoint
    mediaConvertClient = new MediaConvertClient({
      region: AWS_REGION,
      endpoint: mediaConvertEndpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    return mediaConvertClient;
  } catch (error) {
    console.error('Error initializing MediaConvert:', error);
    throw new Error('Failed to initialize MediaConvert: ' + error.message);
  }
}

/**
 * Create a MediaConvert job for Experience video processing
 *
 * Outputs:
 * - HLS adaptive streaming (auto-scales to 240p, 480p, 720p, 1080p based on input)
 * - MP4 formats: 480p and 720p for progressive download
 * - 5 thumbnails at different timestamps
 * - Optimized for 9:16 aspect ratio (vertical video)
 *
 * @param {string} inputStorageKey - S3 key of original video
 * @param {string} experienceId - Experience ID for output path organization
 * @returns {Promise<{jobId: string, outputPrefix: string}>}
 */
async function createVideoTranscodingJob(inputStorageKey, experienceId) {
  try {
    const client = await initializeMediaConvert();

    // Output folder structure: experiences/processed/{experienceId}/
    const outputPrefix = `experiences/processed/${experienceId}/`;
    const outputBaseName = `video_${uuidv4()}`;

    // MediaConvert job settings optimized for TikTok-style vertical videos
    const jobSettings = {
      Role: process.env.AWS_MEDIACONVERT_ROLE, // IAM role with S3 and MediaConvert permissions
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${BUCKET_NAME}/${inputStorageKey}`,
            AudioSelectors: {
              'Audio Selector 1': {
                DefaultSelection: 'DEFAULT',
              },
            },
            VideoSelector: {},
            TimecodeSource: 'ZEROBASED',
          },
        ],
        OutputGroups: [
          // HLS Adaptive Streaming
          {
            Name: 'HLS Group',
            OutputGroupSettings: {
              Type: 'HLS_GROUP_SETTINGS',
              HlsGroupSettings: {
                SegmentLength: 6,
                MinSegmentLength: 0,
                Destination: `s3://${BUCKET_NAME}/${outputPrefix}hls/${outputBaseName}`,
                SegmentControl: 'SEGMENTED_FILES',
                ManifestDurationFormat: 'INTEGER',
                StreamInfResolution: 'INCLUDE',
                ClientCache: 'ENABLED',
                CaptionLanguageSetting: 'OMIT',
                ManifestCompression: 'NONE',
                CodecSpecification: 'RFC_4281',
                OutputSelection: 'MANIFESTS_AND_SEGMENTS',
                TimedMetadataId3Period: 10,
                TimedMetadataId3Frame: 'PRIV',
                TimestampDeltaMilliseconds: 0,
              },
            },
            Outputs: [
              // 240p
              {
                NameModifier: '_240p',
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                  },
                },
                VideoDescription: {
                  Width: 426,
                  Height: 240,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 400000,
                      MaxBitrate: 400000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                      },
                      CodecProfile: 'MAIN',
                      CodecLevel: 'LEVEL_3',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 64000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 44100,
                      },
                    },
                  },
                ],
              },
              // 480p
              {
                NameModifier: '_480p',
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                  },
                },
                VideoDescription: {
                  Width: 854,
                  Height: 480,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 1500000,
                      MaxBitrate: 1500000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'MAIN',
                      CodecLevel: 'LEVEL_3_1',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
              // 720p
              {
                NameModifier: '_720p',
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                  },
                },
                VideoDescription: {
                  Width: 1280,
                  Height: 720,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 3000000,
                      MaxBitrate: 3000000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'HIGH',
                      CodecLevel: 'LEVEL_4',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 128000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
              // 1080p (only if source is high quality)
              {
                NameModifier: '_1080p',
                ContainerSettings: {
                  Container: 'M3U8',
                  M3u8Settings: {
                    AudioFramesPerPes: 4,
                    PcrControl: 'PCR_EVERY_PES_PACKET',
                    PmtPid: 480,
                    PrivateMetadataPid: 503,
                    ProgramNumber: 1,
                    PatInterval: 0,
                    PmtInterval: 0,
                    VideoPid: 481,
                    AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
                  },
                },
                VideoDescription: {
                  Width: 1920,
                  Height: 1080,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 5000000,
                      MaxBitrate: 5000000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 9,
                      },
                      CodecProfile: 'HIGH',
                      CodecLevel: 'LEVEL_4_1',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 192000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
            ],
          },
          // MP4 Progressive Download (480p and 720p)
          {
            Name: 'MP4 Progressive',
            OutputGroupSettings: {
              Type: 'FILE_GROUP_SETTINGS',
              FileGroupSettings: {
                Destination: `s3://${BUCKET_NAME}/${outputPrefix}mp4/`,
              },
            },
            Outputs: [
              // MP4 480p
              {
                NameModifier: '_480p',
                Extension: 'mp4',
                ContainerSettings: {
                  Container: 'MP4',
                  Mp4Settings: {
                    CslgAtom: 'INCLUDE',
                    FreeSpaceBox: 'EXCLUDE',
                    MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                  },
                },
                VideoDescription: {
                  Width: 854,
                  Height: 480,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 1500000,
                      MaxBitrate: 1500000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'MAIN',
                      CodecLevel: 'LEVEL_3_1',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
              // MP4 720p
              {
                NameModifier: '_720p',
                Extension: 'mp4',
                ContainerSettings: {
                  Container: 'MP4',
                  Mp4Settings: {
                    CslgAtom: 'INCLUDE',
                    FreeSpaceBox: 'EXCLUDE',
                    MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                  },
                },
                VideoDescription: {
                  Width: 1280,
                  Height: 720,
                  ScalingBehavior: 'DEFAULT',
                  TimecodeInsertion: 'DISABLED',
                  AntiAlias: 'ENABLED',
                  Sharpness: 50,
                  CodecSettings: {
                    Codec: 'H_264',
                    H264Settings: {
                      InterlaceMode: 'PROGRESSIVE',
                      ParNumerator: 1,
                      ParDenominator: 1,
                      NumberReferenceFrames: 3,
                      Syntax: 'DEFAULT',
                      GopClosedCadence: 1,
                      GopSize: 2,
                      GopSizeUnits: 'SECONDS',
                      HrdBufferSize: 3000000,
                      MaxBitrate: 3000000,
                      RateControlMode: 'QVBR',
                      QualityTuningLevel: 'SINGLE_PASS_HQ',
                      QvbrSettings: {
                        QvbrQualityLevel: 8,
                      },
                      CodecProfile: 'HIGH',
                      CodecLevel: 'LEVEL_4',
                      SceneChangeDetect: 'ENABLED',
                      SlowPal: 'DISABLED',
                      Softness: 0,
                      FramerateControl: 'INITIALIZE_FROM_SOURCE',
                      FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: {
                        Bitrate: 128000,
                        CodingMode: 'CODING_MODE_2_0',
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
            ],
          },
          // Thumbnails
          {
            Name: 'Thumbnails',
            OutputGroupSettings: {
              Type: 'FILE_GROUP_SETTINGS',
              FileGroupSettings: {
                Destination: `s3://${BUCKET_NAME}/${outputPrefix}thumbnails/`,
              },
            },
            Outputs: [
              {
                NameModifier: '_thumb',
                Extension: 'jpg',
                ContainerSettings: {
                  Container: 'RAW',
                },
                VideoDescription: {
                  Width: 405,
                  Height: 720,
                  ScalingBehavior: 'DEFAULT',
                  CodecSettings: {
                    Codec: 'FRAME_CAPTURE',
                    FrameCaptureSettings: {
                      FramerateNumerator: 1,
                      FramerateDenominator: 5, // 1 frame every 5 seconds
                      MaxCaptures: 5, // 5 thumbnails total
                      Quality: 85,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      AccelerationSettings: {
        Mode: 'DISABLED', // Can enable for faster processing at extra cost
      },
      StatusUpdateInterval: 'SECONDS_60',
      Priority: 0,
    };

    const command = new CreateJobCommand(jobSettings);
    const response = await client.send(command);

    console.log('MediaConvert job created:', response.Job.Id);

    return {
      jobId: response.Job.Id,
      jobStatus: response.Job.Status,
      outputPrefix,
    };
  } catch (error) {
    console.error('Error creating MediaConvert job:', error);
    throw new Error('Failed to create video transcoding job: ' + error.message);
  }
}

/**
 * Get the status of a MediaConvert job
 *
 * @param {string} jobId - MediaConvert job ID
 * @returns {Promise<Object>} Job status details
 */
async function getJobStatus(jobId) {
  try {
    const client = await initializeMediaConvert();

    const command = new GetJobCommand({ Id: jobId });
    const response = await client.send(command);

    const job = response.Job;

    return {
      jobId: job.Id,
      status: job.Status, // SUBMITTED, PROGRESSING, COMPLETE, CANCELED, ERROR
      percentComplete: job.JobPercentComplete || 0,
      createdAt: job.CreatedAt,
      startedAt: job.Timing?.StartTime,
      finishedAt: job.Timing?.FinishTime,
      errorMessage: job.ErrorMessage || null,
      outputGroupDetails: job.OutputGroupDetails || [],
    };
  } catch (error) {
    console.error('Error getting MediaConvert job status:', error);
    throw new Error('Failed to get job status: ' + error.message);
  }
}

/**
 * Parse MediaConvert output URLs from job details
 *
 * @param {Object} jobDetails - Job details from getJobStatus
 * @param {string} cloudFrontDomain - Optional CloudFront domain
 * @returns {Object} Organized output URLs
 */
function parseJobOutputs(jobDetails, cloudFrontDomain = null) {
  const outputs = {
    hls: {
      masterPlaylist: null,
      variants: {},
    },
    mp4: {},
    thumbnails: [],
  };

  if (!jobDetails.outputGroupDetails) {
    return outputs;
  }

  jobDetails.outputGroupDetails.forEach((group) => {
    if (group.OutputDetails) {
      group.OutputDetails.forEach((output) => {
        if (output.OutputFilePaths && output.OutputFilePaths.length > 0) {
          const s3Path = output.OutputFilePaths[0];
          const url = cloudFrontDomain
            ? s3Path.replace(`s3://${BUCKET_NAME}/`, `https://${cloudFrontDomain}/`)
            : s3Path.replace(`s3://${BUCKET_NAME}/`, `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/`);

          // Categorize outputs
          if (s3Path.includes('/hls/')) {
            if (s3Path.endsWith('.m3u8')) {
              if (!s3Path.includes('_240p') && !s3Path.includes('_480p') && !s3Path.includes('_720p') && !s3Path.includes('_1080p')) {
                outputs.hls.masterPlaylist = url;
              } else if (s3Path.includes('_240p')) {
                outputs.hls.variants['240p'] = url;
              } else if (s3Path.includes('_480p')) {
                outputs.hls.variants['480p'] = url;
              } else if (s3Path.includes('_720p')) {
                outputs.hls.variants['720p'] = url;
              } else if (s3Path.includes('_1080p')) {
                outputs.hls.variants['1080p'] = url;
              }
            }
          } else if (s3Path.includes('/mp4/')) {
            if (s3Path.includes('_480p')) {
              outputs.mp4['480p'] = url;
            } else if (s3Path.includes('_720p')) {
              outputs.mp4['720p'] = url;
            }
          } else if (s3Path.includes('/thumbnails/') && s3Path.endsWith('.jpg')) {
            outputs.thumbnails.push(url);
          }
        }
      });
    }
  });

  return outputs;
}

module.exports = {
  initializeMediaConvert,
  createVideoTranscodingJob,
  getJobStatus,
  parseJobOutputs,
};
