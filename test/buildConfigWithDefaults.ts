import { Config, SanitizedConfig } from '../src/config/types';
import { buildConfig as buildPayloadConfig } from '../src/config/build';
import { mongooseAdapter } from '../packages/db-mongodb/src';
import { postgresAdapter } from '../packages/db-postgres/src';

const databaseAdapters = {
  mongoose: mongooseAdapter({
    url: 'mongodb://127.0.0.1/payload',
  }),
  postgres: postgresAdapter({
    url: 'my-url',
  }),
};

export function buildConfigWithDefaults(testConfig?: Partial<Config>): Promise<SanitizedConfig> {
  const [name] = process.argv.slice(2);

  const config: Config = {
    telemetry: false,
    rateLimit: {
      window: 15 * 60 * 100, // 15min default,
      max: 9999999999,
    },
    ...testConfig,
    db: databaseAdapters[process.env.PAYLOAD_DATABASE || 'mongoose'],
  };

  config.admin = {
    autoLogin: process.env.PAYLOAD_PUBLIC_DISABLE_AUTO_LOGIN === 'true' ? false : {
      email: 'dev@payloadcms.com',
      password: 'test',
    },
    ...(config.admin || {}),
    webpack: (webpackConfig) => {
      const existingConfig = typeof testConfig?.admin?.webpack === 'function'
        ? testConfig.admin.webpack(webpackConfig)
        : webpackConfig;
      return {
        ...existingConfig,
        name,
        cache: process.env.NODE_ENV === 'test'
          ? { type: 'memory' }
          : existingConfig.cache,
      };
    },
  };

  if (process.env.PAYLOAD_DISABLE_ADMIN === 'true') {
    if (typeof config.admin !== 'object') config.admin = {};
    config.admin.disable = true;
  }

  return buildPayloadConfig(config);
}