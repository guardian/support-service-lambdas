workspace {
    model {
        dev = person "Guardian Dev" ""
        bigQuery = softwareSystem "BigQuery" "" "Database" 
        zuora = softwareSystem "Zuora" "" "SaaS"

        incompleteCancellationProcessor = softwareSystem "Incomplete Cancellation Processor" "TBC" {
            lambda1 = container "BigQuery lambda"
            lambda2 = container "Zuora lambda"
            sqs = container "SQS" "" "" "Queue"
            dlq = container "DLQ" "" "" "Queue"
        }

        lambda1 -> bigQuery "1. Queries"
        lambda1 -> sqs "2. Sends messages to SQS"
        lambda2 -> sqs "3. Polls SQS"
        lambda2 -> zuora "4. Updates"
        lambda2 -> dlq "5. Saves failed invocations"
        dlq -> dev "6. Notifies failures"
        dev -> sqs "7. Redrives messages"
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        container incompleteCancellationProcessor "SystemContainer" {
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
