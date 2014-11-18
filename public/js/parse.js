$( document ).ready(function() {
	
	Parse.initialize("jgXQVs1thvNhpHahKqsUFJoySExvSKPhL4UAd8kG", "6htHH0gye9J4edwaO1jMpKor1d1OS3K2qhgYAgiw");

	// Instances
	var Festival = Parse.Object.extend("Festival");
	var Activity = Parse.Object.extend("Activity");

	// Glabal Variables
	var idFestival = "";
	var activities = {};

	// Retrieve the current Festival
	var queryFestival = new Parse.Query(Festival);
	queryFestival.greaterThan("startDate", new Date("April 30, 2014 01:00:00"));

	queryFestival.find({
	  success: function(results) {
	    //alert("Successfully retrieved " + results.length + " festival.");
	    // Do something with the returned Parse.Object values
	    for (var i = 0; i < results.length; i++) { 
	      var object = results[i];
	      idFestival = object.id;
	    }

	    //Retrieve the activities of the current festival
		var queryAct = new Parse.Query(Activity);
		queryAct.include('festivalID');
		queryAct.include('ParticipantsID');
		//queryAct.equalTo("festivalID", idFestival);

		queryAct.find({
		  success: function(results) {
		    //alert("Successfully retrieved " + results.length + " activities.");
		    // Do something with the returned Parse.Object values
		    for (var i = 0; i < results.length; i++) { 

		      activities = results[i];

		   	  if (results[i].get('festivalID').id == idFestival){

		   	  	MakeCellSchedule(results[i]);

		   	  	//Trying to get to work my pointer to the user.... NOT FUCKING WORKING....
		   	  	  var participants = activities.get('ParticipantsID');
		   	  	  console.log(participants);
			      if(participants.length>0){
	                	for (var j=0;j<participants.length;j++){
	                		var participant = participants[j];
	                		//alert(participants[j]);
	                	}
	                }
	            ///

		   	  }	
		    }
		  },
		  error: function(error) {
		    alert("Error: " + error.code + " " + error.message);
		  }
		});

	  },
	  error: function(error) {
	    alert("Error: " + error.code + " " + error.message);
	  }
	});


	


});