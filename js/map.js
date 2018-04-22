/* --- Data --*/
var parisLocations = [
  {
    title: 'Eiffel Tower',
    location: {
      lat: 48.858370,
      lng: 2.294481
    }
  },
  {
    title: 'Louvre Palace',
    location: {
      lat: 48.860611,
      lng: 2.337644
    }
  },
  {
    title: 'Catacombs of Paris',
    location: {
      lat: 48.833832,
      lng: 2.332422
    }
  },
  {
    title: 'Notre-Dame de Paris',
    location: {
      lat: 48.852968,
      lng: 2.349902
    }
  },
  {
    title: 'Arc de Triomphe',
    location: {
      lat: 48.873792,
      lng: 2.295028
    }
  },
  {
    title: 'Jardin des Champs-Élysées',
    location: {
      lat: 48.871691,
      lng: 2.301822
    }
  }
];


/*-- VARIABLES --*/
var map;
var markers = [];
var largeInfowindow;
var bounds;

/*-- Initialize google map --*/
function initMap() {
  // Constructor creates a new map - only center and zoom are required.
  try{
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 48.849051, lng: 2.306217},
      zoom: 13,
      mapTypeControl: false
    });

    largeInfowindow = new google.maps.InfoWindow();
    bounds = new google.maps.LatLngBounds();

    ko.applyBindings(new ItineraryViewModel());

  } catch (error) {
    console.log(error.message);
  }
}

/*-- Model (knockout) --*/
var Itinerary = function(data) {
  var self = this;

  this.title = data.title;
  this.location = data.location;
  this.image = '';
  this.infourl = '';
  this.description = '';

  this.visible = ko.observable(true);

  // Style the markers a bit. This will be our listing marker icon.
  var defaultIcon = makeMarkerIcon('00008b');

  // Create a "highlighted location" marker color for when the user
  // mouses over the marker.
  var highlightedIcon = makeMarkerIcon('eeeee0');

  // Goto wiki to get an image and info
  var wikiUrl = "https://en.wikipedia.org/w/api.php?action=opensearch";
  wikiUrl += '&' + $.param({
    'search': self.title,
    'format':"json",
    'limit':1,
    'callback':"wikiCallBack"
  });

  var wikiImgUrl = "https://en.wikipedia.org/w/api.php?action=query";
  wikiImgUrl += '&' + $.param({
    'format': "json",
    'prop': "pageimages",
    'piprop': "thumbnail",
    'titles': self.title
  });

  var wikiRequestTimeout = setTimeout(function(){
    self.description = "failed to get wikipedia resources";
  }, 8000);


  $.ajax({
    url: wikiUrl,
    dataType: "jsonp",
    //jsonp: "callback",
    success: function( response ) {
      var articleList = response[1];
      self.description = response[2];

      for(var i=0; i<articleList.length; i++) {
        articleStr = articleList[i];
        self.infourl = 'http://en.wikipedia.org/wiki/' + articleStr;
      };

      $.ajax({
        url: wikiImgUrl,
        method: "GET",
        dataType: "jsonp",
        success: function( imgResponse ) {
          for(var i=0; i < 1; i++) {
            //get the pageid of returned image
            var pagesObj = imgResponse.query.pages;
            for(var pageId in pagesObj) {
              if(pagesObj.hasOwnProperty(pageId)) {
                var val = pagesObj[pageId];
                //get url for thumbnail image
                if (imgResponse.query.pages[pageId].hasOwnProperty("thumbnail") === true) {
                  self.image = imgResponse.query.pages[pageId].thumbnail.source;
                } else {
                  self.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Article_icon_cropped.svg/512px-Article_icon_cropped.svg.png";
                }
              }
            }
          }
        }
      }).fail(function() {
        alert("Error found while calling wikipedia for image");
      });; /* END .ajax for img */
      clearTimeout(wikiRequestTimeout);
    }
  }).fail(function() {
    alert("Error found while calling wikipedia for information");
  });


  //Construct what to display
  //in info window when user selects the Place
  //or clicks on the marker
  this.contentString = '<div class="info-window-content">' +
      '<div class="content"><img src="' + self.image +'" class="responsive-img valign"></div>' +
      '<div class="content"><p>' + self.description + '</p></div>' +
      '<div class="content"><a href="' + self.URL +'">' + self.URL + "</a></div>" +
      "</div>";

  this.largeInfowindow = new google.maps.InfoWindow({content: self.contentString});

  // Create a marker per location, and put into markers array.
  this.marker = new google.maps.Marker({
    position: this.location,
    title: this.title,
    animation: google.maps.Animation.DROP,
    icon: defaultIcon
  });

  // this will take care of displaying
  // the markers when its not filtered from list
  self.filterMarkers = ko.computed(function() {
    if(self.visible() == true) {
      self.marker.setMap(map);
      bounds.extend(self.marker.position);
      map.fitBounds(bounds);
    } else {
      self.marker.setMap(null);
    }
  });

  // Two event listeners - one for mouseover, one for mouseout,
  // to change the colors back and forth.
  this.marker.addListener('mouseover', function() {
    this.setIcon(highlightedIcon);
  });
  this.marker.addListener('mouseout', function() {
    this.setIcon(defaultIcon);
  });

  //display info window
  this.marker.addListener('click',function() {
    populateInfoWindow(this, self.image, self.infourl, self.description, largeInfowindow);
    toggleBounce(this);
  });

  this.show = function(location) {
    google.maps.event.trigger(self.marker, 'click');
  };

  this.bounce = function(place) {
    google.maps.event.trigger(self.marker, 'click');
  };

};

/*-- Itinerary View Model (knockout) --*/
var ItineraryViewModel = function() {
  var self = this;

  this.searchItem = ko.observable('');

  this.placesToSeeList = ko.observableArray([]);

  // populate list of locations to be displayed in website's sidebar
  parisLocations.forEach(function(locationItem) {
    self.placesToSeeList.push( new Itinerary(locationItem) );
  });


  // locations viewed on map
  this.itineraryList = ko.computed(function() {
    var searchFilter = self.searchItem().toLowerCase();
    if(searchFilter) {
      return ko.utils.arrayFilter(self.placesToSeeList(), function(location) {
        var str = location.title.toLowerCase();
        var result = str.includes(searchFilter);
        location.visible(result);
        return result;
      });
    }
    self.placesToSeeList().forEach(function(locationItem) {
      locationItem.visible(true);
    });
    return self.placesToSeeList();
  }, self);


};


// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, image, infourl, description, infowindow) {
  // Check to make sure the infowindow is not already opened on this marker.
  if (infowindow.marker != marker) {
    infowindow.marker = marker;
    infowindow.setContent('<div class="info-window-content"><div class="title"><b>' + marker.title + "</b></div>" +
      '<div class="content"><img src="' + image +'" class="responsive-img valign"></div>' +
      '<div class="content"><p>' + description + '</p></div>' +
      '<div class="content"><a href="' + infourl +'" target="_blank">' + infourl + "</a></div>" +
      "</div>");
    infowindow.open(map, marker);
    // Make sure the marker property is cleared if the infowindow is closed.
    infowindow.addListener('closeclick', function() {
      infowindow.marker = null;
    });

  }
}

function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 1400);
  }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
  var markerImage = new google.maps.MarkerImage(
    'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
    '|40|_|%E2%80%A2',
    new google.maps.Size(21, 34),
    new google.maps.Point(0, 0),
    new google.maps.Point(10, 34),
    new google.maps.Size(21,34));
  return markerImage;
}
