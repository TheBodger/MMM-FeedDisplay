# MMM-FeedDisplay

neils consumer provider consumer aggregator user model

the consumer has a unique id and the provider is told what this is. the provider may be given multiple consumer ids

when the consumer wants stuff, it sends a message to everyone, with it's id.

all providers getr the message but only those who recognise the id will respond.

before they respond they will gather stuff and format it into a standard RSS 2.0 format

whenthey have the data, they will send it to the consumer (via an all points message) which contains the consumer id. 

only that conumer will process the data, passing it to its local aggregator.

the aggregator will, depending on its own rules, merge all data fromm the providers into a single collection of stuff

this collection of stuff, when it changes will be sent to the consume so that it can consume it (i.e. format and display it)

while the stuff doesnt change, the consumer simply cycles through the collection until it reaches the end and start again from the top

The provider responds to 2 messages

start (may be sent multiple times from the same provider acting as a restart)
stop

the provider has to track the latest stuff by consumer who requested it - so each has its own cycle etc - option here to only track the data from a local pool

its job is it find the latest stuff, and only send what it hasnt sent already, so it has to keep track of what it has sent

if nothing changes at a cycle, the cycling is started when the start message is received, then no stuff is sent. if there is new stuff at a cyce, only the new stuff is sent

the provider must tag the stuff sent by a timestamp of published

the consumer will need to highlight any new stuff it receives, so the aggregator can make sure it is shown at the top and the consumer will ned to restart its cycling whenever new stuff is recived



have a stadrdised front end that handles all the display stuff, and calling the data stuff providers
the providers are called (they are named in the config providers array) and they are responsible for providing the data stuff to the front end in a standard format
standard format will match the most suitable standard
for anything RSS, news, twitter etc then use the atom format

we can use our RSS reader as the core of the front end, with two display modes, (show image, dont show image) and have them added to the page as many times asd required
so we can use a twitter provider, taken from the twitter solution already that will grab tweets, bundle them up in atom format
and  ....
either have them bubble the information up to the screen handler
or have an agregator that can organise them into date order or interleave regradless of date order
and that bubbles them up

we need to ensure a decent responsiveness, so providers that have sent atom data is passed onto the display ASAP

the aggregator sounds like a good idea

so there will be a config structure of

either

module{config}
	aggregator{config}
		providers
			provider {config}

but this appears to be complicated

so 

we will have an aggregator linked to a module

but the providers run separatley as standaalone modules which dont display anything they just send broadcast messages to all modules when they have new material to share
these providers will be told which aggregator ID to use to communicate with te specific module we want their data to go to 
any messages that are picked up for that modules aggregator are passed to it (assuming we have to handle messages at the module level)
when the aggregator gets the message which contains the new stuff it is added to the overall aggregated list of data and then passed backto the module to display as it wants
providers only send delta information

MVP

1) main display module
	config
		display module ID
		config for display
		config for aggregator
	getdom
		handles all the stuff from the aggregator, aslo incudes any specific formatting like cropping, text truncation etc
		handles how many messages to show at a time and how to cycle through the messages (proably after each refresh / new item) start again from then youngest recevied
	message handler
	can send a generic message to all modules asking for all data that will override their own timers - first time useage / emergency rebuild
2) aggregator - node_helper.js
	receive delta data from main module (passed by provider)
	aggregate according to config rules
		order data by published or as it arrives or simply interleave by actual provider and or source (lots of options!)
	pass all data backto main module
3) provider module
	config (includes display module ID to send messages to)
	schedules refresh of getting data from its own provider list
	does all the funky get data stuff - may use a node helper but probably not required - need to check performance
	formats it (and handles only sending delta) in atom format - if already in atom format then just the delta needs handling and then send asis
	wraps the atom payload with the ID and may be a time when sent and a message to notify the main display module of new data
	responds to a request for all data from its linked display module ID
	will handle data filtering based on the config (so Twitter can ignore retweets, but in that case the provider can keep getting tweets until it has filled to capacity)







