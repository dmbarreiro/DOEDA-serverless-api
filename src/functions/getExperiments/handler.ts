import { S3Client, SelectObjectContentCommand } from '@aws-sdk/client-s3';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema, { queryStringSchema } from './schema';

const getExperiments: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    const queryStringValidation = queryStringSchema.validate(event.queryStringParameters);
    if (queryStringValidation.error) {
      throw new Error('Invalid request')
    }
    let fields = "data.title, data.run_size";
    let limit = 5;
    let page = 0;
    let conditions = [];
    for (const key of Object.keys(queryStringValidation.value)) {
      if (key === 'fields') {
        fields = fields_handler(queryStringValidation.value[key]);
      } else if (key === 'limit') {
        limit = parseInt(queryStringValidation.value.limit);
      } else if (key === 'page') {
        page = parseInt(queryStringValidation.value.page);
      } else if (key === 'max-run-size') {
        conditions.push("data.run_size < " + queryStringValidation.value['max-run-size'])
      } else if (key === 'min-run-size') {
        conditions.push("data.run_size > " + queryStringValidation.value['min-run-size'])
      } else if (key === 'multilevel') {
        conditions.push("data.multilevel = " + queryStringValidation.value['multilevel'])
      } else if (key === 'keywords') {
        for (const keyword of queryStringValidation.value['keywords']) {
          conditions.push(`'${keyword}' IN data.keywords`)
        }
      }
    }
    const string_conditions = conditions.reduce((acc, condition, index) => {
      if (index === 0) {
        return condition;
      }

      return acc + " AND " + condition;
    }, "");

    const sql_filtered_rows = `
      SELECT data.row_number
      FROM S3Object[*][*] as data
      WHERE ${string_conditions};
    `;

    const s3_client = new S3Client({
      region: '...',
      credentials: {
        accessKeyId: '...',
        secretAccessKey: '...',
      }
    });
    const command_filtered_rows_index = new SelectObjectContentCommand({
      Bucket: 'doeda-experiments',
      Key: 'experiments-bundle.json',
      ExpressionType: 'SQL',
      Expression: sql_filtered_rows,
      InputSerialization: {'JSON': {'Type': 'Document'}},
      OutputSerialization: {'JSON': {'RecordDelimiter': ','}},
    });
    const data = await s3_client.send(command_filtered_rows_index);

    // Load stream values in memory
    const chunks = [];
    for await (const value of data.Payload) {
      if (value.Records) {
        chunks.push(value.Records.Payload);
      }
    }
    let payload = Buffer.concat(chunks).toString('utf-8').slice(0, -1);
    const selected_rows_raw = payload ? JSON.parse('[' + payload + ']') : [];
    const filtered_rows_raw = selected_rows_raw
      .filter((_, index) => index >= limit*page)
      .filter((_, index) => index < limit);
    const selected_rows = filtered_rows_raw.length > 0 ?
      filtered_rows_raw.reduce((acc, element, index) => {
        if (index === 0) {
          return `data.row_number = ${element['row_number']}`;
        }
        return acc + ` OR data.row_number = ${element['row_number']}`;
      }, "") :
      null;
    
    if (selected_rows) {
      const sql_query = `
        SELECT ${fields}
        FROM S3Object[*][*] as data
        WHERE ${selected_rows};
      `;
      const command_filtered_rows_data = new SelectObjectContentCommand({
        Bucket: 'doeda-experiments',
        Key: 'experiments-bundle.json',
        ExpressionType: 'SQL',
        Expression: sql_query,
        InputSerialization: {'JSON': {'Type': 'Document'}},
        OutputSerialization: {'JSON': {'RecordDelimiter': ','}},
      });
      const data = await s3_client.send(command_filtered_rows_data);
      // Load stream values in memory
      const chunks = [];
      for await (const value of data.Payload) {
        if (value.Records) {
          chunks.push(value.Records.Payload);
        }
      }
      const payload = Buffer.concat(chunks).toString('utf-8').slice(0, -1);
      return formatJSONResponse({
        data: payload,
      });
    } else {
      return formatJSONResponse({
        data: null,
      });
    }

  } catch (err) {
    if (err) {
      return formatJSONResponse({}, 400);
    } else {
      return formatJSONResponse({}, 500);
    }
  }
};

export const main = middyfy(getExperiments);


const fields_handler = (fields) => {
  if (fields) {
    return fields.reduce((acc, field, index) => {
      if (index === 0) {
        return "data." + field;
      } else {
        return acc + ", data." + field;
      }
    }, "");
  } else {
    return "data.title, data.run_size";
  }
};