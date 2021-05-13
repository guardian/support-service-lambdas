# sf-datalake-export
This state machine is used to generate csv reports from salesforce using their [Bulk API](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/asynch_api_code_curl_walkthrough.htm).


## How to resolve a failed export.

The Salesforce data exports run everyday at [1AM UTC](https://github.com/guardian/support-service-lambdas/blob/main/handlers/sf-datalake-export/cfn.yaml#L501) and are kicked off by a CloudWatch Event. The event triggers a step function to run in the AWS Membership account. When they occasionally fail you need to retrigger the failed export through the AWS console. 

There is a generic step function that takes a simple JSON object to export the chosen Salesforce object. (As seen below)

```
{
  "objectName": "Subscription"
}
```

You can just rerun a step function with the `New execution` button which will pre-populate the input with the same input that was used in the previous execution. The step functions execution time varies depending on the object you’re exporting due to data volumes. 

The next thing you’ll need to do is look in airflow at the status of the [DAG](https://airflow.apache.org/docs/apache-airflow/stable/concepts.html#:~:text=In%20Airflow%2C%20a%20DAG%20%2D%2D,and%20their%20dependencies%29%20as%20code.). In the tree view, if you have your step set to `up_for_reschedule` you can wait and when the data has landed in S3 it will begin the downstream processes required to transform the data from raw to clean. 

If the DAG step has failed you have to clear the status of the step. When you clear it you need to ensure you are also clearing all the downstream dependencies. (This is by checking the toggle on the clear screen - it is set to clear downstream by default).
![image](https://user-images.githubusercontent.com/1722550/118105502-5aa2f600-b3d4-11eb-8dca-b74cf2020590.png)


The final step is to periodically come back and check the status of the jobs in airflow and wait for them to go green.
