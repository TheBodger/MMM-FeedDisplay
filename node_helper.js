/* global Module, MMM-FeedDisplay */

/* Magic Mirror
 * Module: node_helper
 *
 * By Neil Scott
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");

//this.name String The name of the module

//global Var

var isprofanity = require("isprofanity");

//pseudo structures for commonality across all modules
//obtained from a helper file of modules

var LOG = require('../MMM-FeedUtilities/LOG');
var RSS = require('../MMM-FeedUtilities/RSS');
var QUEUE = require('../MMM-FeedUtilities/queueidea');
var UTILITIES = require('../MMM-FeedUtilities/utilities');

module.exports = NodeHelper.create({

	start: function () {

		this.debug = true;

		console.log(this.name + ' is started!');
		this.consumerstorage = {}; // contains the config and feedstorage

		this.currentmoduleinstance = '';
		this.logger = {};

	},

	setconfig: function (aconfig) {

		var moduleinstance = aconfig.moduleinstance;
		var config = aconfig.config;

		//store a local copy so we dont have keep moving it about

		this.consumerstorage[moduleinstance] = { config: config, feedstorage: {} };

		this.alternatefeedorder = (this.consumerstorage[moduleinstance].config.article.mergetype.toLowerCase() == 'alternate'); // get an easier boolean to work with

	},

	categorymatch: function (categories, moduleinstance) {

		//make sure the passed categories are converted to an array and to lower case before match against the config list

		if (this.consumerstorage[moduleinstance].config.article.ignorecategorylist.length == 0) { return false;}

		var categoryarray = categories;

		if (!Array.isArray(categories)) { categoryarray = [categories] };

		categoryarray = categoryarray.map(v => v.toLowerCase())

		return categoryarray.some(v => this.consumerstorage[moduleinstance].config.article.ignorecategorylist.indexOf(v) != -1);

    },

	processfeeds: function (newfeeds) {

		var self = this;

		var moduleinstance = newfeeds.moduleinstance; //needed so the correct module knows what to do with this data
		var payload = newfeeds.payload;

		//depending on the config options for this moduleinstance

		//articlemergefeeds: false,		merge all feed details before applying the order type
		//								alternate - merge by taking alternate articles from each feed(i.e. 1st, 1st, 1st, 2nd, 2nd, 2nd, 3rd, 3rd, 4th), 
		//									will apply sort order before merging 
		//articleordertype: 'default',	//options are default, date(same as age), age,
		//articleorder: 'ascending',	//options are ascending or descending

		//if we are keeping the feeds separate, then we will have to use the provided feed title as a key into the feedstorage
		//otherwise we will use a key of "merged feed"

		switch (this.consumerstorage[moduleinstance].config.article.mergetype.toLowerCase()) {
			case 'merge':
				var feedstorekey = 'merged feed';
				break;
			case 'alternate':
				var feedstorekey = payload.source.title; // uses the same as for default, alternate merging happens after the sort
				break;
			default:
				var feedstorekey = payload.source.title;
		}

		//now we add the provided feeds to the feedstorage
		//assumption is that the provider will NOT send duplicate feeds so we just add them to the end before processing order commands
		//the feedstorage will occur many times if there is no merging
		//and because we are merging feeds here from different providers we need to move the sourceiconclass to the articles

		var feedstorage = { key: '', sortidx: -1, titles: [], sourcetitles: [], providers: [], articles: [], sortkeys: [] };

		//if not added create a new entry

		if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey] == null) {

			var sortkeys = [];	// we only use it here, in the else we push direct to the main storage
			var sortidx = -1;	// we only use it here, in the else we use the one we store in main storage

			feedstorage.key = feedstorekey;
			feedstorage.titles = [payload.title];				// add the first title we get, which will be many if this is a merged set of feeds
			feedstorage.sourcetitles = [payload.sourcetitle];	// add the first sourcetitle we get, which will be many if this is a merged set of feeds
			feedstorage.providers = [payload.providerid];		// add the first provider we get, whic will be many if there are multiple providers and merged

			//we will have to handle tracking new articles here not in the main module

			payload.payload.forEach(function (article) {

				//check to see if we want to drop this article because of a category match

				if (!self.categorymatch(article.categories, moduleinstance)) { //dont do anything with this one if we dont want it

					article['sentdate'] = new Date().getTime(); // used for highlight checking
					article['sourceiconclass'] = (payload.source != null) ? payload.source.sourceiconclass : null;

					var sortkey = { key: 0, idx: 0 };

					//add each article and at the same time, depending on how we are sorting this build a key idx pair

					switch (self.consumerstorage[moduleinstance].config.article.ordertype.toLowerCase()) {
						case "default": //no sorting  but we need the corect indexes later
							sortkey.idx = sortidx += 1;
							sortkeys.push(sortkey);
							break;
						case "date": 
							sortkey.key = article.pubdate;
							sortkey.idx = sortidx += 1;
							sortkeys.push(sortkey);
							break;
						case "age":
							sortkey.key = article.age;
							sortkey.idx = sortidx += 1;
							sortkeys.push(sortkey);
							break;
						case "sent":
							sortkey.key = article.sentdate;
							sortkey.idx = sortidx += 1;
							sortkeys.push(sortkey);
							break;
					}

					if (self.consumerstorage[moduleinstance].config.article.cleanedtext) {
						article.title = self.cleanString(article.title);
						article.description = self.cleanString(article.description);
					}

					if (self.consumerstorage[moduleinstance].config.display.sourcenamelength > 0) { //add the source data if requested
						article.source = article.source.substring(0, self.consumerstorage[moduleinstance].config.display.sourcenamelength);
					}

					feedstorage.articles.push(article);
				}

			});

			feedstorage.sortkeys = sortkeys;
			feedstorage.sortidx = sortidx;

			this.consumerstorage[moduleinstance].feedstorage[feedstorekey] = feedstorage;

		}
		else { //it exists so just update any data we need to

			if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey].providers.indexOf(payload.providerid) == -1) {
				this.consumerstorage[moduleinstance].feedstorage[feedstorekey].providers.push(payload.providerid);
			}

			if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles.indexOf(payload.title) == -1) {
				this.consumerstorage[moduleinstance].feedstorage[feedstorekey].titles.push(payload.title);
			}

			//and we know that the actual articles are unique so just add without checking

			var sortidx = self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortidx; //make sure we reference the correct location in our output

			//check to see if we want to drop this article because of a category match

			payload.payload.forEach(function (article) {

				if (!self.categorymatch(article.categories, moduleinstance)) {

					var sortkey = { key: 0, idx: 0 };

					article['sentdate'] = new Date().getTime();
					article['sourceiconclass'] = (payload.source != null) ? payload.source.sourceiconclass : null;

					sortkey.idx = sortidx += 1;

					switch (self.consumerstorage[moduleinstance].config.article.ordertype.toLowerCase()) {
						case "default": //no sorting but we need the indexes later
							break;
						case "date":
							sortkey.key = article.pubdate;
							break;
						case "age":
							sortkey.key = article.age;
							break;
						case "sent":
							sortkey.key = article.sentdate;
							break;
					}

					if (self.consumerstorage[moduleinstance].config.article.cleanedtext) {
						article.title = self.cleanString(article.title);
						article.description = self.cleanString(article.description);
					}

					if (self.consumerstorage[moduleinstance].config.display.sourcenamelength > 0) {
						article.source = article.source.substring(0, self.consumerstorage[moduleinstance].config.display.sourcenamelength);
					}

					self.consumerstorage[moduleinstance].feedstorage[feedstorekey].articles.push(article);
					self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortkeys.push(sortkey);

				};

			});

			self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortidx = sortidx;

		}

		//now create a payload in the correct order with multpile titles if required

		//feedstorage: {
		//	'merged feed': {
		//		key: 'merged feed',
		//		titles: [Array],
		//		providers: [Array],
		//		articles: [Array]
		//	}
		//}

		//so we have received something new, so we send everything we have back to the consumer instance even if merged

		//we process all the available feedstorages that have been loaded with articles

		var articles = [];
		var titles = [];
		var sourceiconclass = this.consumerstorage[moduleinstance].feedstorage[feedstorekey].sourceiconclass;

		for (var key in self.consumerstorage[moduleinstance].feedstorage) {

			//var titles = self.consumerstorage[moduleinstance].feedstorage[key].titles; //ignore for the time being
			var sortkeys = self.consumerstorage[moduleinstance].feedstorage[key].sortkeys;
			
			switch (this.consumerstorage[moduleinstance].config.article.ordertype.toLowerCase()) {
				case "default":
					break;
				case "date":  
				case "age":		//drop through to age as identical processing
				case "sent":	//drop through to sent as well
								//sort the sort keys, and build a new payload of articles based on the reordered stuff
								//as sorts are in place we need to copy the sort keys 

								//here we use a simple numeric sort because it is age, will need alphabetic solution later

					if (self.consumerstorage[moduleinstance].config.article.order.toLowerCase() == 'descending') {
						sortkeys.sort(function (a, b) { return b.key - a.key });
					}
					else {
						sortkeys.sort(function (a, b) { return a.key - b.key });
					}

					break;
			}

			if (self.alternatefeedorder) {

				self.consumerstorage[moduleinstance].feedstorage[key]['sortedkeys'] = sortkeys;
			}

			else

			//now build the output based on the reordered list of sort items indexes.

			{
				sortkeys.forEach(function (sortkey) {

					articles.push(self.consumerstorage[moduleinstance].feedstorage[key].articles[sortkey.idx]);

				});
			}

		}

		var feedkeys = [];
		var feedkeyidx = 0;

		if (this.alternatefeedorder) {

			//iterate through the stored sortedkeys, keyed by feedkey in a 2 demensional fashion

			//1) get the largest array of articles

			var maxarticleslength = 0

			for (var key in self.consumerstorage[moduleinstance].feedstorage) {
				maxarticleslength = Math.max(maxarticleslength, self.consumerstorage[moduleinstance].feedstorage[key].articles.length);
				feedkeys[feedkeyidx++] = key;
			}

			//2) iterate through the arrays to build an alternated set of data
			//		attempt every entry up to the largest one available
			//		count the number of feeds currently stored using .length of the just stored array of feed keys
			//		get an index at the feed level
			//		check that we actually have a sortidx to use (may have gone past the end of this particular feed array of articles)
			//		then push it to the output article array

			var sortedkeys = []

			for (var lvl1idx = 0; lvl1idx < maxarticleslength; lvl1idx++) {

				for (var lvl2idx = 0; lvl2idx < feedkeys.length; lvl2idx++) {

					var feedkey = feedkeys[lvl2idx];

					sortedkeys = self.consumerstorage[moduleinstance].feedstorage[feedkey].sortedkeys[lvl1idx]

					if (sortedkeys != null) {

						articles.push(self.consumerstorage[moduleinstance].feedstorage[feedkey].articles[sortedkeys.idx]);

					}

				}

			}

		}

		if (self.debug) { self.logger[self.currentmoduleinstance].info("In send articles: " + articles.length); }

		// all data is in correct order so we can send it

		this.sendNotificationToMasterModule("NEW_FEEDS_" + moduleinstance, { payload: { titles: titles, articles: articles } });


		// ========================== clipping ====================================

		//now we have sent all the latest articles, we can apply clipping if it is set

		// we  process the  feed stores as cliping as at this level (not combined level)

		if (this.consumerstorage[moduleinstance].config.article.clipafter > 0 && self.consumerstorage[moduleinstance].feedstorage[key].articles.length > this.consumerstorage[moduleinstance].config.article.clipafter) {

			//keep the first n articles, which need to be sorted into a decent order (use Sent order for random extract which ignores the other dates)

			//the neccessary data is already in place, we just need to resort it, and then apply it to replace all the articles with a clipped list
			//and set the sortidx to point to the last entry we now have

			for (var key in self.consumerstorage[moduleinstance].feedstorage) {

				var sortkeys = self.consumerstorage[moduleinstance].feedstorage[key].sortkeys;
				var articles = [];

				if (self.consumerstorage[moduleinstance].config.article.order.toLowerCase() == 'descending') {
					sortkeys.sort(function (a, b) { return b.key - a.key });
				}
				else {
					sortkeys.sort(function (a, b) { return a.key - b.key });
				}

				//build a temporary sorted list of articles
				//and clear the sortkeys before rebuilding them from the new sorted list

				self.consumerstorage[moduleinstance].feedstorage[key].sortkeys = [];
				var sortkey = { key: 0, idx: 0 };

				for (var idx = 0; idx < this.consumerstorage[moduleinstance].config.article.clipafter; idx++) {

					articles.push(self.consumerstorage[moduleinstance].feedstorage[key].articles[sortkeys[idx].idx]);

					self.consumerstorage[moduleinstance].feedstorage[key].sortkeys.push({ key:sortkeys[idx].key,idx:idx});

				}

				self.consumerstorage[moduleinstance].feedstorage[key].articles = articles;	//overwrite the articles store with the clipped one
				self.consumerstorage[moduleinstance].feedstorage[feedstorekey].sortidx = articles.length - 1; //set to point at the last item loaded

			}

        }

	},

	cleanString: function (theString) {

		return UTILITIES.cleanString(theString);
	},

	mergearticles: function (articlelist) {

		//determine if the article is present so we only 

	},

	showstatus: function (moduleinstance) {
		//console.log("MMM Module: " + moduleinstance);
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
		//console.log(this.name + " NODE_HELPER received a socket notification: " + notification + " - Payload: " + payload);

		//we will receive a payload with the consumerid in it so we can store data and respond to the correct instance of
		//the caller - i think that this may be possible!!

		if (this.logger[payload.moduleinstance] == null) {

			this.logger[payload.moduleinstance] = LOG.createLogger("logfile_" + payload.moduleinstance + ".log", payload.moduleinstance);

		};

		this.currentmoduleinstance = payload.moduleinstance;

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