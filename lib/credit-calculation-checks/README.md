Invoice Date Calculation Checker Tool
=====================================

This tool can be used to validate the calculation of invoice dates by the 
SubscriptionData family of classes

Methodology
-----------

The approach takes an export of invoice items from zuora. The items are grouped 
by subscription. 

For each item a RatePlanChargeBillingSchedule is created and a billing period is created for each invoice date. 

In most cases the invoice date should match the start of the billing period however
there are a number of edge cases where zuora created invoices between the invoices
on the normal schedule. Due to this the billing period start date validated by
matching it against any of the invoice dates for the subscription being processed.

Exporting invoice items from zuora
----------------------------------

You will need a zuora api access token for more details see:

https://www.zuora.com/developer/api-reference/#section/Authentication

cd into root of project and execute export script:

lib/credit-calculation-checks/exportinvoiceitems.sh <zuora access token>

Log into Zuora and navigate to the AQuA job finder:

* Click on email in top right > Settings > Reporting
* Click on AQuA job finder

You will see the new job at the top of the list. 

Once the status is 'Completed' click on the status.

Click on the download link in the status dialog box.

Running the tool
----------------

sbt "credit-calculation-checks/runMain CheckInvoiceDates  <path to downloaded export file>"
