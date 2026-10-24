import { config } from 'dotenv';
import path from 'path';

const apiRoot = path.resolve(__dirname, '../..');

for (const file of ['.env.local', '.env']) {
  config({ path: path.join(apiRoot, file) });
}
