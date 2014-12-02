
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var app = express();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine

//This is how I set up global variables. I am not using description. TODO check it and eventually take it out.
app.locals({
    site: {
        festivalID: '',
        description: '',
    },
});
app.use(express.bodyParser());    // Middleware for reading request body

// This is how I extend the Activity with a dinamical field for checking availability of seats. 
// Ref: http://backbonejs.org/#Model-defaults
var Activity = Parse.Object.extend('Activity', {
	defaults:{
		isFull: false
	},
	setFull: function (value){
		this.isFull = value;
	},
	getFull: function(){
		return this.isFull;
	}
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
	//var Activity = Parse.Object.extend('Activity');

	var query = new Parse.Query(Activity);

	// I include the Staff to retrieve instrutors, speakers etc...
	query.include('staffID');

	// and the room to check availibilty of seats
	query.include('roomID');

	// I cannot pass a simple string to the pointer. I need to pass the instance
	var festival = new Festival();
	festival.id = app.locals.site.festivalID;

	query.equalTo("festivalID", festival);

	//Order the activities by ascending date 
	query.ascending("date");
	
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

app.get('/', getCurrentFestival, getFestivalActivities, function(req, res) {
	if (req.festival){ // this req.festival comes from the function getCurrentFestival function
		//console.log('dddd index: '+app.locals.site.festivalID);
		if(req.activities){
			res.render('index', { 
		  		festival: req.festival,
		  		workshops: req.workshops,
		  		movies: req.movies,
		  		debates: req.debates
		  	});
		} else {
			console.log("No activities found");
		}
	}else{
		 console.log("No festival found");
	}
});

app.get('/schedule', getCurrentFestival, function(req, res) {
	if (req.festival){ // this req.festival comes from the function getCurrentFestival function
		//console.log('dddd sched no id: '+app.locals.site.festivalID);
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

	if (req.festival){ // success retrieving current fest
		if(req.activities){ // success retrieving current fest activities

			// check seats availability
			var seats;
			var totalParticipants;
			var soldOut;

			for (var i=0; i<req.activities.length; i++){
				var activity = req.activities[i];
				seats = activity.get('roomID').get('seats');
				totalParticipants = activity.get('ParticipantsID').length;
				if (totalParticipants>=seats){ soldOut = true; } else { soldOut = false; }
				activity.setFull(soldOut); // .setfull comes from where I extend Activity
				//console.log('result: '+activity.getFull());
			}
			
			res.render('reservation-form', { 
				message: 'Make your reservation now!',
				actId: req.params.id,
				activities: req.activities,
				soldOut: soldOut, 
			});
		} else {
			console.log('error reserve function');
		}	
	}

	
});

// Process Step 1
app.post('/ajax/processStep1', function(req, res) {
    var Participant = Parse.Object.extend('Participant');
    var participant = new Parse.Query(Participant);

	participant.equalTo("email", req.body.email1);
	participant.find({
	  success: function(participant) {
	    if (participant.length>0){
			res.json({success:true, status:'exists', participant: participant[0]});
	    	//res.json({success:true, status:'exists', user: result[0], activity: activity});
	    }else{
	    	// save new participant
	    	console.log('saving new participant...');
	    	var newParticipant = new Participant();
	    	newParticipant.set("email", req.body.email1);
			
			newParticipant.save(null, {
			  success: function(participant) {
			    res.json({success:true, status:'New participant created', participant: participant});
			    console.log('new participant created');
			  },
			  error: function(participant, error) {
			    // Show the error message somewhere and let the user try again.
			    //alert("Error: " + error.code + " " + error.message);
			    res.json({success:false, status:error.message});
			    console.log('new participant NOT created '+error.message);
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

	console.log('updating participant...'+req.body.participantId);
	console.log('with activity: '+req.body.activity);

	//var Activity = Parse.Object.extend('Activity');
	var query = new Parse.Query(Activity);

	query.get(req.body.activity,{
		success: function(activity){

			console.log('retrieved activity selected: '+activity.get("title"));

			var Participant = Parse.Object.extend('Participant');
			var participant = new Participant();
			participant.set("objectId",req.body.participantId);
			participant.set("fname", req.body.fname);
			participant.set("lname", req.body.lname);
			
			participant.save(null, {
			  success: function(participant) {

			  	// 
			  	var participant2add = activity.get("ParticipantsID");
			  	participant.id = req.body.participantId;

			  	console.log('TEST: '+participant2add);
			  	console.log('TEST: '+participant2add.length);

			  	//Here I need to check if the participant is already registered to this activity.
			  	var registered;
			  	for (var i=0; i<participant2add.length; i++){
			  		//console.log('participants ID already registered: '+participant2add[i].id);
			  		if( participant2add[i].id == req.body.participantId){
			  			//res.json({success:false, status:'You are already registered to this activity'});
			  			//console.log('participants already registered: '+participant2add[i].id);
			  			registered = true;
			  		} else {
			  			registered = false;
			  		}
			  	}

			  	if (!registered){
			  		participant2add.push(participant);

				  	//var act2update = new Activity();
				  	
				  	//act2update.id = activity.id;


				  	var updateQuery = new Parse.Query(Activity);
				  	updateQuery.get(activity.id,{
				  		success: function(act2update){
					  	act2update.set("ParticipantsID",participant2add);
					  	act2update.save(null,{
					  		success: function(activityUpdated){
					  			res.json({success:true, status:'step3', activityTitle: activityUpdated.get('title'), activityDate: activityUpdated.get('date'), participant: participant});
					    		console.log('participant and activity updated');
					    		console.log('activity updated ID: '+activityUpdated.id );
					  		},
					  		error: function(activityUpdated, error){
					  			res.json({success:false, status:error.status, message: error.message});
					    		console.log('activity NOT updated'+error.message);
					  		}
					  	});
					  },
					  error: function(){

					  }
					 });


				  } else {
				  		res.json({success:false, status:'', message: 'Participant already registered: '});
				  		console.log('Participant already registered');
				  }

			  	

			    //res.json({success:true, status:'step3'});
			    //console.log('participant updated');
			  },
			  error: function(participant, error) {
			    // Show the error message somewhere and let the user try again.
			    //alert("Error: " + error.code + " " + error.message);
			    res.json({success:false, status:error.message});
			    console.log('participant NOT updated '+error.message);
			  }
			});

			
			
		},
		error: function(activity, error){
			res.json({success:false, status:error.message});
			console.log('no activity retrieved');
		}
	})
});

app.get('/staff', function(req, res) {

	var query = new Parse.Query(Parse.User);
	query.find({
	  success: function(results) {

		console.log("Successfully retrieved " + results.length + " staff members.");
		res.render('staff', { 
		  	message: '',
		  	staffs: results,
		  });
	    
	  },
	  error: function(error) {
	    console.log('failure retrieving staff members');
		res.render('staff', { 
		  	message: error.message,
		  });
	  }
	});
});

app.get('/staff/:id', function(req, res) {

	var query = new Parse.Query(Parse.User);
	query.equalTo("objectId", req.params.id);
	query.first({
	  success: function(result) {
	  	// Define user role and showing it in human worlds! :)
		var roles = result.get('role');
		var role;
		for (var i=0; i<roles.length; i++){
			role = roles[i];
			switch (role){
	  	    	case 1: role='Instructor'; break;
	  	    	case 2: role='Filmmaker'; break;
	  	    	case 3: role='Speaker'; break;
	  	    }
		}
		res.render('staff-bio', { 
		  	message: 'staff',
		  	user: result, 
		  	role: role,
		  }); 
	  },
	  error: function(error) {
	    console.log('failure retrieving staff');
		res.render('staff-bio', { 
		  	message: error.message,
		  });
	  }
	});
});


app.get('/contact', function(req, res) {
  res.render('contact', { 
  	message: 'Rather you want to participate or just ask us a simple question... Fill this form.!',
  	actId: req.params.id 
  });
});

// Attach the Express app to Cloud Code.
app.listen();
