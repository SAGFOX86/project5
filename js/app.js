// JavaScript Document (the brains of the app)
var locationData =
[
	{
		name : "Crossroads Church",
		address : "220 George W Liles Pkwy, Concord, NC 28027"
	},
	{
		name : "Poplar Grove Baptist Church",
		address : "3476 Poplar Tent Rd, Concord, NC 28027"
	},
	{
		name : "Harvest Community Church",
		address : "4284 Orphanage Rd, Concord, NC 28027"
	},
	{
		name : "McGill Baptist Church",
		address : "5300 Poplar Tent Rd, Concord, NC 28027"
	},
	{
		name : "Pitts Baptist Church",
		address : "140 Pitts School Rd NW, Concord, NC 28027"
	},
	{
		name : "New Life Baptist Church",
		address : "1281 Biscayne Dr, Concord, NC 28027"
	},
	{
		name : "Southside Baptist Church",
		address : "561 Union Cemetery Rd SW, Concord, NC 28027"
	}
];

var Place = function(data)
{
	var self = this;

	this.name = data.name;
	this.address = data.address;
	this.placeData = data.placeData;
	this.visible = ko.observable(true);
	this.marker = data.marker;
	
	this.info = ko.computed( function()
	{
		var output = '<div class="info-window">';
		output += '<p class="window-name">'+self.name+'</p>';
		output += '<p class="window-address">'+self.address+'</p>';
		output += '</div>';
		return output;
	});
	
};

var MapViewModel = function()
{
	var self = this;
	
	this.neighborhood,
	this.map,
	this.infoWindow,
	this.mapBounds;
	
	this.places = ko.observableArray([]);
	this.currentPlace = ko.observable();
	this.sortedPlaces = ko.computed( function()
	{
		var unsortedPlaces = self.places().slice();
		unsortedPlaces.sort( function(a, b)
		{
			return a.name.localeCompare(b.name);
		});
		return unsortedPlaces;
	});
	
	this.placesListOpen = ko.observable(true);
	this.toggleButtonText = ko.computed( function()
	{
		if (self.placesListOpen())
		{
			return "Hide List";
		}
		else
		{
			return "Show List";
		}
	});
	this.placesListClass = ko.computed( function()
	{
		if (self.placesListOpen())
		{
			return "open";
		}
		else
		{
			return "closed";
		}
	});
	
	this.filterQuery = ko.observable("");
	this.filterWords = ko.computed( function()
	{
		return self.filterQuery().toLowerCase().split(' ');
	});
	
	this.init = function()
	{

		this.neighborhood = new google.maps.LatLng(35.40,-80.60);
		var mapOptions =
		{
			disableDefaultUI : true,
			center : this.neightborhood,
		};
		
		// belew is creating `map` as a new Google Map JS Object and combines to the
		// <div id="map">
		this.map = new google.maps.Map(document.getElementById('map'),mapOptions);
		
		this.loadPlaces();
		
		// adjusts the map bounds
		window.addEventListener('resize', function(e)
		{
			// Makes sure the map boundaries gets updated on page resizing
			self.map.fitBounds(self.mapBounds);
		});

		google.maps.event.addListener(self.infoWindow,'closeclick',function(){
			self.currentPlace(null);
			self.resetCenter();
		});
	};
	
	this.loadPlaces = function()
	{
		self.infoWindow = new google.maps.InfoWindow();
		self.mapBounds = new google.maps.LatLngBounds();
		// creates a Google place search service object.
		var service = new google.maps.places.PlacesService(self.map);
	
		// creates a search object for each location
		locationData.forEach(function(location)
		{
			// here is my search request object
			var request =
			{
				query: location.address
			};
	
			// searches the Google Maps API for location data 
			// runs the callback function with the search results after each search.
			service.textSearch(request, function(results, status)
			{
				if (status == google.maps.places.PlacesServiceStatus.OK)
				{
					self.addPlace(location.name,location.address,results[0]);
				}
			});
		});
	};
	
	this.addPlace = function(name,address,placeData)
	{
		
		// The next lines save location data from the search result object
		var lat = placeData.geometry.location.lat();  // latitude from the place search
		var lon = placeData.geometry.location.lng();  // longitude from the place search

		// marker is an object with additional data about the pin for each location
		var marker = new google.maps.Marker(
		{
			map: self.map,
			position: placeData.geometry.location,
			id: name.toLowerCase().replace(/[^a-zA-Z0-9]/g,'').slice(0,15)
		});
	
		google.maps.event.addListener(marker, 'click', function()
		{
			$('#'+marker.id).trigger('click');
		});
	
		// this is where the pin is added to the map.
		self.mapBounds.extend(new google.maps.LatLng(lat, lon));
		// fits map to the new marker
		self.map.fitBounds(self.mapBounds);
		// centers the map.
		self.resetCenter();
		
		self.places.push( new Place( {
			name : name,
			address : address,
			placeData : placeData,
			visible : ko.observable(true),
			marker : marker
		} ) );
	};
	
	this.displayInfo = function(place)
	{
		self.infoWindow.close();
		// infoWindows are giving more info about the markers
		// on the map. hover or click markers for infoWindow to appear.
		self.infoWindow.setContent(place.info());
		
		self.infoWindow.open(self.map,place.marker);
		
		self.map.panTo(place.marker.position);
	};
	
	this.filterSubmit = function()
	{
		self.filterWords().forEach(function(word)
		{
			self.places().forEach(function(place)
			{
				var name = place.name.toLowerCase();
				var address = place.address.toLowerCase();
				
				if ((name.indexOf(word) === -1) && (address.indexOf(word) === -1))
				{
					place.visible(false);
					place.marker.setMap(null);
				}
				else
				{
					place.visible(true);
					place.marker.setMap(self.map);
				}
			});
		});
		self.filterQuery("");
	};
	
	this.togglePlacesList = function()
	{
		self.placesListOpen(!self.placesListOpen());
	};
	
	this.setCurrentPlace = function(place)
	{
		if (self.currentPlace() !== place)
		{
			self.currentPlace(place);
			self.displayInfo(place);
		}
		else
		{
			self.currentPlace(null);
			self.infoWindow.close();
			self.resetCenter();
		}
	};
	
	this.resetCenter = function()
	{
		self.map.fitBounds(self.mapBounds);
		self.map.panTo(self.mapBounds.getCenter());
	};
	
	this.init();

};

//NYTimes AJAX request goes here
function loadData(){
 var $nytHeaderElem = $('#nytimes-header');
    var $nytElem = $('#nytimes-articles');
    var nytimesUrl = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q=Concord%2CNC&api-key=a400bf2ed23d16e7545072692eb6ac92%3A15%3A72063925' ;

    $.ajax({
    	url: nytimesUrl, 
    	dataType: "json",
    	success:function (data) {

        $nytHeaderElem.text('New York Times Articles About ' + 'Concord,NC')

    articles = data.response.docs;
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        $nytElem.append('<li class="article">' +
            '<a href=" '+article.web_url+'">'+article.headline.main+
        '</a>'+
        '<p>' + article.snippet + '</p>'+'</li>')
    
											  }
								},
error:function(e){
    $nytHeaderElem.text('New York Times Article Could Not Be Loaded!');
    			 },
    return : false,
		  });
}
loadData();

$(ko.applyBindings(new MapViewModel()));
