// init. environment variables
const dotenv = require('dotenv');
dotenv.config();
if (!process.env.PORT) {
	console.error("*****.env file missing! See README.md *****")
} else {
	console.log(`*****ENV PORT: ${process.env.PORT} *****`);
	console.log(`*****ENV NODE_ENV: ${process.env.NODE_ENV} *****`);
}

module.exports = {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	mongo_db_connection_string: process.env.MONGO_DB_CONNECTION_STRING,
	secret_key: process.env.SECRET_KEY,
	sample_ui_username: process.env.SAMPLE_UI_USERNAME,
	sample_ui_password: process.env.SAMPLE_UI_PASSWORD
};