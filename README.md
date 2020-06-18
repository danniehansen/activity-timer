# Activity timer
Time is precious, this we know. Keeping track of this precious time is hard. Activity timer solves just that! With Activity timer you can now keep track on your time spent working with cards.


## Explained

To start tracking your time you need to manually start timer. This you do up top of your card as simple as clicking "Start timer". Once timer has started you will be able to see total time spent right next to the button you clicked. 

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot1.png "Start timer & time spent")

Once timer has started "Start timer" will switch over to a "Stop timer" button. Clicking this will stop the timer and register your time slot in the logs.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot2.png "Stop timer & time spent")

At any given time you can in the card "Power-ups" section manage time and even see a list over time spent by every team member for this card.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot3.png "Clear data, manage time and time spent")
![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot5.png "Manage time")

In addition to this you'll be able to quickly peak at the total time spent for a card when viewing the board.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot4.png "Time spent")

Activity timer also provides you with the ability to put estimates on your cards.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot7.png "Estimate")

Clicking the estimate box will show a popup where you can create/update your estimate.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot10.png "Change estimate")

Once an estimate have been saved it will show on the board view & also when on the card. If multiple members have set an estimate another box will appear with the total estimate across members. Clicking this will open a popup showing which member estimated what on the task. Very useful for when members collaborate on the same cards.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot9.png "Estimate")
![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot8.png "Estimates")

At last, we have our simple `Activity timer history` board button. This board button allows you to easily filter through cards (including archived) with no easy! Filter by date, member or label. Find out where you're spending your time.

![alt text](https://d3eyxhmqemauky.cloudfront.net/images/screenshot6.png "Activity timer history")

## Highlights

1. Easy access to start / stop of timer.
2. Powerful time management editor to edit previous recordings.
3. When you move card from one list to another it will automatically stop the timer.
4. All data on a card is stored in a compressed format that's easy to access through REST API.
5. Easy access to previous recordings from our very own history view.

## Card data (REST API)

Want to extract logged time and process it in another system? No problem! Activity timer keeps recordings in the shared data of the card. This means you can query the logged time for a card using Trello's own REST API. All the time ranges saved by Activity timer is saved within key 'act-timer-ranges' in shared card data. 'act-timer-ranges' consists of an array where each item's index equals to:

- 0: Member id
- 1: Start time (unix timestamp)
- 2: End time (unix timestamp)

## Open Source

Activity timer is open source! Yes you heard it. Head over to https://github.com/danniehansen/activity-timer and submit your issues, ideas or even your very own PR with new and exciting features.