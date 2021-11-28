# Development
This resource is a deep dive into how the development flow is with Activity timer. It'll guide you on how to setup your local developer environment & help you get started contributing!

## Prerequisites
1. GIT
2. NodeJS 16.3.0+

## Installation

First you start off by cloning the repo:

```
git clone git@github.com:danniehansen/activity-timer.git project-folder
```

& afterwards install the packages:

```
cd project-folder && yarn install
```

## Configuration

You're almost ready. Before proceeding you need to create a `.env` file containing some environment variables needed for local development.

```
VITE_APP_NAME="Activity timer"
VITE_APP_KEY="see-environment-variable-section"
VITE_WEBSOCKET="wss://eps2k82awh.execute-api.eu-west-1.amazonaws.com/dev"
VITE_API_HOST="65ztuq0kh3.execute-api.eu-west-1.amazonaws.com"
```

Now the local developer environment is ready. Next up is creation of the local development powerup.

## Powerup creation

First up is [creating a Trello team](https://help.trello.com/article/705-creating-a-new-team). This is required, as a powerup needs to be connected to a team.

Once the team is setup, then youe ready to [create your powerup](https://trello.com/power-ups/admin).

Under basic information you need to fill in the iframe connector URL with: `https://localhost:3001/` - this is for local development.

After this you need to enable the capabilities that the powerup uses.

1. Board buttons
2. Card back section
3. Card badges
4. Card buttons
5. Show settings

When this is done you can create a new Trello board under your new Trello team. Here you should be able to when adding a powerup to select your newly created powerup.

## Commands

**yarn dev**: This will startup the local development environment. Before you can view your powerup locally you need to open up `https://localhost:3001/` & allow the self signed certificate. Once allowed you can refresh the Trello board & see your local powerup in action!

**yarn lint**: This will run ESlint on all of your .js / .ts files & ensure that you're compatible with Activity timers code style.

**yarn analyze**: This will run `vue-tsc` & analyze the TypeScript files for issues.

**yarn test**: This will run `jest` to perform unit testing on our application.

**yarn build**: This will run vite & create a production build. Command outputs to the `dist` folder.

## Environment variables

**VITE_APP_NAME**: The app name that appears when user attempts to authorize to the Trello REST API.

**VITE_APP_KEY**: The app API key used when communicating with the Trello REST API. You can generate an app key over at: https://trello.com/app-key

**VITE_WEBSOCKET**: The websocket to be used for communicating from the webhook that controls the auto-starting of the timer. Webhook will communicate with this websocket for notifying the client on when to start timers for specific cards.

**VITE_API_HOST**: The webhook HTTP API. This is used when setting up webhooks for controlling the auto-starting of timers.

