import * as schema from './schema';
import * as relations from './relations';

export const dbSchema = {
  ...schema,
  ...relations,
};

export { schema, relations };
