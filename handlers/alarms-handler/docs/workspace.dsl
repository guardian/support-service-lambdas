workspace {
    model {
        dev = person "Guardian Developer" "A software developer within the Guardian"

        googleChat = softwareSystem "Google Chat" "Group messaging for professional collaboration" "SaaS"
        trello = softwareSystem "Trello" "Project management tool" "SaaS"

        existingApplication = softwareSystem "Existing application"

        AlarmsHandler = softwareSystem "Membership Alarms Handler" "System in charge of routing AWS membership alarms to the right destinations" {
            snsTopic = container "SNS Topic"
            queue = container "Queue"
            lambda = container "Lambda"
        }

        existingApplication -> snsTopic "Triggers"
        snsTopic -> queue "Sends message"
        queue -> lambda "Sends message"
        lambda -> googleChat "Starts thread if alarm is urgent"
        lambda -> trello "Creates card always"
        dev -> googleChat "Is notified by"
        dev -> trello "Views"
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
