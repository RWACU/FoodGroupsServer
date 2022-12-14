// Table of Contents:
	// line 14	- /get		- Get Groups for User
	// line 42	- /join		- Join Groups with Password
	// line 122	- /create	- Create New Group
	// line	205	- /leave	- Leave Group
	
/* Express/Argon2/Helper Imports */
const express = require('express');
// const argon2 = require('argon2');
const server = require('../helpers/server');
/* Get Router info from express */
const router = express.Router();

/* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ 
/* Using supplied UserID, get all groupIDs and names associated to that ID */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From user_groups for associated userID
	// 2. ENDPOINT			- Send client success response with group information

// Known issues:
	// None

// 0. STARTPOINT
router.post('/get', (request, response) => {
	server.log('Get Groups Startpoint');
	const connection = server.connect();
	response.set({ 'Content-Type': 'application/json' });
	// 1. SELECT
	server.log('Get Groups_select');
	connection.query(`SELECT groupID, groupName FROM \`groups\` WHERE groupID IN (SELECT groupID FROM user_groups WHERE userID=?);`, [request.body.userID], (error, results) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		const groupArr = [];
		results.forEach(result => groupArr.push({groupID: result.groupID, groupName: result.groupName, recipeIDs: []}));
		// 2. ENDPOINT 
		server.log('Get Groups Endpoint');
		server.endRequestSuccess(response, connection, groupArr);
	});
});

/* Join Groups with Password */ /* Join Groups with Password */ /* Join Groups with Password */ /* Join Groups with Password */  
/* If client supplied correct groupName, and password, join that group */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From groups for associated groupName
		//1.1 FAILOUT		- There are no groups with provided name
	// 2. VERIFY			- Use Argon2 to verify if passwords match
		// 2.1 FAILOUT		- Password supplied from client does not match
	// 3. REPLACE			- Into user_groups as user successfully joined group
	// 4. SELECT			- From group_recipes to get recipeIDs associated with group
	// 5. ENDPOINT			- Send client success response with group info and new recipeIDs

// Known issues:
	// None

// 0. STARTPOINT
router.post('/join', (request, response) => {
	server.log('Join Group Startpoint');
	const connection = server.connect();
	response.set({ 'Content-Type': 'application/json' });
	join_select_groups(connection, response, request.body)
});

// 1. SELECT
const join_select_groups = (connection, response, body) => {
	server.log('join_select_groups');
	connection.query(`SELECT * FROM \`groups\` WHERE groupName=?;`, [body.groupName], (error, results) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		if (results.length) {
			join_verify(connection, response, body.groupPass, results[0], body.userID);
		} else {
			// 1.1 FAILOUT
			server.endRequestFailure('No Groups with that name created, feel free to create one!', response, connection);
		}
	});
}

// 2. VERIFY
const join_verify = (connection, response, clientPass, groupInfo, userID) => {
	server.log('join_verify');
	const phpString = `echo password_verify('${clientPass}', '${groupInfo.password}') ? 'true' : 'false';`
	const runner = require('child_process');
	runner.execFile('php', ['-r', phpString], (err, stdout) => {
		if (stdout === 'true') {
			join_replace_usergroups(connection, response, groupInfo, userID);
		} else if (stdout === 'false') {
			server.endRequestFailure('That password is incorrect', response, connection);
		} else {
			server.endRequestFailure(err, response, connection);
		}
	});
}

// 3. REPLACE
const join_replace_usergroups = (connection, response, groupInfo, userID) => {
	server.log('join_replace_usergroups');
	connection.query(`REPLACE INTO user_groups (userID, groupID) VALUES (?, ?);`, [userID, groupInfo.groupID], (error) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		join_select_grouprecipes(connection, response, groupInfo);
	});
}

// 4. SELECT
const join_select_grouprecipes = (connection, response, groupInfo) => {
	server.log('join_select_grouprecipes');
	connection.query(`SELECT * FROM group_recipes WHERE groupID=?;`, [groupInfo.groupID], (error, results) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		const list = [];
		for (const result of results) {	list.push(result.recipeID);	}
		// 5. ENDPOINT
		server.log('Join Group Endpoint');
		server.endRequestSuccess(response, connection, {
			groupID: groupInfo.groupID,
			groupName: groupInfo.groupName,
			recipeIDs: list,
		});
	})
}

/* Create New Group */ /* Create New Group */ /* Create New Group */ /* Create New Group */ /* Create New Group */ 
/* Create a group with client supplied name and password */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From groups to see if groupName is taken
		//1.1 FAILOUT		- Group already exists
	// 2. HASH				- Use Argon2 to create hash for group password
	// 3. INSERT			- Into groups new groupName, and password
	// 4. GET ID			- Get GroupID by leveraging 'LAST_INSERT_ID()'
	// 5. INSERT			- Into user_groups to create association with new group
	// 2. ENDPOINT			- Send client success response with group info

// Known issues:
	// None

// 0. STARTPOINT
router.post('/create', (request, response) => {
	server.log('Create Group Startpoint');
	const connection = server.connect();
	response.set({ 'Content-Type': 'application/json' });
	create_select_groups(connection, response, request.body);
});

// 1. SELECT
const create_select_groups = (connection, response, body) => {
	server.log('create_select_groups');
	connection.query(`SELECT * FROM \`groups\` WHERE groupName=?;`, [body.groupName], (error, results) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		if (results.length > 0) {
			// 1.1 FAILOUT
			server.endRequestFailure('Group name already taken', response, connection);
		} else {
			create_hash(connection, response, body);
		}
	});
}

// 2. HASH
const create_hash = (connection, response, body) => {
	server.log('signup_hash_password');
	const runner = require('child_process');
	const phpString = `echo password_hash('${password}', PASSWORD_DEFAULT);`;
	runner.execFile('php', ['-r', phpString], (err, stdout) => {
		if (!err) { 
			create_insert_groups(connection, response, stdout, body);
		}
	});
}

// 3. INSERT
const create_insert_groups = (connection, response, password, body) => {
	server.log('create_insert_groups');
	connection.query(`INSERT INTO \`groups\` (groupName, groupPass) VALUES (?, ?);`, [body.groupName, password], (error) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		create_id(connection, response, body);
	});
}

// 4. GET ID
const create_id = (connection, response, body) => {
	server.log('create_id');
	connection.query('SELECT LAST_INSERT_ID()', (error, results) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		create_insert_usergroups(connection, response, body, Number(results[0]['LAST_INSERT_ID()']));
	});
}

// 5. INSERT
const create_insert_usergroups = (connection, response, body, groupID) => {
	server.log('create_insert_usergroups');
	connection.query(`INSERT INTO user_groups (userID, groupID) VALUES (?, ?);`, [body.userID, groupID], (error) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		// 6. ENDPOINT
		server.log('Create Group Endpoint');
		server.endRequestSuccess(response, connection, {
			groupID: groupID,
			groupName: body.groupName,
			recipeIDs: [],
		});
	});
}

/* Leave Group *//* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ 
/* Remove association with group for userID */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. DELETE			- From user_groups to see disassociate
	// 2. ENDPOINT			- Send client success response

// Known issues:
	// None

// 0. STARTPOINT
router.post('/leave', (request, response) => {
	server.log('Leave Group Startpoint');
	const connection = server.connect();
	response.set({ 'Content-Type': 'application/json' });	
	// 1. DELETE
	server.log('leave_delete');
	connection.query(`DELETE FROM user_groups WHERE userID=? AND groupID=?;`, [request.body.userID, request.body.groupID], (error) => {
		if (error) { server.endRequestFailure(error, response, connection); return console.error(error); }
		// 2. ENDPOINT
		server.log('Leave Group Endpoint');
		server.endRequestSuccess(response, connection);
	});
});

module.exports = router;