process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/maxapi?schema=public";
process.env.APP_RUN_MODE ||= "saas";
process.env.AUTH_SECRET ||= "test-auth-secret-1234567890";
process.env.API_KEY_PEPPER ||= "test-api-key-pepper-1234567890";
process.env.ENABLE_SELF_SIGNUP ||= "false";
process.env.MIN_REQUEST_BALANCE_USD_MICROS ||= "1";
process.env.OPENAI_API_KEY ||= "test-openai-api-key";
process.env.OPENAI_BASE_URL ||= "https://api.openai.com/v1";
