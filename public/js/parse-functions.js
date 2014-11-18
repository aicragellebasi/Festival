function MakeCellSchedule(object){

	var $row;
	var idRow;

	if (object.get('type') == 1){
		idRow = 'workshops';
		var $row = $('.workshopsRow').attr('id',idRow);
	} else if (object.get('type') == 2){
		idRow = 'movies';
		var $row = $('.moviesRow').attr('id',idRow);
	} else {
		idRow = 'debates';
		var $row = $('.debatesRow').attr('id',idRow);
	}

  	var aDetailsAct = $('<a>').attr('href', 'details-activity.html&id='+object.id).html(object.get('title'));
  	var h4 = $('<h4>').append(aDetailsAct);

  	var aDetailsUser = $('<a>').attr('href', 'details-participants.html&id=').html('Instructor Name TODO');
  	var pUser = $('<p>').append(aDetailsUser);

  	var date = new Date(object.get('date'));
	var day = date.getDate();
	var month = date.getMonth();
	var hours = date.getHours();

	var am;
	// adjust for timezone
	hours = (hours + 24 + 4) % 24;
	// get am/pm
	am = hours < 12 ? 'AM' : 'PM';
	// convert to 12-hour style
	hours = (hours % 12) || 12;

	  //document.write(year + '-' + month + '-' + day);
  	var pDate = $('<p>').html(month + '/' + day + ' at ' + hours + am );

  	var pDesc = $('<p>').html(object.get('desc'));

  	var btReserve = $('<a>').attr('id',object.id).attr('type','submit').attr('href','http://festival.parseapp.com/activities/'+object.id).html('Reserve');

  	var div = $('<div>').addClass('details').append(h4).append(pUser).append(pDate).append(pDesc).append(btReserve);
  	var td = $('<td>').append(div);
  	$row.append(td);
}