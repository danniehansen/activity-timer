/**
 * Help content for different features of Activity Timer
 * Each section provides contextual guidance to users
 */

export interface HelpContent {
  title: string;
  content: string;
  videoUrl?: string;
  docsUrl?: string;
}

export const helpContent: Record<string, HelpContent> = {
  general: {
    title: 'Activity Timer - Overview',
    content: `**Welcome to Activity Timer!** Track time on your Trello cards with ease.

**Core Features:**

**⏱️ Time Tracking:**
Start and stop timers on any card. Activity Timer automatically tracks your work time and prevents running multiple timers at once.

**📊 Estimates:**
Set time estimates for tasks and track progress with visual indicators. Each team member can set their own estimate.

**📅 Week Calendar:**
View all your time entries in a beautiful week calendar. Drag and drop to adjust times, filter by member, and create new entries.

**📤 Data Export:**
Export time tracking and estimates to CSV for invoicing, timesheets, or analysis. Powerful filtering and grouping options included.

**⚙️ Auto-Start Timer:**
Automatically start tracking when you move cards to specific lists (e.g., "In Progress"). Requires one-time authorization.

**🔔 Smart Notifications:**
Get notified when approaching your time estimates to help stay on track.

**Getting Started:**
Open any card and click "Start timer" to begin tracking. Use the Activity Timer menu (clock icon) in the board header to access advanced features.

**Need help with a specific feature?** Each section has its own help button with detailed guidance.`
  },

  cardBackSection: {
    title: 'Getting Started with Activity Timer',
    content: `**Welcome to Activity Timer!** Here's how to track your time:

**Starting a Timer:**
Click the "Start timer" button to begin tracking time on this card. The timer will run until you stop it.

**Stopping a Timer:**
Click "Stop timer" to end your tracking session. The time will be saved automatically.

**Adding Time Manually:**
Use "Add time" to log time you've already spent without using the timer.

**Estimates:**
Set how long you think a task will take. You'll see a progress bar showing actual time vs. estimated time.

**Important:** Only one timer can run at a time per person. Starting a new timer automatically stops any other running timers.`
  },

  settings: {
    title: 'Board Settings',
    content: `Configure Activity Timer for your entire board:

**Threshold for Trackings:**
Set the minimum number of seconds required to save a time entry. This prevents accidental very short trackings (default: 30 seconds).

**Auto-Start Timer:**
Automatically start the timer when you move a card to a specific list. Perfect for "In Progress" or "Doing" columns!
*Note: Requires Trello authorization and browser reload.*

**Visibility:**
Control who can see time trackings:
- **Visible to all**: Everyone with the board link can see
- **Members of board**: Only board members can see
- **Specific members**: Choose exactly who can see

**Disable Estimate Feature:**
If you don't need estimates, you can hide the estimate functionality entirely.`
  },

  estimates: {
    title: 'Understanding Estimates',
    content: `Estimates help you plan and track progress:

**Setting Your Estimate:**
Enter how many hours you think this task will take. Estimates are personal - each team member can set their own.

**Multiple Estimates:**
When multiple people work on a card, you'll see:
- Your personal estimate
- Total estimate from all team members

**Progress Tracking:**
The card will show a progress bar comparing time spent vs. estimated time:
- **Green**: On track (0-80%)
- **Yellow**: Warning (80-100%)
- **Red**: Over estimate (100%+)

**Deleting Estimates:**
You can delete your own estimate anytime. Board admins can delete any estimate.`
  },

  manualTime: {
    title: 'Adding Time Manually',
    content: `Sometimes you work on a task without starting a timer. No problem!

**How to Add Time:**
1. Enter hours and/or minutes
2. Click "Add time"
3. Time is saved immediately

**When to Use This:**
- You forgot to start the timer
- You worked offline
- You're logging time from another tracking system
- You want to add time in bulk

**Note:** Manually added time appears the same as timer-tracked time in all reports and displays.`
  },

  autoTimer: {
    title: 'Auto-Start Timer Feature',
    content: `Let Activity Timer start tracking automatically!

**How It Works:**
1. Enable auto-start timer in settings
2. Choose which list triggers the timer (e.g., "In Progress")
3. When you move a card to that list, the timer starts automatically

**Requirements:**
- Trello authorization (read & write access)
- Browser must be open to receive the signal

**Why Authorization?**
We need to set up a webhook with Trello to detect when cards move. This lets us tell your browser to start the timer.

**Privacy:**
We only store your connection ID temporarily and only while your browser is open. No card data is stored on our servers.`
  },

  notifications: {
    title: 'Notification Settings',
    content: `Get alerted when approaching your time estimates:

**How Notifications Work:**
Set a percentage threshold (e.g., 80%). When you reach that percentage of your estimate, you'll get a desktop notification.

**Setting Up:**
1. Click "Enable Notifications" in the board menu
2. Allow browser notifications when prompted
3. Set your threshold percentage in notification settings

**Use Cases:**
- Get warned at 80% to wrap up
- Alert at 100% when you hit your estimate
- Early warning at 50% for long tasks

**Requirements:**
- Browser notifications must be allowed
- Browser tab doesn't need to be active
- Works even when Trello is in a background tab`
  },

  calendar: {
    title: 'Calendar View',
    content: `See all your time trackings in a visual week calendar:

**Features:**
- See when you worked on which cards
- Filter by team member
- View time blocks visually
- Navigate between weeks
- Drag and drop to adjust times
- Create new time entries directly

**Calendar Settings:**
- Choose week start day (Sunday or Monday)
- Set business hours to focus the view
- All settings are personal preferences

**Use Cases:**
- Review your week's work
- Create timesheets
- Analyze work patterns
- Prepare for status meetings`
  },

  exports: {
    title: 'Data Export',
    content: `Export your time tracking data to CSV:

**Time Tracking Export:**
Get detailed reports with:
- Card names and links
- Member names
- Start and end times
- Duration
- List information

**Estimates Export:**
Export all estimates with:
- Card information
- Member estimates
- Total estimates per card

**Filtering:**
Choose which columns to include in your export and filter by date ranges, members, lists, and labels.

**Grouping:**
Group data by card or by card and member for different report formats.

**Use Cases:**
- Create invoices
- Generate timesheets
- Analyze team productivity
- Import into other tools
- Track project budgets`
  }
};
