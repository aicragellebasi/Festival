
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var app = express();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
//app.set('festival');
app.locals({
    site: {
        festivalID: '',
        description: '',
    },
});
app.use(express.bodyParser());    // Middleware for reading request body

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/hello', function(req, res) {
  res.render('hello', { message: 'Congrats, you just set up your app!' });
});

// // Example reading from the request query string of an HTTP get request.
// app.get('/test', function(req, res) {
//   // GET http://example.parseapp.com/test?message=hello
//   res.send(req.query.message);
// });

// // Example reading from the request body of an HTTP post request.
// app.post('/test', function(req, res) {
//   // POST http://example.parseapp.com/test (with request body "message=hello")
//   res.send(req.body.message);
// });

	 
	// NOTE: 
	// (new Date()).getTime()-1000 * 60 * 60 * 24 * 90 ===> This is how I calculate the time 3 months from now
	// (new Date()).getTime()-1000 * 60 * 60 * 24 * 180 ===> This is how I calculate the time 6 months from now... etc

function getCurrentFestival(req, res, next){
	var Festival = Parse.Object.extend('Festival');
	var query = new Parse.Query(Festival);
	query.greaterThan("startDate", new Date((new Date()).getTime()-1000 * 60 * 60 * 24 * 90));
	query.first({
		  success: function(festival) { 
		  	app.locals.site.festivalID = festival.id;
			req.festival = festival;
			next();
		  },
		  error: function(error) {
		    next();
		  }
	});
}

/**/
function getFestivalActivities(req, res, next){
	var Festival = Parse.Object.extend('Festival');
	var Activity = Parse.Object.extend('Activity');

	var query = new Parse.Query(Activity);

	// I cannot pass a simple string to the pointer. I need to pass the instance
	var festival = new Festival();
	festival.id = app.locals.site.festivalID;
	query.equalTo("festivalID", festival);
	
	query.find({
		  success: function(activities) {

		  	var movies = [];
		  	var workshops = [];
		  	var debates = [];

		  	for (var i=0; i<activities.length;i++){
		  		var activity = activities[i];
		  	    switch (activity.get('type')){
		  	    	case 1: if (workshops.length<3) workshops.push(activity);
		  	    	break;
		  	    	case 2: if (movies.length<3) movies.push(activity);
		  	    	break;
		  	    	case 3: if (debates.length<3) debates.push(activity);
		  	    	break;
		  	    }
		  	}
			req.activities = activities;
			req.workshops = workshops;
			req.movies = movies;
			req.debates = debates;
			next();
		  },
		  error: function(error) {
		    next();
		  }
		});
}


app.get('/', getCurrentFestival, function(req, res) {
	if (req.festival){ // this req.festival comes from the function getCurrentFestival function
		//console.log('dddd index: '+app.locals.site.festivalID);
		res.render('index', { 
	  		festival: req.festival
	  	});
	}else{
		 console.log("No festival found");
	}
});

app.get('/schedule', getCurrentFestival, function(req, res) {
	if (req.festival){ // this req.festival comes from the function getCurrentFestival function
		console.log('dddd sched no id: '+app.locals.site.festivalID);
		res.redirect('/schedule/'+req.festival.id);
	}else{
		 console.log("No festival found");
	}
});

app.get('/schedule/:id', getCurrentFestival, getFestivalActivities, function(req, res) {
	if (req.festival){ // this req.festival comes from the function getCurrentFestival function
		//console.log('dddd sched ID: '+app.locals.site.festivalID);
		if(req.activities){
			console.log('success function');
			res.render('schedule', {
				festivalID: app.locals.site.festivalID, 
		  		message: 'Over 3 days of festival including worshops, movie screenings and debates.',
		  		workshops: req.workshops,
		  		movies: req.movies,
		  		debates: req.debates
		  	});
		} else {
			console.log('error function');
		}
	}else{
		 console.log("No festival found");
	}
});

// Steps
app.get('/reserve/:id', getCurrentFestival, getFestivalActivities, function(req, res) {

	if (req.festival){
		// Find activities TODO: filter by festival id
		if(req.activities){
			console.log('success resreve function');
			res.render('reservation-form', { 
				message: 'Make your reservation now!',
				actId: req.params.id,
				activities: req.activities, 
			});
		} else {
			console.log('error resreve function');
		}	
	}

	
});

// Process Step 1
app.post('/ajax/processStep1', function(req, res) {
    var query = new Parse.Query(Parse.User);
	query.equalTo("email", req.body.email1);
	query.find({
	  success: function(result) {
	    if (result.length>0){
	    	// Login in existing user retrieved
	    	/* TODO NOT WORKING:.... Gives me error password undifined...*/
	    	Parse.User.logIn(result[0].get('username'), result[0].get('password'), {
			  success: function(userLogged) {
			    res.json({success:true, status:'exists', user: result[0]});
			    console.log('Existing user logged in');
			  },
			  error: function(userLogged, error) {
			    res.json({success:false, status:error.message});
			    console.log('Existing user NOT logged in '+error.message+' PW: '+result[0].get('password')+' Username: '+result[0].get('username'));
			  }
			});
			res.json({success:true, status:'exists', user: result[0]});
	    	//res.json({success:true, status:'exists', user: result[0], activity: activity});
	    }else{
	    	// create new user
	    	console.log('create new user');
	    	var newUser = new Parse.User();
			newUser.set("username", Math.random().toString(36).substr(2, 5));
			newUser.set("password", Math.random().toString(36).substr(2, 5));
			newUser.set("role", [4]);
			newUser.set("email", req.body.email1);
			newUser.signUp(null, {
			  success: function(result) {
			    res.json({success:true, status:'New user created', user: result});
			    console.log('new user created');
			  },
			  error: function(result, error) {
			    // Show the error message somewhere and let the user try again.
			    //alert("Error: " + error.code + " " + error.message);
			    res.json({success:false, status:error.message});
			    console.log('new user NOT created '+error.message);
			  }
			});
	    	
	    	
	    }
	  },
	  error: function(error) {
	    res.json({success:false, status:error.code, message:error.message});;
	  }
	});
});

// Process Step 2
app.post('/ajax/processStep2', function(req, res) {
	//req.body.email1
	//var currentUser = Parse.User.current();
	//console.log('current user: '+ req.body.lname); // REMEMBER aqui creo que no me funcionan los console.log because it is ajax
	
	res.json({success:true, status:'step2'});
});


app.get('/contact', function(req, res) {
  res.render('contact', { 
  	message: 'Rather you want to participate or just ask us a simple question... Fill this form.!',
  	actId: req.params.id 
  });
});

// Attach the Express app to Cloud Code.
app.listen();
