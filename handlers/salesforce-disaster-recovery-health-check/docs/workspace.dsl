workspace {
    model {
        dev = person "Guardian Developer" "A software developer within the Guardian"

        salesforceDisasterRecovery = softwareSystem "Salesforce Disaster Recovery" "System in charge of re-syncing Zuora accounts with new Salesforce IDs"
        salesforceDisasterRecoveryHealthCheck = softwareSystem "Salesforce Disaster Recovery Health Check" "Scheduled system in charge of checking whether the Salesforce Disaster Recovery system is healthy" {
            rule = container "Rule" "Triggers every Monday at 6AM" "AWS Event Bridge"
            lambda = container "Lambda" "Starts state machine execution with 'health-check-{datetime}' prefix and sends a notification if the system is not healthy" "AWS Lambda"
        }

        rule -> lambda "Triggers" "AWS Event Bridge"
        lambda -> salesforceDisasterRecovery "Triggers a weekly health check execution" "AWS SDK"
        lambda -> dev "Notifies if the system is not healthy" "SNS Topic"
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        container salesforceDisasterRecoveryHealthCheck "SystemContainer" {
            include *
            autoLayout
        }

        styles {
            element "Person" {
                shape person
                background #08427b
                color #ffffff
            }
        }
    }
}
