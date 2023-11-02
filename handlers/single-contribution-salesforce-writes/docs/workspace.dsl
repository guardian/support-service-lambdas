workspace {

    model {
        reader = person "Guardian Reader" "A reader of theguardian.com."
        
        group "Guardian Organisation" {
            csr = person "Customer Service Staff" "Customer service staff within the Guardian."
            developer = person "Guardian Developer" "Software Developer within the Guardian Supporter Revenue Engine Team."
            internetCheckoutSystem = softwareSystem "Internet Checkout System" "Allows readers to view contribution options and make payments."

            singleContributionSalesforceWrites = softwareSystem "Asynchronous Processing System" "Processes single contributions made via payment-api and creates records in Salesforce." "My Software System" {
                eventBusRule = container "Acquisition Bus Rule" {
                    description "Filters events with source starting with 'payment-api'."
                    tags "Amazon Web Services - EventBridge"
                }
                sqsQueue = container "SQS Queue" {
                    description "Stores 'payment-api' messages"
                    tags "Amazon Web Services - Simple Queue Service SQS"
                }
                deadLetterQueue = container "Dead Letter Queue" {
                    description "Stores messages that haven't been processed successfully"
                    tags "Amazon Web Services - Simple Queue Service SQS"
                }
                lambdaFunction = container "Lambda Function" {
                    description "Processes the message and creates a single contribution record in Salesforce."
                    tags "Amazon Web Services - Lambda"
                }
                cloudWatchAlarm = container "CloudWatch Alarm" {
                    description "Listens to the metric of at least one message present in the DLQ"
                    tags "Amazon Web Services - CloudWatch Alarm"
                }
            }
            salesforceCrm = softwareSystem "Salesforce CRM" {
                description "Stores customers subscriptions, contributions and accounts details."
                tags "Salesforce CRM"
            }
        }

        # relationships between people and software systems
        reader -> internetCheckoutSystem "Makes a single contribution via" "HTTPS"
        csr -> salesforceCrm "Manages single contributions using" "Salesforce Console"
        reader -> csr "Asks questions to" "Telehpone / Chat"
        developer -> deadLetterQueue "Debugs failed messages in" "AWS Console"
        cloudWatchAlarm -> developer "Notifies failures to" "Email"
        
        # relationships between software systems
        internetCheckoutSystem -> singleContributionSalesforceWrites "Sends acquisition events to" "AWS Event Bridge"
        singleContributionSalesforceWrites -> salesforceCrm "Creates single contribution records in" "JSON / HTTP"
        
        # relationships to/from containers
        internetCheckoutSystem -> eventBusRule "Sends acquisition events to" "AWS Event Bridge"
        lambdaFunction -> salesforceCrm "Creates single contribution records in" "JSON / HTTP"
        
        # relationships to/from components
        eventBusRule -> sqsQueue "Sends 'payment-api' messages to" "JSON / HTTP"
        sqsQueue -> lambdaFunction "Sends events to" "Polling"
        deadLetterQueue -> sqsQueue "Redrives messages into" "JSON / HTTP"
        lambdaFunction -> deadLetterQueue "Sends messages that haven't been processed correctly to" "JSON / HTTP"
        deadLetterQueue -> cloudWatchAlarm "Triggers" "CloudWatch Metric"
    }

    views {
        systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        systemContext singleContributionSalesforceWrites "SystemContext" {
            include *
            autoLayout
        }
        
        container singleContributionSalesforceWrites "SystemContainer" {
            include *
            autoLayout
        }

        styles {
            element "Person" {
                shape person
                background #08427b
                color #ffffff
            }
            element "Software System" {
                background #999999
                color #ffffff
            }
            element "My Software System" {
                background #1168bd
                color #ffffff
            }
            element "Container" {
                background #1168bd
                color #ffffff
            }
            element "Amazon Web Services - Simple Queue Service SQS" {
                shape Pipe
            }
            element "Salesforce CRM" {
                shape Cylinder
            }
            element "Amazon Web Services - CloudWatch Alarm" {
                shape Circle
            }
            element "Amazon Web Services - CloudWatch Alarm" {
                color #ffffff
            }
        }
        
    }
    
}
