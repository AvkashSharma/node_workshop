const port = 3001

const path = require('path')

const session = require('express-session')

// import built-in Node packages
const express = require('express'); // import express
const server = express();
const body_parser = require('body-parser');
const oauth_sign = require('oauth-sign')
const axios = require('axios')
const request = require('request')
const qs = require('querystring')

server.use(body_parser.json()); // parse JSON (application/json content-type)
server.use(body_parser.urlencoded()) // parse HTML form data

server.set('view engine', 'ejs')

// expose static assets: CSS, JS files, images
server.use(express.static(__dirname + '/public'));

// session
server.use(session({
	secret: 'MY_SECRET_1234',
	resave: false,
	saveUninitialized: true
 }))

// STEP 1
const request_url = `https://api.twitter.com/oauth/request_token`
// STEP 3
const access_token_url = 'https://api.twitter.com/oauth/access_token'

// STEP 4 - Possible requests
// user info
const show_user_url = 'https://api.twitter.com/1.1/users/show.json'
const show_user_timeline_url = 'https://api.twitter.com/1.1/statuses/user_timeline.json'

const consumer_key = '8ZWnKZhuS6PGbGhizrGFVOy54'
const consumer_secret = 'WhDUjBtypCVfhEUt5T5Wp9T875JfEqjcFfGKKKc5S05MJScg0v'
// const request_token_callback = encodeURIComponent('http://localhost:3001/callback')
// const request_token_callback = encodeURIComponent('https://8c2545a5.ngrok.io/callback')

// const request_token_callback = 'https://8c2545a5.ngrok.io/callback'
const request_token_callback = 'http://localhost:3001/callback'

function cacheSet(key, value, req) {
	server.set(key, value);

	// save in session
	if (!req.session[key]) {
		req.session[key] = {}
	}

	req.session[key] = value
}

function cacheGet(key, req) {
	return (req.session[key] || server.get(key))
}

server.get("/", (req, res) => {
	res.render('step1')
})

server.get("/embeds", (req, res) => {
	res.render('embeds')
})

server.get("/ui", (req, res) => {
	// same as /user
	const access_token = cacheGet('access_token', req)
	const access_token_secret = cacheGet('access_token_secret' , req)
	const screen_name = cacheGet('screen_name', req)
	const user_id = cacheGet('user_id', req)
	const access_token_available_message = cacheGet('access_token_available_message', req)

	const authorized_user_creds = {
		name: "User credentials for making requests",
		access_token,
		access_token_secret,
		screen_name,
		user_id,
	}

	res.render('ui', {
		// authorized_user_creds: JSON.stringify(authorized_user_creds)
		authorized_user_creds: JSON.stringify(authorized_user_creds)
	})
	// res.sendFile(__dirname + '/index.html');
	// res.sendFile(path.join(__dirname, '/public', 'index.html'))
})


/**
 * STEP 1: POST oauth/request_token
 * create a request for an app to obtain a request token
 * result: oauth_token
 */

/**
 * WIP: manually generating the POST data for oauth
 * 😢 CANT MAKE THIS WORK YET
 */
function getAuthRequestString() {
	const crypto = require('crypto');
	// let nonce = crypto.randomBytes(16).toString('base64');
	let nonce = crypto.randomBytes(16).toString('hex'); // so only a-f,0-9

	const encoded_callback = encodeURIComponent(request_token_callback)

	const timestamp = Date.now()

	// const signature = oauth_sign.hmacsign('POST', request_url,
	// 	{
	// 		oauth_callback: encoded_callback,
	// 		oauth_consumer_key: consumer_key,
	// 		oauth_nonce: nonce,
	// 		oauth_signature: 'HMAC-SHA1',
	// 		oauth_timestamp: timestamp,
	// 		oauth_version: '1.0'
	// 	},
	// 	consumer_secret)

	const signature = oauth_sign.sign(
		"HMAC-SHA1",
		'POST',
		request_url,
		{
			oauth_callback: request_token_callback,
			oauth_consumer_key: consumer_key,
			oauth_nonce: nonce,
			oauth_signature_method: "HMAC-SHA1",
			oauth_timestamp: "${timestamp}",
			oauth_version: "1.0"
		},
		consumer_secret)

	const encoded_signature = encodeURIComponent(signature)

	const string = `OAuth oauth_callback="${encoded_callback}",oauth_consumer_key="${consumer_key}",oauth_nonce="${nonce}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${timestamp}",oauth_version="1.0",oauth_signature="${encoded_signature}"`

	// const string = `OAuth oauth_nonce="${nonce}", oauth_callback="${callback}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_consumer_key="${consumer_key}", oauth_signature="${signature}", oauth_version = "1.0"`

	return string
}
server.get("/request_token", (req, res) => {
	const authString = getAuthRequestString()

	console.log(authString)

	const headers = {
		// 'Content-Type': 'application/json',
		// 'Content-Type': 'application/x-www-form-urlencoded',
		Authorization: authString
	}

	axios.post(request_url, {}, {
		headers: headers
	})
		.then((response) => {
			// console.log("RESPONSE:", response)
			res.json({
				message: response
			})
		})
		.catch((error) => {
			// console.log("ERROR: ", error)
			res.json({
				error: error
			})
		})

})

/**
 * uses request's built-in OAuth1 signing, etc
 * ✅ wORKS FOR STEP 1
 */
server.get("/request_token_2", (req, res) => {
	const access_token = cacheGet('access_token', req)
	const access_token_secret = cacheGet('access_token_secret', req)
	// const screen_name = server.get('screen_name')
	// const user_id = server.get('user_id')

	if (access_token && access_token_secret) {
		console.log("CACHE exists for access_token && access_token_secret 🎉. Skip STEP 1,2,3. Go straight to API request")

		res.redirect('/user')

		cacheSet('access_token_available_message', "Access token still good 👍🏽👍🏽👍🏽", req)

		return
	}

	// if cached oauth_token and oauth_token_secret
	const oauth_token = cacheGet('oauth_token', req)
	const oauth_token_secret = cacheGet('oauth_token_secret', req)

	if (oauth_token && oauth_token_secret) {
		console.log("CACHE exists for oauth_token && oauth_token_secret 🎉. Skip STEP 1")

		res.render('step2', {
			// message: JSON.stringify(req_data),
			message: "Request token still good 👍🏽",
			redirect_url: `https://api.twitter.com/oauth/authorize?${oauth_token}`
		})

		return
	}

	const oauth_step_1_data = {
		callback: request_token_callback,
		consumer_key: consumer_key,
		consumer_secret: consumer_secret
	}

	console.log("Oauth step 1 data:", oauth_step_1_data)

	request.post({ url: request_url, oauth: oauth_step_1_data }, function (e, r, body) {
		if (e) {
			res.json({
				message: 'step1 failed',
				error: e
			})
		} else {
			const req_data = qs.parse(body)
			console.log(req_data.oauth_token)

			const oauth_token = qs.stringify({
				oauth_token: req_data.oauth_token
			})

			// CACHE these in server
			cacheSet('oauth_token', req_data.oauth_token, req)
			cacheSet('oauth_token_secret', req_data.oauth_token_secret, req)

			res.render('step2', {
				message: JSON.stringify(req_data),
				redirect_url: `https://api.twitter.com/oauth/authorize?${oauth_token}`
			})

			/*
				{"message":{"oauth_token":"ou1bcQAAAAABEanCAAABch18gx0","oauth_token_secret":"DGsdECfCMwFtaFmXFPSjXB2BWH2MNaCU","oauth_callback_confirmed":"true"}}
			*/
		}
	})
})


/**
 * STEP 2: GET oauth/authorize
 * User authenticates via a sign-in button on Twitter
 * and redirects to callback_url 
 * The app then sends request token from step 1
 * 
 */
server.get("/callback", (req, res) => {
	console.log("params from Step 2 callback", req.query)

	const { oauth_token, oauth_verifier } = req.query;

	// this oauth_token should be same with token we got before
	if (oauth_token !== cacheGet('oauth_token', req)) {
		res.json({
			error: 'oauth_token from step 2 not same with step 1'
		})
	} else {
		// TODO: get oauth_token and oauth_verifier from query string
		// res.json({
		// 	"message": req.query
		// })
		exchangeRequestTokenToAccessToken({ oauth_token, oauth_verifier, req, res })
	}

	/*
	{"message":{"oauth_token":"E0fX8QAAAAABEanCAAABch6inzI","oauth_verifier":"cGgjOcVeu7dtK6nAE0PUv3IXezX5VmkU"}}
	*/
})

/**
 * STEP 3: POST oauth/access_token
 * exchange request token into an access token
 */
function exchangeRequestTokenToAccessToken({
	oauth_token, oauth_verifier, req, res
}) {
	/*
	this one fails =(
		curl -X POST --header 'Authorization: OAuth oauth_consumer_key=8ZWnKZhuS6PGbGhizrGFVOy54 oauth_token=E0fX8QAAAAABEanCAAABch6inzI oauth_verifier=cGgjOcVeu7dtK6nA
		E0PUv3IXezX5VmkU' -v https://api.twitter.com/oauth/access_token
	*/

	/*
	shortcut: http://localhost:3001/callback?oauth_token=E0fX8QAAAAABEanCAAABch6inzI&oauth_verifier=cGgjOcVeu7dtK6nAE0PUv3IXezX5VmkU
	*/

	console.log("POST: exchange oauth_token for access_token")

	request.post({
		url: access_token_url,
		oauth: {
			consumer_key: consumer_key,
			consumer_secret: consumer_secret,
			token: oauth_token,
			token_secret: cacheGet('oauth_token_secret', req),
			verifier: oauth_verifier
		}
	}, function (e, r, body) {
		if (e) {
			res.json({
				message: 'step3 failed',
				error: e
			})
		} else {
			const req_data = qs.parse(body)

			// CACHE user's access_token and authorization details
			cacheSet('access_token', req_data.oauth_token, req)
			cacheSet('access_token_secret', req_data.oauth_token_secret, req)
			cacheSet('screen_name', req_data.screen_name, req)
			cacheSet('user_id', req_data.user_id, req)

			// showUserPageWithDetails(req_data, res);

			res.redirect("/user");
			/*
			{"message":{"oauth_token":"1261716580687400966-TNhdJG6XDCfJmty0tw6QYGEq420zQA","oauth_token_secret":"6mKaJKXUfQRiIYu7vyzz1eJIeMXVB0mWulGWb9j1FDQ8X","user_id":"1261716580687400966","screen_name":"TheBotofLenny1"}}
			*/

			// res.json({
			// 	message: req_data
			// })

		}
	})
}

// STEP 4 - Make a request! ==============
server.get('/user', (req, res) => {
	// GET STUFF FROM "cache"
	const access_token = cacheGet('access_token', req)
	const access_token_secret = cacheGet('access_token_secret', req)
	const screen_name = cacheGet('screen_name', req)
	const user_id = cacheGet('user_id', req)
	const access_token_available_message = cacheGet('access_token_available_message', req)

	const user_details = {
		access_token,
		access_token_secret,
		screen_name,
		user_id,
	}

	requestWithAccessToken(user_details, show_user_url).then(
		user_info => {
			res.render('user', {
				user_info: user_info,
				additional_message: access_token_available_message
			})
		}
	).catch(e => {
		res.json({
			message: `Error in request on ${show_user_url}`,
			error: e
		})
	})
})

function requestWithAccessToken(user_details, request_url) {
	return new Promise((resolve, reject) => {
		const {
			access_token,
			access_token_secret,
			screen_name,
			user_id
		} = user_details

		console.log("Request using access token")

		request.get({
			url: request_url,
			oauth: {
				consumer_key: consumer_key,
				consumer_secret: consumer_secret,
				token: access_token,
				token_secret: access_token_secret
			},
			qs: {
				screen_name: screen_name,
				user_id: user_id
			},
			json: true,
		}, function (e, r, result) {
			if (e) {
				reject(e)
			} else {
				// request-lib might have the errors here
				if (result.errors) {
					reject(result.errors)
				} else {
					// console.log(result)
					// TODO: render user info in a page
					resolve(result)
				}
			}

		})
	})
}

server.listen(port, () => { // Callback function in ES6
	console.log(`Server listening at ${port}`);
});
