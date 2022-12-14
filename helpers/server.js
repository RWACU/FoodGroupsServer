// MySQL import
const mysql = require('mysql');
// Environment Variables
// require('dotenv').config();

// Connection information - Change here when Server changes
const db_config = {
	host     	: 'localhost',
	port		: 3306,
	user     	: 'Ryan',
	password 	: '$whJk_0Gy7t-',
	database 	: 'Tables'
}

const connect = () => {
	return mysql.createConnection(db_config);
}

// Sends response to client with success response and optional payload
const endRequestSuccess = (response, connection = null, payload = null) => {
	console.log('Ending:\t\tSuccess');
	response.json({
		response: 'success',
		payload: payload,
	});
	connection ? connection.end() : '';
}

// Sends response to client with failure response and message about the failure
const endRequestFailure = (msg, response, connection = null) => {
	console.log('Ending:\t\tFailure');
	response.json({
		response: 'failure',
		msg: msg,
	});
	connection ? connection.end() : '';
}

// Log the step currently running in, does not display specific user data
const log = (step) => { 
	console.log(`Running:\t${step}`);
}

exports.connect				= connect;
exports.endRequestSuccess	= endRequestSuccess;
exports.endRequestFailure	= endRequestFailure;
exports.log					= log;