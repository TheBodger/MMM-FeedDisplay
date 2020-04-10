var NodeHelper = require("node_helper");

//this.name String The name of the module

//global Var

module.exports = NodeHelper.create({

	start: function () {

		console.log(this.name + ' is started!');
		this.consumerstorage = {}; // contains the config and feedstorage
	},

	setconfig: function (aconfig) {

		//var consumerstorage = {};
		//var config = {};
		//var trackingfeeddates = []; //an array of last date of feed recevied, one for each feed in the feeds index, build from the config
		//var aFeed = { lastFeedDate: '', feedURL: '' };

		var moduleinstance = aconfig.moduleinstance;
		var config = aconfig.config;

		//store a local copy so we dont have keep moving it about

		this.consumerstorage[moduleinstance] = { config: config, feedstorage: {} };

		//console.log(">>>> loaded config for consumer module: " + this.consumerstorage[moduleinstance].config.id)
		//console.log(this.consumerstorage[moduleinstance]);

	},

	processfeeds: function (newfeeds) {

		//console.log(newfeeds);

		var self = this;

		var moduleinstance = newfeeds.moduleinstance; //needed so the correct module knows what to do with this data
		var payload = newfeeds.payload;

		//console.log(">>>>   " + this.consumerstorage[moduleinstance].config.id + " " + payload.title + " " + payload.consumerid + " " + payload.providerid);

		//depending on the config options for this moduleinstance

		//articlemergefeeds: false, //merge all feed details before applying the order type
		//articleordertype: 'default', //options are default, date(same as age), age,
		//articleorder: 'ascending', //options are ascending or descending

		//console.log("@@@@@@@@@@@@@@@@@@@@@");
		//console.log(this.consumerstorage[moduleinstance]);

		//if we are keeping the feeds separate, then we will have to use the provided feed title as a key into the feedstorage
		//otherwise we will use a key of "merged feed"

		switch (this.consumerstorage[moduleinstance].config.articlemergetype.toLowerCase()) {
			case 'merge':
				var feedstorekey = 'merged feed';
				break;
			case 'alternate':
				var feedstorekey = 'alternate feed';
				break;
			default:
				var feedstorekey = payload.title;
		}

		//now we add the provided feeds to the feedstorage
		//assumption is that the provider will NOT send duplicate feeds so we just add them to the end before processing order commands

		var feedstorage = { key: '', sortidx: -1, titles: [], sourcetitles: [], providers: [], articles: [], sortkeys: [] };

		//if not added create a new entry

		//console.log("<><><><><><> " + feedstorekey);

		if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey] == null) {

			var sortkeys = []; // we only use it here, in the else we push direct to the main storage
			var sortidx = -1; // we only use it here, in the else we use the one we store in main storage

			feedstorage.key = feedstorekey;
			feedstorage.titles = [payload.title]; // add the first title we get, which will be many if this is a merged set of feeds
			feedstorage.sourcetitles = [payload.sourcetitle]; // add the first sourcetitle we get, which will be many if this is a merged set of feeds
			feedstorage.providers = [payload.providerid]; // add the first provider we get, whic will be many if there are multiple providers and merged

			//we will have to handle tracking new articles here not in the main module

			payload.payload.forEach(function (article) {

				var sortkey = { key: 0, idx: 0 };

				//add each article and at the same time, depending on how we are sorting this build a key idx pair

				switch (self.consumerstorage[moduleinstance].config.articleordertype.toLowerCase()) {
					case "default": //no sorting  but we need the indexes later
						sortkey.idx = sortidx += 1;
						sortkeys.push(sortkey);
						break;
					case "date": ; //drop through to age as identical processing
					case "age":
						sortkey.key = article.age;
						sortkey.idx = sortidx += 1;
						sortkeys.push(sortkey);
						break;
				}

				article['sentdate'] = new Date(); // used for highlight checking

				console.log("@@@@@@@@@@@@@@@ sourcetitle");
				console.log(payload.sourcetitle);

				if (self.consumerstorage[moduleinstance].config.displaysourcenamelength > 0) { 
					article['source'] = payload.sourcetitle.substring(0, self.consumerstorage[moduleinstance].config.displaysourcenamelength);
				}

				feedstorage.articles.push(article);

			});

			feedstorage.sortkeys = sortkeys;
			feedstorage.sortidx = sortidx;

			this.consumerstorage[moduleinstance].feedstorage[feedstorekey] = feedstorage;

		}
		else { //it exists so just update any data we need to

			//console.log("??????????????? " + feedstorekey);
			//console.log(this.consumerstorage[moduleinstance].feedstorage[feedstorekey]);
			//console.log(this.consumerstorage[moduleinstance].feedstorage[feedstorekey].providers);
			//console.log(this.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles);
			//console.log(this.consumerstorage[moduleinstance].feedstorage[feedstorekey].articles);

			if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey].providers.indexOf(payload.providerid) == -1) {
				this.consumerstorage[moduleinstance].feedstorage[feedstorekey].providers.push(payload.providerid);
			}

			if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles.indexOf(payload.title) == -1) {
				this.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles.push(payload.title);
			}

			//and we know that the actual articles are unique so just add without checking

			var sortidx = self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortidx; //make sure we reference the coorect location in our output

			payload.payload.forEach(function (article) {

				var sortkey = { key: 0, idx: 0 };

				switch (self.consumerstorage[moduleinstance].config.articleordertype.toLowerCase()) {
					case "default": //no sorting but we need the indexes later
						sortkey.idx = sortidx += 1;
						self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortkeys.push(sortkey);
						break;
					case "date": ; //drop through to age as identical processing
					case "age":
						sortkey.key = article.age;
						sortkey.idx = sortidx += 1;
						self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortkeys.push(sortkey);
						break;
				}

				article['sentdate'] = new Date();

				if (self.consumerstorage[moduleinstance].config.displaysourcenamelength > 0) { //show a substring of the title, maybe look for some better meta
					article['source'] = payload.title.substring(0, self.consumerstorage[moduleinstance].config.displaysourcenamelength);
				}

				self.consumerstorage[moduleinstance].feedstorage[feedstorekey].articles.push(article);

			});

			self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortidx = sortidx;

		}

		//console.log(this.consumerstorage[moduleinstance]);

		//now create a payload in the correct order with multple titles if required

		//feedstorage: {
		//	'merged feed': {
		//		key: 'merged feed',
		//		titles: [Array],
		//		providers: [Array],
		//		articles: [Array]
		//	}
		//}

		//articleordertype: 'default', //options are default - fifo, date(same as age), age, - we may want other options such as by provider or alphabetically title or most active feed
		//articleorder: 'ascending', //options are ascending or descending

		//so we have received something new, so we send everything we have back to the consumer instance even if merged

		//return {titles: [Array], articles: [Array]}

		var titles = self.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles;
		var sortkeys = self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortkeys;
		var articles = [];

		switch (this.consumerstorage[moduleinstance].config.articleordertype.toLowerCase()) {
			case "default":
				break;
			case "date": ; //drop through to age as identical processing
			case "age":
				//sort the sort keys, and build a new payload of articles based on the reordered stuff
				//as sorts are in place we need to copy the sort keys 

				//here we use a numeric sort

				//sortkeys.forEach(function (sortkey) {
				//	console.log(sortkey.key, sortkey.idx);
				//});

				//console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")

				if (self.consumerstorage[moduleinstance].config.articleorder.toLowerCase() == 'descending') {
					sortkeys.sort(function (a, b) { return b.key - a.key });
				}
				else {
					sortkeys.sort(function (a, b) { return a.key - b.key });
				}

				//sortkeys.forEach(function (sortkey) {
				//	console.log(sortkey.key, sortkey.idx);
				//});
				
				break;
		}

		//now build the output

		sortkeys.forEach(function (sortkey) {
			//console.log("%%%%%%%%%%%%%%%%%%% ", sortkey.key, sortkey.idx, moduleinstance, feedstorekey, self.consumerstorage[moduleinstance].feedstorage[feedstorekey].articles[sortkey.idx].age);

			articles.push(self.consumerstorage[moduleinstance].feedstorage[feedstorekey].articles[sortkey.idx]); 
		});

		this.sendNotificationToMasterModule("NEW_FEEDS_" + moduleinstance, { feedkey: feedstorekey, payload: { titles: titles, articles: articles } });

	},

	mergearticles: function (articlelist) {

		//determine if the article is present so we only 

	},

	showstatus: function (moduleinstance) {
		console.log("MMM Module: " + this.identifier);
		console.log('============================ start of status ========================================');

		console.log('config for consumer: ' + moduleinstance);

		console.log(this.consumerstorage[moduleinstance].config);

		console.log('============================= end of status =========================================');

	},

	showElapsed: function () {
		endTime = new Date();
		var timeDiff = endTime - startTime; //in ms
		// strip the ms
		timeDiff /= 1000;

		// get seconds 
		var seconds = Math.round(timeDiff);
		return (" " + seconds + " seconds");
	},

	stop: function () {
		//console.log(this.consumerstorage);
		for (var key in this.consumerstorage) {
			//console.log(this.consumerstorage[key])
			for (var id in this.consumerstorage[key].feedstorage) {
				//console.log("K:" + key + " I: " + id);
				//console.log(this.consumerstorage[key].feedstorage[id].providers);
				//console.log(this.consumerstorage[key].feedstorage[id].titles);
				//console.log(this.consumerstorage[key].feedstorage[id].articles);
			}
		}
		console.log("Shutting down node_helper");
		//this.connection.close();
	},

	socketNotificationReceived: function (notification, payload) {
		console.log(this.name + " NODE_HELPER received a socket notification: " + notification + " - Payload: " + payload);

		//we will receive a payload with the consumerid in it so we can store data and respond to the correct instance of
		//the caller - i think that this may be possible!!

		switch (notification) {
			case "CONFIG": this.setconfig(payload); break;
			case "RESET": this.reset(payload); break;
			case "AGGREGATE_THIS":this.processfeeds(payload); break;
			case "STATUS": this.showstatus(payload); break;
		}
	},

	sendNotificationToMasterModule: function(stuff, stuff2){
		this.sendSocketNotification(stuff, stuff2);
	}

});