# MMM-FeedDisplay Module

This magic mirror module is the MMM-FeedDisplay module that is part of the MMM-Feedxxx interrelated modules.

For an overview of how the MMM-Feedxxx interrelated modules work read the MMM-Feedxxx overview below.

This module receives feeds from providers, aggregates them and then formats them for display on the magic mirror. There can be multiple MMM-FeedDisplays active receiving feeds from 1 or many providers.

### Example
![Example of MMM-FeedDisplay output](images/screenshot.png?raw=true "Example screenshot")

This example includes 4 FeedDisplay modules:

1) Top Left, reddit images
2) Top Right, twitter and RSS text only feeds
3) Bottom left, Instagram Images
4) Bottom right, RSS images

To enable this there are 5 Provider modules:
1) Twitter
2) RSS Text only feeds (news)
3) RSS Image feeds
4) Reddit
5) Instagram

### Dependencies

Before installing this module, use https://github.com/TheBodger/MMM-FeedUtilities to setup the MMM-Feed... dependencies and  install all modules 

The following node modules are required: 

```
moment
isprofanity //will be used in the future

```

## Installation
To install the module, use your terminal to:
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-FeedDisplay`

## Using the module

### MagicMirror² Configuration

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
		{
			module: "MMM-FeedDisplay",
			position: "top_right",
			config: {
				id: "MMFD3",
				text: "Loading ...",
				article: {
					mergetype: 'alternate',
					ordertype: 'age',
					order: 'ascending',
					ignorecategorylist: ['horoscopes'],
				},
				display: {
					articlimage: false,
					refreshtime: 10000,
					articlecount: 10,
					rotationstyle: 'scroll',
					modulewidth: "20vw",
					sourcenamelength: 20,
					textbelowimage: true,
					articleage: true,
					articledescription: true,
					wraparticles: true,
				},
			},
		},

```

### Configuration Options

| Option                  | Details
|------------------------ |--------------
| `text`                | *Optional* - Will be displayed on the magic mirror until the first feed has been received and prepared for display <br><br> **Possible values:** Any string.<br> **Default value:** The Module name
| `id`         | *Required* - The unique ID of this consumer module. This ID must match exactly (CaSe) the consumerids in the provider modules. <br><br> **Possible values:** any unique string<br> **Default value:** none
| `article`            |*optional* - contains all the config options applied during aggregation of feeds, see below for more details about each option in additional notes
| `mergetype`                | *Optional* - How individual feeds from (different) providers are merged together <br><br> **Possible values:** `none`,`merge`,`alternate`.<br> **Default value:** `none`
| `ordertype`                | *Optional* - The value used to sort feeds<br><br> **Possible values:** `default`,`date`,`age`,`sent`.<br> **Default value:** `default`
| `order`                | *Optional* - The order to sort the feeds in.<br><br> **Possible values:** `ascending`,`descending`.<br> **Default value:** `ascending`
| `clipafter`                | *Optional* - After new feeds have been aggregated and sent for display, if this number is > 0 then only this number of latest feeds are retained<br><br> **Possible values:** `0`,any number.<br> **Default value:** `0`
| `cleanedtext`                | *Optional* - All HTML tags and contents are removed. Will use isprofanity in future<br><br> **Possible values:** `true`,`false`.<br> **Default value:** `false`
| `ignorecategorylist`                | *Optional* - an array of categories that if found in a post will stop it from being displayed. See example above for usage<br><br> **Possible values:** an array of categories.<br> **Default value:** empty array
| `display`            |*optional* - contains all the config options applied during the displaying of the aggregated feed articles
| `articleage`                | *Optional* - show formatted article age on a separate meta data line, may include the sourcename<br><br> **Possible values:** `true`,`false`.<br> **Default value:** `false`
| `artarticledescription`                | *Optional* - show article description <br><br> **Possible values:** `true`,`false`.<br> **Default value:** `false`
| `articletitle`                | *Optional* - show article title <br><br> **Possible values:** `true`,`false`.<br> **Default value:** `true`
| `articlimage`                | *Optional* - show article image if provided<br><br> **Possible values:** `true`,`false`.<br> **Default value:** `false`
| `articlecount`                | *Optional* - how many articles to show on the magic mirror<br><br> **Possible values:** any number.<br> **Default value:** `10`
| `hilightnewarticles`                | *Optional* - highlight new articles<br><br> **Possible values:**  `true`,`false`.<br> **Default value:** `true`
| `clearhilighttime`                | *Optional* - how many milliseconds to highlight new articles for<br><br> **Possible values:** any number.<br> **Default value:** `10000`
| `firstfulltext`                | *Optional* - override the textlength option and show the full article title and description on the first article displayed<br><br> **Possible values:**  `true`,`false`.<br> **Default value:** `false`
| `modulewidth`                | *Optional* - constrains the width of the module display area to this css value<br><br> **Possible values:** any css width value.<br> **Default value:** `10vw` - equivalent to 10% of the available view area
| `refreshtime`                | *Optional* - the time in milliseconds between each module refresh to the magic mirror display<br><br> **Possible values:** any value in milliseconds.<br> **Default value:** `5000`
| `rotationstyle`                | *Optional* - how articles are scrolled within the module<br><br> **Possible values:** `default` - the next articlecount articles are displayed,`scroll` - the articles are scrolled up 1 at a time.<br> **Default value:** `default`
| `sourcenamelength`                | *Optional* - the number of characters of the source name to display<br><br> **Possible values:** any number of characters<br> **Default value:** `4`
| `textbelowimage`                | *Optional* - all displayed text appears below and separate to the image. Otherwise, all text is superimposed over the bottom of the image<br><br> **Possible values:**  `true`,`false`.<br> **Default value:** `true`
| `textlength`                | *Optional* - the number of characters of the title and description to show if they are to be displayed. 0 means no truncation. Applied after text is cleaned<br><br> **Possible values:**`0`, any number of characters<br> **Default value:** `0` - no truncation		
| `wraparticles`                | *Optional* - ensure all the articlecount article slots are filled. Otherwise articles are scrolled until the last one is only visible,<br><br> **Possible values:**  `true`,`false`.<br> **Default value:** `false`

### Additional Notes

There are some options in the code marked as TODO. ignore these.

Because the config is multi layered (config, then article and display - additional code is need to ensure that the entire config is merged with the defaults and passed to the ndoe_helper)

The IDs must match between providers and consumers. Being a case sensitive environment extra care is needed here.

The alternate method of merging articles from disparate feeds requires that each feed must be provided with a unique title in the RSSSource area of the payload


#### Detailed Article config options:
<pre>
mergetype: 'none',		// how to merge multiple feeds together
					// none - no merging
					// merge - merge all feed details before applying the order type
					// alternate - merge by taking alternate articles from each feed (i.e. 1st,1st,1st,2nd,2nd,2nd), will apply sort order before merging 
					//				to work correctly, feeds being provided must have a unique feedtitle.
ordertype: 'default',		//options are 
					// default - fifo grouped by the title as this is how they are received from the provider
					// date, - larger numbers are younger so sort descending
					// age, - smaller number are younger so sort ascending
					// sent, - the date/time stamp the article was sent to the main module - to be used with clipping - sort descending for youngest at top
					// TODO - we may want other options such as by provider or alphabetically title or most active feed
order: 'ascending',		//options are ascending or descending, so dates (As date/sent youngest at the top = descending, for age, ascending for top )
clipafter: 0,			//the maximum number of articles in a single feed (this includes the merged one) 
					// before there is clipping, 
					// clipping takes place after articles have been displayed at least once 
					// a value of 0 means no clipping
cleanedtext: false,		//removes any HTML tags and (TODO bad-words), leaving just text from title and description
ignorecategorylist: [],		//ignore articles matching any category, full word, in this list i.e. ["horoscopes"]</pre>

#### Display config options:

Additional display options and article options are being added all the time.

This is a WIP; changes are being made all the time to improve the compatibility across the modules. Please refresh this and the MMM-feedUtilities modules with a `git pull` in the relevant modules folders.

## MMM-Feedxxx overview

Neil's consumer provider consumer aggregation user model.

Each consumer has a unique id. Each provider is told in the config which consumers to provide to. Each provider may be given multiple consumer ids and each Consumer may have multiple providers.

When the consumer starts, it sends a global message , with it's id in. All providers are listening for the specific message that includes the ID of the consumer(s) they have been configured to provide for.

Once a provider has at least one consumer, they will gather whatever articles (stuff) they specialism in and format it into a standard pseudo RSS 2.0 format.

The provider will send any articles found to the consumer (via an all points message) which contains the consumer id. The provider then repeats the process looking for any new articles.

The provider must only send articles that have not been sent previously.

Once the consumer gets the articles, it will process the data, initially passing it to its local aggregator.

The aggregator will, depending on its config rules, merge all data from the providers into a single collection of articles.

Whenever the collection of articles changes (as new ones are added), it is sent to the consumer module so that it can consume it (i.e. format and display it)

The provider has to track the incoming data and outgoing data uniquely for each consumer. This is because the node_helper is a common module used by all providers of the same type.

The provider must tag the articles sent by a time stamp of when it was published or if that inst available by the time it was sent. This data is used to ensure that all articles older than the latest time stamp of an article sent can be ignored. There is a special exception this, some providers can request Random articles from their feed source.

The consumer may highlight any new articles it receive from the aggregator, so the aggregator spends the time stamp it sent the articles to the display module.

The display cycle in the main module is restarted each time new articles are provided from the aggregator. 

To maximise seeing all feeds returned from each provider collection cycle, tune the display cycle time and the data refresh time.

#### thoughts on design

The objective was to create multiple providers specialised in a particular data type, be it say share prices, car sales, twitter feeds or top albums, that would provide the data collected in a common format so that only one display routine would be required. This would enable easy merging of disparate data into a single area on the magic mirror without complex carousel type configs.

The initial thoughts where to use the weather module structure, of a common display routine, with display templates and providers. However, with the complexity of managing the multiple providers and aggregators required in one module, the current pattern was determined as an easier, if not as efficient method.

This lead to the current design: (any TODO are design capabilities that haven't yet/may never be implemented)


<pre>
MVP

1) main display module
	config
		display module ID
		config for display
		config for aggregator
	getdom
		handles all the stuff from the aggregator, also includes any specific formatting like cropping, text truncation etc
		handles how many messages to show at a time and how to cycle through the messages, reset and start again from the youngest received
	message handler
	can send a generic message to all modules asking for all data that will override their own timers - first time usage / emergency rebuild TODO
2) aggregator - node_helper.js
	receive delta data from main module (passed from provider)
	aggregate according to config rules
		order data by published or as it arrives or simply interleave by actual provider and or source (lots of options!)
	pass all data back to main module
3) provider module
	does not display anything and so is hidden on the MM display by having no position in the config.
	config (includes display module ID to send messages to)
	schedules refresh of getting data from its own source list (this is now known as feeds)
	does all the funky get data stuff - use a node helper - (subsequently this minimise the changes between the various duplicated modules)
	formats it (and handles only sending delta) in pseudo RSS format (this is now defined within the RSS.js structures file
	wraps the payload with the consumer ID and a message to notify the main display module of new data availability
	responds to a request for all data from its linked display module ID TODO
	will handle data filtering based on the config (i.e. in Twitter we can ignore retweets)
</pre>

#### Finally - creating new providers

With the existing providers, there are different ways of obtaining and formatting data into the standard format required by the MMM-FeedDisplay module, look at each to determine if any match your specific requirement. Also most use a helper of some kind that already exists in nodejs. so it is worth searching there as well.

To create a new provide consider the following:

copy any of the existing GIThub repositories with all the provider modules: main module and node_helper.
rename it externally and internally so it has a meaningful name
the main module should need few if any changes
the node_helper is where most of the work is done, with the new processing within the `fetchfeed` section. all other sections should be ok as they are. One day i may actually create a default module and have the provider added as an extension to the default module.
because the data in the title and description are displayed in what is in essence a browser, any valid HTML that is allowed within the body of a page will be honoured. This means that the provider could actually format the display area and just have the FeedDisplay act as a pass through to the magic mirror display. By using clipping of 1, and ensuring each update to the feed from the provider has a current time stamp, it should be possible to have the provider act as a near real time updater of data to a single display location on the display. An example of where this might be useful is in formatting share details into a table for example. I may give this a go soon.
when completed, use the readme.md from any of the providers as it has a relatively readable format, and much of it is reusable.
test test test, and finally publish to GIT with all the relevant information updated in all the files
best of luck and thanks if you actually read to this point

##the end








