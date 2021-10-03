/* global Module, MMM-FeedDisplay */

/* Magic Mirror
 * Module: MMM-FeedDisplay
 *
 * By Neil Scott
 * MIT Licensed.
 */

/* added support for a videoURL within the RSS feed. Will be displayed if the imageURL is blank and images should be displayed. uses the same formatting rules as images as defined in the config entry for the modeul */

var startTime = new Date(); //use for getting elapsed times during debugging

var feedDisplayPayload = { consumerid: '', providerid: '', payload: '' };

Module.register("MMM-FeedDisplay", {

	// Default module config.
	// WARNING - added 2 layers of config, so make sure you have a display and an article section as parents to the settings
	//in config.js

	defaults: {

		text: "... loading",
		id: "MMFD1", // the unique id of this consumer

		//display details

		display: {

			articleage: false,			//adds the formatted age of the article to the meta details line
			articlecount: 10,			//number of articles to display
			articledescription: false,	//show the article description 
			articletitle: true,			//show the article title
			articlimage: false,			//if an image has been passed as a url, then include it, if missing dont (no nasty missing image /size)
			articlesize: "small",		//determines the size used for cropping when an image is present
										//the crop and imgstyle classes are prepended with the size and held in the MMM-FeedDisplay.css file
										//default if small_crop and small_imgstyle
										//additional sizes are medium and large
									
			clearhilighttime: 10000,	//leave the highlights in place for at least this time period, negating losing highlights as multiple feeds come in
			feedtitle: false,			//TODO display whatever title(s) of the feed has been provided for a group of arcticles above the articles
			firstfulltext: false,		//the top most text only post contains all text
			formatstyle: 'default',		//the format to use for whatever article options to display have been included
										//default - mirror the tweeter format for no image
										//default - mirror the instagram2020 format with an image
										//list - a list in a table of all entries using the other display options to determine 
										//  what details to include, length of details etc. Currently always includes title
										//TODO add alternative formats
			hilightnewarticles: true,	//any never before shown feeds will be hilighted (all initially)
			modulewidth: "32vw",		//constrain the width to this // maybe should go into the css
			refreshtime: 5000,			//5000, refresh the displayed stuff every 5 seconds
			rotationstyle: 'default',	//how to rotate the list of articles on refresh cycle
										//the refresh cycle is reset when new articles are made available
										//default - display the next n articles, where n is the articlecount
										//scroll - move the articles up by 1 at each refresh
			sourcenamelength: 4,		//displays the 1st n characters of the source name on the same line as the age of the item each item, good for merge and alternate
			textbelowimage: true,		//either display the text for an image below it or over it if false
			textlength: 0,				//truncate the title and description each to this length and add ... to show it is truncated
										//default is 0 which means show all, control over showing the title and is elsewhere
										//length constraint is applied after the text is cleaned if requested
			wraparticles: false,		//wrap into / fill all display slots (articlecount) 

	
		},
		article: {

			//article ordered details, define how the aggregator returns the current list of articles

			mergetype: 'none',		// how to merge multiple feeds together
									// none - no merging
									// merge - merge all feed details before applying the order type
									// alternate - merge by taking alternate articles from each feed (i.e. 1st,1st,1st,2nd,2nd,2nd), will apply sort order before merging 
			ordertype: 'default',	//options are 
									//	default - fifo grouped by the title as this is how they are received from the provider
									//	date, - larger numbers are younger so sort descending
									//  age, - smaller number are younger so sort ascending - this is best option for ordering latest post at top of module
									//  sent, - the date/timestamp the article was sent to the main module - to be used with clipping - sort descending for youngest at top
									//  TODO - we may want other options such as by provider or alphabetically title or most active feed
			order: 'ascending',		//options are ascending or descending, so dates (As date/sent youngest at the top = descending, for age, ascending for top )
			clipafter: 0,			//the maximum number of articles in a single feed (this includes the merged one) 
									//	before there is clipping, 
									//  clipping takes place after articles have been displayed at least once 
									//  a value of 0 means no clipping
			cleanedtext: false,		//removes any html tags and (TODO bad-words), leaving just text from title and description
			ignorecategorylist: [], //ignore articles matching any category, full word, in this list i.e. ["horoscopes"]

		},

	},

	// we have to override the default setConfig as we will be merging a deep clone of .display and .article
	setConfig: function (config) {
		this.config = Object.assign({}, this.defaults, config);
		if (config.display != null) { this.config.display = Object.assign({}, this.defaults.display, config.display); }
		if (config.article != null) { this.config.article = Object.assign({}, this.defaults.article, config.article); }

	},

	start: function () {

		Log.log(this.name + ' is started!');

		//this.updateDom(speed)
		//speed Number - Optional.Animation speed in milliseconds.
		//Whenever your module need to be updated, call the updateDom(speed) method.

		var self = this;

		//local variables

		this.displayarticleidx = 0;		// the pointer into the list of articles that the next display cycle will start displaying from
		this.totalarticlecount = 0;		// the total number of articles available for dispaying at the moment
		this.displayarticles = [];		//{title: '', articles: []};  // all the actual articles available for display, grouped by the title

		this.hilightarticletimer = new Date(); // used to wait a specifriced time before removing any hilights from new articles

		this.timer = '', //contains the current display loop timer, used to clear it so we only have one timer running

		feedDisplayPayload.id = this.config.id;
		feedDisplayPayload.payload = "";

		//tell the node helper this config

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance:this.identifier, config: this.config });

		//now we wait for the providers to start ... providing

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

	},

	showElapsed: function () {
		endTime = new Date();
		var timeDiff = endTime - startTime; //in ms
		// strip the ms
		timeDiff /= 1000;

		// get seconds 
		var seconds = Math.round(timeDiff);
		return(" " + seconds + " seconds");
	},

	getScripts: function () {
		return [
			'moment.js',	// this file is available in the vendor folder, so it doesn't need to be available in the module folder.
		]
	},

	// Define required scripts.
	getStyles: function () {
		return [
			'MMM-FeedDisplay.css', 
			'font-awesome.css'
		]
	},
	
	getTranslations: function () {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		}
	},

	notificationReceived: function (notification, payload, sender) {

		var self = this;

		if (sender) {
			Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			Log.log(this.name + " received a system notification: " + notification);
		}

		if (notification == 'ALL_MODULES_STARTED') {
			//build my initial payload for any providers listening to me

			feedDisplayPayload.consumerid = this.config.id;
			feedDisplayPayload.payload = "";
			this.sendNotification('MMM-FeedDisplay_READY_FOR_ACTION', feedDisplayPayload);
			Log.log("ALL MODULES STARTED");
		}

		if (notification == 'FEED_PROVIDER_DATA') {
			//some one said they have data, it might be for me !
			
			if (payload.consumerid == this.config.id) {

				Log.log("Got some new data @ " + this.showElapsed());

				//send the data to the aggregator
				this.sendNotificationToNodeHelper("AGGREGATE_THIS", { moduleinstance: self.identifier, payload :payload});

			}
		}

	},

	getStringTimeDifference: function (ageinmilliseconds) {
		
		var diffSecs = Math.round(ageinmilliseconds / 1000);

		if (diffSecs < 60) { //seconds
			return diffSecs + "s";
		}
		if (diffSecs < (60 * 60)) {//seconds * minutes
			var diffMins = Math.ceil(diffSecs / 60);
			return diffMins + "m";
		}
		if (diffSecs < (60 * 60 * 24)) {//seconds * minutes * hours
			var diffHours = Math.ceil(diffSecs / (60 * 60));
			return diffHours + "h";
		}
		if (diffSecs < (60 * 60 * 24 * 7)) {//seconds * minutes * hours * days
			var diffDays = Math.ceil(diffSecs / (60 * 60 * 24));
			return diffDays + "d";
		}
		if (diffSecs < (60 * 60 * 24 * 30 )) {//seconds * minutes * hours * days in week
			var diffWeeks = Math.ceil(diffSecs / (60 * 60 * 24 * 30));
			return diffWeeks + "w";
		}
		if (diffSecs < (60 * 60 * 24 * 365)) {//seconds * minutes * hours * days in year
			var diffMonths = Math.ceil(diffSecs / (60 * 60 * 24 * 365));
			return diffMonths + "m";
		}
		if (diffSecs >= (60 * 60 * 24 * 366)) {//seconds * minutes * hours * days in year
			var diffYears = Math.ceil(diffSecs / (60 * 60 * 24 * 365));
			return diffYears + "y";
		}
	},

	socketNotificationReceived: function(notification, payload) {
		Log.log(this.identifier + "hello, received a socket notification @ " +  this.showElapsed() + " " + notification + " - Payload: " + payload);

		var self = this;

		//{payload: { titles: titles, payload: articles } }

		if (notification == "NEW_FEEDS_" + this.identifier) {

			//firstly clean up

			this.resetdisplaycycle();

			//here our aggregator tells us we have something to show, he is sending everything every time

			this.displayarticles = payload.payload.articles;

			this.totalarticlecount = this.displayarticles.length;

			this.initiatedisplaycycle();

		}

	},

	resetdisplaycycle: function () { //shuts down the current display cycle and clears any stored data/ pointers / counters used for display purposes only etc

		this.displayarticleidx = 0;
		this.hilightarticletimer = new Date();

		//clear the timer if it exists

		//console.log("clearing the timer");

		if (this.timer != '') {
			clearInterval(this.timer);
		}

	},

	initiatedisplaycycle: function () {//start the display cycle, assumes all variables are reset to default

		var self = this;

		self.buildwrapper();

		self.updateDom(2000); // speed in milliseconds

		this.timer = setInterval(function () {

			//main display loop
			//each cycle adjust the display according to the settings

			self.buildwrapper();

			self.updateDom(1500); // speed in milliseconds

			if (self.config.display.rotationstyle.toLowerCase() == 'default') {
				self.displayarticleidx += self.config.display.articlecount;
			}
			else if (self.config.display.rotationstyle.toLowerCase() == 'scroll'){
				self.displayarticleidx++;
			}

			if (self.displayarticleidx > self.totalarticlecount - 1) {
				self.displayarticleidx = 0;
			}

			self.updateDom(1500); // speed in milliseconds
			
		}, this.config.display.refreshtime); //perform every ? milliseconds.

	},

	// Override dom generator.
	getDom: function () {
		Log.log(this.identifier + " Hello from getdom @" + this.showElapsed());
		var wrapper = document.createElement("div");
		wrapper.innerHTML = this.buildwrapper();
		return wrapper;
	},

	trunctext: function (text, trunclength) {

		if (text == null) { return ""; }

		var textlength = text.length;
		var textsuffix = "";

		if (trunclength > 0) {
			if (trunclength < textlength) {
				textsuffix = "...";
			};
			textlength = trunclength - textsuffix.length;
		}

		return text.substring(0, textlength) + textsuffix;

	},

	colour: function (item, colour) {

		return `<span style='color:${colour}'> ${item} </span>`;

    },

	buildwrapper: function () {

		//articles will have been sorted with the assumption that the youngest article will come in first and should appear at the top
		//so we build as text = newarticle + text

		if (this.totalarticlecount == 0) {
			return '';
		}

		var self = this;

		var trext = '';

		self.config.display.articlesize = self.config.display.articlesize.toLowerCase();

		//pull the articles starting at the current idx for the display count, wrapping if required
		//wrapping is required when the aidx > totalarticlcount 
		//so we need a calculation that will return a pseudo index such that for all values of aidx we point to a valid array item

		var aidx;

		var endidx = this.config.display.articlecount;

		//if wrapping, increase endidx so we always show a set of wrapped articles
		if (self.config.display.wraparticles) {
			endidx = endidx + this.displayarticleidx;
		}
		else { //make sure we dont try and show non existing articles
			endidx = Math.min(endidx + this.displayarticleidx, this.totalarticlecount);
		}

		var altrowclassname = "altrow1";
		var hilightclassname = "";

		if (self.config.display.formatstyle == 'list') { var listtable = document.createElement("table"); listtable.style.border = "thin solid #0000FF"; }

		for (aidx = this.displayarticleidx; aidx < endidx; aidx++) {

			tidx = aidx;

			//if wrapping 		//displaywraparticles: true,

			if (self.config.display.wraparticles) {
				tidx = aidx % this.totalarticlecount;
			}
			//we apply common processes here before hitting the image or text formatting

			if (self.config.display.firstfulltext && aidx == this.displayarticleidx) {
				var temptitle = this.displayarticles[tidx].title;
				var tempdescription = this.displayarticles[tidx].description;
			}
			else {
				var temptitle = this.trunctext(this.displayarticles[tidx].title, self.config.display.textlength)
				var tempdescription = this.trunctext(this.displayarticles[tidx].description, self.config.display.textlength)
			}

			if (self.config.display.formatstyle == 'list') { //use a simple list format

				//build a table entry for each display article controlled by all the various parameters

				if (self.config.display.hilightnewarticles && (new Date() - new Date(this.displayarticles[tidx]['sentdate'])) < self.config.display.clearhilighttime) {
					hilightclassname = " newarticle "  //hilight the title when it is a new feed
				};

				var listrow = document.createElement("tr");

				var listentry = document.createElement("td");
				listentry.style.border = "thin solid #00FFFF";

				if (self.config.display.articlimage && this.displayarticles[tidx].imageURL != null){
					var actualImage = document.createElement('div');
					actualImage.innerHTML = `<img src='${self.displayarticles[tidx].imageURL}' style=width:30px alt=''  />`;
					listentry.appendChild(actualImage);
				} 

				listrow.appendChild(listentry);
				listentry = null;

				var listentry = document.createElement("td");
				listentry.style.border = "thin solid #00FFFF";
				listentry.className = "light smallish maintext " + hilightclassname + altrowclassname;

				listentry.innerHTML = ((this.displayarticles[tidx].sourceiconclass != null) ? `<span class='${this.displayarticles[tidx].sourceiconclass}'></span>` : '') + temptitle;
				if (self.config.display.articledescription) {
					listentry.innerHTML += `<br><span class="light small desctext ${hilightclassname} ${altrowclassname}">${tempdescription}</span>`
				};

				listrow.appendChild(listentry);

				listentry = null;
				var listentry = document.createElement("td")
				listentry.className = 'xsmall bright subtext ' + hilightclassname + altrowclassname;
				listentry.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${(self.config.display.sourcenamelength > 0) ? this.displayarticles[tidx].source.substring(0, self.config.display.sourcenamelength) + ' - ' : ''}${(self.config.display.articleage) ? self.getStringTimeDifference(this.displayarticles[tidx].age + (new Date() - new Date(this.displayarticles[tidx].sentdate))) : ''}`;
				if (listentry.innerHTML != '') { listrow.appendChild(listentry);; } //dont add if empty

				listtable.appendChild(listrow);

				if (altrowclassname == "altrow1") { altrowclassname = "altrow2" } else { altrowclassname = "altrow1" }

			}
			else {

				//added support for videos in place of an img url

				if (self.config.display.articlimage && (this.displayarticles[tidx].imageURL != null || this.displayarticles[tidx].videoURL != null)) { // for image  feeds

					var imageMain = document.createElement('div');
					imageMain.className = 'div_feather';
					imageMain.style = "position:relative";

					//add the image if present
					var actualImage = document.createElement('div');

					if (this.displayarticles[tidx].imageURL != null) {
						actualImage.className = `${self.config.display.articlesize}_crop`;
						actualImage.innerHTML = `<img class='img_feather ${self.config.display.articlesize}_imgstyle' src='${self.displayarticles[tidx].imageURL}' alt=''>`;
					}
					else { //add the video inline
						actualImage.innerHTML = `<video id="RANDOMDSFAASDFJ" class='img_feather ${self.config.display.articlesize}_imgstyle' src='${self.displayarticles[tidx].videoURL.replace(".gifv", ".mp4")}' autoplay='true' muted='muted' loop='loop'></video><script type="text/javascript"> document.getElementById("RANDOMDSFAASDFJ").play();alert("hello")</script>`;
                    }

					Log.log(actualImage.innerHTML);

					imageMain.appendChild(actualImage);

					var newarticleClass = "";

					if (self.config.display.hilightnewarticles && (new Date() - new Date(this.displayarticles[tidx]['sentdate'])) < self.config.display.clearhilighttime) {
						newarticleClass = " newarticle"; //hilight the title when it is a new feed
					};

					var allTextDiv = document.createElement('div');
					allTextDiv.className = (self.config.display.textbelowimage ? `${self.config.display.articlesize}_divtextbelowimg` : 'divtextoverimg') + " txtstyle";

					var titleDiv = document.createElement('div');

					//add the source fontawesome Icon

					//font size Dependant on the artilcesize - small = xsmall, medium = small, large = medium

					var fontclass = 'xsmall';

					if (self.config.display.articlesize == 'medium') { var fontclass = 'small'; }
					else if (self.config.display.articlesize == 'large') { var fontclass = 'medium'; }

					titleDiv.className = fontclass + ' bright' + newarticleClass;
					titleDiv.innerHTML = ((this.displayarticles[tidx].sourceiconclass != null) ? `<span class='${this.displayarticles[tidx].sourceiconclass}'></span>` : '');

					if (self.config.display.articletitle) {
						titleDiv.innerHTML += `${temptitle}`
					};

					if (self.config.display.articledescription) {
						titleDiv.innerHTML += `<br>${tempdescription}`
					};

					var metaSpan = document.createElement('span');
					metaSpan.className = fontclass + ' bright subtext ' + newarticleClass;
					metaSpan.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${(self.config.display.sourcenamelength > 0) ? this.displayarticles[tidx].source.substring(0, self.config.display.sourcenamelength) + ' - ' : ''}${(self.config.display.articleage) ? self.getStringTimeDifference(this.displayarticles[tidx].age + (new Date() - new Date(this.displayarticles[tidx].sentdate))) : ''}`;
					if (metaSpan.innerHTML != '') { titleDiv.appendChild(metaSpan); } //dont add if empty

					allTextDiv.appendChild(titleDiv);

					if (self.config.display.textbelowimage) {

						trext += imageMain.outerHTML;
						trext += allTextDiv.outerHTML;
					}
					else {

						imageMain.appendChild(allTextDiv);
						trext += imageMain.outerHTML;
					}

				}
				else  //format for text only feeds

				{
					var textcontainer = document.createElement("div");
					textcontainer.style = "width:" + this.config.display.modulewidth;

					if (self.config.display.hilightnewarticles && (new Date() - new Date(this.displayarticles[tidx]['sentdate'])) < self.config.display.clearhilighttime) {
						hilightclassname = " newarticle "  //hilight the title when it is a new feed
					};

					var titleDiv = document.createElement("div");
					//add the source fontawesome Icon as well
					titleDiv.className = "light smallish maintext " + hilightclassname + altrowclassname;

					titleDiv.innerHTML = ((this.displayarticles[tidx].sourceiconclass != null) ? `<span class='${this.displayarticles[tidx].sourceiconclass}'></span>` : '') + temptitle;
					if (self.config.display.articledescription) {
						titleDiv.innerHTML += `<br><span class="light small desctext ${hilightclassname} ${altrowclassname}">${tempdescription}</span>`
					};

					var metaSpan = document.createElement('span');
					metaSpan.className = 'xsmall bright subtext ' + hilightclassname + altrowclassname;
					metaSpan.innerHTML = `&nbsp;&nbsp;&nbsp;&nbsp;${(self.config.display.sourcenamelength > 0) ? this.displayarticles[tidx].source.substring(0, self.config.display.sourcenamelength) + ' - ' : ''}${(self.config.display.articleage) ? self.getStringTimeDifference(this.displayarticles[tidx].age + (new Date() - new Date(this.displayarticles[tidx].sentdate))) : ''}`;
					if (metaSpan.innerHTML != '') { titleDiv.appendChild(metaSpan); } //dont add if empty

					textcontainer.appendChild(titleDiv);

					if (altrowclassname == "altrow1") { altrowclassname = "altrow2" } else { altrowclassname = "altrow1" }

					trext += textcontainer.outerHTML;

				}
			}

		}

		if (self.config.display.formatstyle == 'list') {
			trext = listtable.outerHTML;
        }

		return trext;

	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

	doSomeTranslation: function () {
		var timeUntilEnd = moment(event.endDate, "x").fromNow(true);
		this.translate("RUNNING", { "timeUntilEnd": timeUntilEnd });
	},

});

