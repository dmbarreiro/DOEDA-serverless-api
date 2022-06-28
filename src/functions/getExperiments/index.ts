import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'get',
        cors: true,
        path: 'experiments',
        request: {
          parameters: {
            querystrings: {
              'min-run-size': true,
              'test': true,
            }
          },
          // Request body validation, no body in GET
          // schemas: {
          //   'application/json': schema,
          // },
        },
      },
    },
  ],
};
