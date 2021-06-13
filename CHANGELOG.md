# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Released]

## [1.2.0] - 2021-06-13
### Added
- [BETA] Added auto-start timer feature. Automatically starts registering time when cards are moved to a specific list. This feature can be enabled on the power-up settings page. I've put a BETA label on this as it's highly subject to change due to the unknowns about added cost to hosting the power-up. 
- Added threshold for registering trackings. If trackings added by manually starting / stopping the timer is less than x settings (default 30). Then power-up rejects the time tracking. This is to combat the 4096 character limit on power-ups for storage. You think 30 is too much or too little? Change it on the power-up settings page.
### Optimizations
- Optimized card badge rendering by caching the member id.

## [1.1.6] - 2021-06-11
### Added
- Added ability to see other peoples active trackings under 'Manage time'. https://github.com/danniehansen/activity-timer/issues/41
- Added ability to manually add trackings. https://github.com/danniehansen/activity-timer/issues/38
### Fixed
- Fixed issue in Firefox where clicking 'Authorize' nothing happened. https://github.com/danniehansen/activity-timer/issues/40
- Fixed issue with plugin responsiveness after exceeding the 4096 character limit. https://github.com/danniehansen/activity-timer/issues/32

## [1.1.5] - 2021-03-05
### Added
- Merged UI optimizations for "Manage time" https://github.com/danniehansen/activity-timer/pull/30 - thanks to @jonez1 for looking into this.

## [1.1.4] - 2021-02-04
### Added
- Added sentry for better bug tracking.
### Changed
- Updated all packages.

## [1.1.3] - 2020-09-06
### Added
- Added new CSV export featuring a full export of all time ranges tracked and not just a total count.

## [1.1.2] - 2020-09-02
### Fixed
- Possible fix for invalid token issue when opening 'Activity timer history' view.

## [1.1.1] - 2020-09-01
### Fixed
- Fixed issue with 'Activity timer history' not loading when access token from authentication expires or otherwise becomes invalid. Activity timer will now fallback to re-authenticate if any exception occurs.

## [1.1.0] - 2020-08-25
### Added
- Deletion of estimates
- Clear estimates.
- Shared in-progress trackings so others can see real-time tracking of others as they're tracking.
- When starting a tracker while already having one running it will now stop the other tracker.
- Exporting of past tracking through history view.
- Added a icon that's shown on the card in the list view when other members are tracking on a card.

## [1.0.4] - 2020-06-22
### Added
- Added power-up settings to toggle estimate feature.
- Added notifications feature to get notified when you near your estimates time.
### Fixed
- Fixed issue when deleting time ranges of a specific member accidentally deleting time ranges for other members.

## [1.0.3] - 2020-06-18
### Fixed
- Fixed issue with timer not initially showing with `0m` as time on board list when starting.
### Added
- Added back clear functionality. Now available under `Manage time` together with a confirm.
- Added new estimate functionality. Each member can now put an estimate on the card. This will later be used for possible notifications when nearing the end of a estimate.

## [1.0.2] - 2020-06-17
### Removed
- Removed `Clear data` button.
## Fixed
- Fixed wrong label used for no members paragraph under new history page.

## [1.0.1] - 2020-06-16
### Changed
- Changed time format from `HH:II:SS` to `Hh Mm`.
- changed update timer for card badge in board from 10 seconds to 60 seconds. This is due to us removing seconds from time format.
## Fixed
- Fixed issue when changing start time on a time range not having current start as initial value.
## Added
- Added new history view to filter through past trackings.

## [1.0.0] - 2020-06-08
- Initial release
