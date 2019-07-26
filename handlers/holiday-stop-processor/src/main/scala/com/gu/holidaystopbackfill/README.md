# Holiday Stop Backfill

This package holds a script to backfill Salesforce with manually-applied holiday stops already recorded in Zuora.
  
The script will write these holiday stops into the Salesforce holiday stop requests table with the same dates that were added manually to Zuora, 
and it will write individual entries into the holiday stop request details table for each stopped publication in the date range of the holiday stop.
For each detail record the credit applied to the original holiday stop will be divided by the number of stopped publications in that holiday stop.  

The script is idempotent, so can be run safely multiple times with the same or different input.

## Backfill process

1. Run the summary report in Zuora called *GW Holiday Stops for Backfilling Salesforce* in the *Dig.Dev Reports* folder.  
   To do this click on the arrow on the *Run Detail Report* button and choose *Run Summary Report*.
1. Export the report results to your dev machine.  
   Do this by clicking on the arrow on the *Export* button and choosing *Unpivoted Layout*.
1. In SBT, run the main app in this package `com.gu.holidaystopbackfill.BackfillingApp` with the following arguments:
    1. true/false for whether it's a dry run.  True means that it will have no external effect.
    1. Path to the CSV file holding legacy holiday stops in Zuora, which was exported above.
    1. Name of the environment to backfill: DEV, CODE or PROD.  This is DEV by default.
1. The script will tell you what it has written to Salesforce, if anything.
