workspace {
    model {
        dev = person "Guardian Developer" "A software developer within the Guardian"

        googleChat = softwareSystem "Google Chat" "Group messaging for professional collaboration" "SaaS"
        trello = softwareSystem "Trello" "Project management tool" "SaaS"

        existingApplication = softwareSystem "Existing application" "Any existing application within the AWS membership account"

        AlarmsHandler = softwareSystem "Alarms Handler" "System in charge of routing AWS membership alarms to the right destinations" {
            snsTopic = container "Topic" "Receives all alarms within the AWS membership account" "SNS" ""
            queue = container "Queue" "Stores alarm events with DLQ to handle errors" "SQS" "Queue"
            lambda = container "Function" "Consumes all alarm events and directs them to the appropriate destinations" "Lambda"
        }

        existingApplication -> snsTopic "Triggers" "Cloud Watch"
        snsTopic -> queue "Sends message" "AWS Events"
        queue -> lambda "Sends message" "AWS Events"
        lambda -> googleChat "Starts thread if alarm is urgent" "Webhook"
        lambda -> trello "Creates card always" "HTTP"
        dev -> googleChat "Is notified by" "Chat message"
        dev -> trello "Views" "Dasbhoard"
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        container AlarmsHandler "SystemContainer" {
            include *
            autoLayout
        }

        styles {
            element "Person" {
                shape person
                background #08427b
                color #ffffff
            }

            element "Database" {
                shape Cylinder
            }

            element "Queue" {
                shape Pipe
            }

            element "File" {
                shape Folder
            }

            element "SaaS" {
                background #7C7C7C
                color #ffffff
            }

        }
    }
}
