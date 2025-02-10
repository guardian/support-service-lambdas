workspace {
    model {
        dev = person "Guardian Dev" ""
        bigQuery = softwareSystem "BigQuery" "" "Database" 
        zuora = softwareSystem "Zuora" "" "SaaS"

        incompleteCancellationProcessor = softwareSystem "Incomplete Cancellation Processor" "TBC" {
            s3 = container "S3" "" "" "File"
            stepFunction = container "Step Function"
        }

        stepFunction -> bigQuery "1. Queries"
        stepFunction -> s3 "2. Saves query result"
        stepFunction -> s3 "3. Reads input"
        stepFunction -> zuora "4. Updates"
        stepFunction -> dev "5. Notifies failures"
        dev -> stepFunction "6. Redrives"
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
