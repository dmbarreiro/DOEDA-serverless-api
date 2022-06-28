import getExperiments from '@functions/getExperiments';
import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'doeda-serverless-api',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    // iam: {
    //   role: {
    //     statements: [{
    //       Effect: "Allow",
    //       Action: [
    //         "s3:GetObject",
    //       ],
    //       Resource: "arn:aws:s3:::doeda-experiments/*",
    //     }],
    //   },
    // },
  },
  // import the function via paths
  functions: { getExperiments },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;
