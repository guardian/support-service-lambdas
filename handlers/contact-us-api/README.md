# contact-us-api

This is a lambda that turns Contact Us form submissions into Salesforce cases.

## Input

It expects the following JSON format in the request's body:

```
{
    "topic": string,
    "subtopic"?: string, // Optional because not all topics have subtopics
    "subsubtopic"?: string, // Optional because not all subtopics have subsubtopics
    "name": string,
    "email": string,
    "subject": string,
    "message": string,
    "attachment"?: { // Attachments are optional
        "name": string,
        "contents": base64 encoded string, // File contents
    }
}
```

## Output

Once the request has been processed a response with an appropriate status code will be provided. The body of the request
 will include details in the following JSON format.

```
{
    "success": boolean,
    "error"?: string, // Error message only present if success is false
}
```

## Errors

This lambda is designed to handle errors and exceptions gracefully and always return a response with an appropriate
status code. Alarms have been added to notify of any issues that might arise.

### 4XX Errors

**CAUSE**: 4xx errors mean the contents of the requests are invalid. Looking at the
 [logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fcontact-us-api-PROD)
 will give a better understanding of what's going on but this will always be either an empty or a malformed request.

**IMPACT**: These requests are not (cannot) be entered to Salesforce.

**FIX**: Check this lambda for changes to how the request is decoded. Check the source of the requests
 (manage-frontend) for changes to how the request is constructed.

### 5XX Errors

**CAUSE**: 5xx errors could mean one of 3 things:

1. Failed to obtain all environment variables;
2. Failed to contact Salesforce endpoint;
3. Error decoding Salesforce's responses;

The [lambda logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fcontact-us-api-PROD)
 will provide more details regarding which of these is happening and where in the code.

**IMPACT**: These requests are not entered into Salesforce.

**FIX**: For each corresponding cause:

1. Check the Cloud Formation template for environment variables and make sure all the necessary key-values are present
1. Check the Salesforce endpoints are correct and online.
1. Check this lambda for changes to how the relevant Salesforce response is decoded. Check this lambda for changes to
 the version of the Salesforce API used and if that version's responses are the same the lambda expects.