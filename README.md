# Activity timer
Time is precious, this we know. Keeping track of this precious time is hard. Activity timer solves just that! With Activity timer you can now keep track on your time spent working with cards.


## Explained

To start tracking your time you need to manually start timer. This you do up top of your card as simple as clicking "Start timer". Once timer has started you will be able to see total time spent right next to the button you clicked. 

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot1.png "Start timer & time spent")

Once timer has started "Start timer" will switch over to a "Stop timer" button. Clicking this will stop the timer and register your time slot in the logs.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot2.png "Stop timer & time spent")

At any given time you can in the card "Power-ups" section clear your tracking data, manage time and even see a list over time spent by every team member for this card.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot3.png "Clear data, manage time and time spent")
![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot5.png "Manage time")


In addition to this you'll be able to quickly peak at the total time spent for a card when viewing the board.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot4.png "Time spent")

## Card data (REST API)

Want to extract logged time and process it in another system? No problem! Activity timer keeps logs in the shared data for the card. This means you can query the logged time for a card using Trello's own REST API. All of the time ranges saved by Activity timer is saved within key 'act-timer-ranges' in shared card data. 'act-timer-ranges' consists of an array where each items index equals to:

- 0: Member id
- 1: Start time (unix timestamp)
- 2: End time (unix timestamp)

## Get in touch

Activity timer is open source! Yes you heard it. Head over to https://github.com/danniehansen/activity-timer and submit your issues, ideas or even your very own PR with new and exciting features.