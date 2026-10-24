import '../config/load-env';
import { DataSource, DataSourceOptions } from 'typeorm';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD must be set explicitly in production');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  username: process.env.DB_USERNAME || 'pharmacy_user',
  password: process.env.DB_PASSWORD || 'pharmacy_password_2026',
  database: process.env.DB_DATABASE || 'pharmacy_db',
  charset: 'utf8mb4_unicode_ci',
  timezone: '+05:30',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
