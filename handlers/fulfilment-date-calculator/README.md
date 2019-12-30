## fulfilment-date-calculator

The aim of this module is to consolidate/centralise all the date calculation logic relating to fulfilment, i.e....

- first available date for holiday stops
- target processing date for holiday stops
- delivery address change effective date
- _target date fulfilment should be running for [COMING SOON]_
- _first available acquisition dates [COMING SOON]_


... stored centrally in S3 (in the `membership` account) for numerous other Reader Revenue applications to consume, whilst also being fairly human readable so developers.

**It's best to look at the implementation and tests for how these different dates are calculated and how they relate to one another.**

### File Location and Structure
The files reside in `fulfilment-date-calculator-<STAGE>` buckets, where `<STAGE>` should be replaced with the **lowercase** stage, e.g. `fulfilment-date-calculator-dev`.

Within the bucket there should be a directory for each of the supported product types...
 - `Guardian Weekly`
 - `Newspaper - Home Delivery`
 - `Newspaper - Voucher Book`

Within each directory there will be files named with the following format `YYYY-MM-DD_PRODUCTNAME.json` - e.g. `2019-12-11_Newspaper - Home Delivery.json` (the product name is in the filename as well as the parent directory to avoid confusion/mistakes if downloaded).

Within each file you will see top level keys relating to the 'day of week' (for Newspaper files this is `Monday` - `Sunday` but Guardian Weekly just has an entry for `Friday` as this is the only issue day for GW). Within each of these we have date values for...

- **`today`** just to be explicit
- **`deliveryAddressChangeEffectiveDate`** the date of the first issue **[of that day of week]** which will reflect any changes to the delivery address made on '_today_'
- **`holidayStopFirstAvailableDate`** the earliest date **[of that day of week]** that can be selected as the start of a holiday stop (so we know we can definitely block fulfilment - via the `holiday-stop-processor`)
- **`holidayStopProcessorTargetDate`** the issue date **[of that day of week]** that the `holiday-stop-processor` should process the holiday stops for (can be null)
- **`finalFulfilmentFileGenerationDate`** not currently consumed but is a useful date for context

By producing the set of dates for each day of week, we can support ANY rate plans (including `Echo Legacy` which can have odd combinations e.g. `Monday`, `Friday` & `Sunday`). The consumers typically filter the full list of dates from files based on the days of week for the particular subscription, then picks the minimum of those dates.

### File Generation Schedule
As per https://github.com/guardian/support-service-lambdas/pull/521 the lambda is run each day (as per the AWS Event cron in the CFN), for **all environments/stages** (since the consumers of the file use the corresponding one to their stage, e.g. `manage-frontend` `CODE` uses the files from `fulfilment-date-calculator-code`).

As per https://github.com/guardian/support-service-lambdas/pull/520 when the lambda runs it produces numerous files for **yesterday through to a fortnight from _today_** - this is for resiliency in case the lambda fails to run etc. the consumers will have a file that is very likely to be correct. This is also useful if we ever need to look ahead.

As per https://github.com/guardian/support-service-lambdas/pull/529 the files are versioned should we ever need to compare the files following changes to the logic (since the files are generated multiple times and overwritten as time goes on). They also have a 30 day retention policy to avoid unnecessary storage costs.

By default it produces files relevant to _'today'_ at the the time it runs, however this can be overridden by providing simply a date as an input to the lambda, in the following **string format** `YYYY-MM-DD`.

### Bank Holiday Support
For products like Home Delivery the fulfilment process is affected by bank holidays, since the distributor(s) pick up the fulfilment file on the **working day** before the delivery day.

As per https://github.com/guardian/support-service-lambdas/pull/516, it obtains the bank holidays from gov.uk website, and stores them in the top level of the S3 bucket as `UK_BANK_HOLIDAYS.json` as a fallback if ever the gov.uk service is down.

### Known Consumers
- **`manage-frontend`** consumes the `deliveryAddressChangeEffectiveDate` (splicing it into the `members-data-api` response for use in the delivery address update flow) - see https://github.com/guardian/manage-frontend/pull/338
- **`support-service-lambdas`** (this same mono-repo) consumes the holiday stop related dates for the `holiday-stop-api` and `holiday-stop-processor` - see https://github.com/guardian/support-service-lambdas/pull/533 and https://github.com/guardian/support-service-lambdas/pull/536 respectively

... in future we expect to see `support-frontend` consume these files for the acquisitions start date (which will be bank holiday aware and better than their current blunt solution).
