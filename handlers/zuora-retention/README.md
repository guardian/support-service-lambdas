#Zuora retention lambdas

This project defines a state machine to generate zuora reports to find Accounts with only long cancelled subscriptions and mark them in order for them to be excluded from processing into the data lake. 

##State machine
In a simplified way the execution of the state machine defined in this project can be summarised like this:

Query zuora -> fetch zuora results -> transfer files -> filter results -> update accounts

#Query zuora

This step uses the common code in zuora-reports to define a querierlambda that submits queries to get the list of old accounts from Zuora. Because of Zuora limitations this cannot be executed in one query so 2 queries are needed and the results are combined in the filtering step later on.
The 2 queries submited by this lambda are :
* List of candidate accounts:  all Accounts with subscriptions that have been cancelled before a certain date
* Exclusion list:  all Accounts with subscriptions that have not been cancelled before the same date

#Fetch zuora result
This step check with zuora until the queries are done executing and download links are provided
#Transfer files
This step will download the files from zora into the zuora-retention-[STAGE] bucket. All files will be placed into a directory named after the job id to avoid different execution interfering with each other
# Filter result
In this step all the results from the list of candidates that are also present in the exclusion list are filtered out, leaving a list of accounts that only have long cancelled subs.
The result of this step will be saved in the same bucket and directory as the zuora reports with the name 'doNotProcess.csv'
# Update account  
The file generated in the previous step is iterated and each account is updated with ProcessingAdvice= 'DoNotProcess'