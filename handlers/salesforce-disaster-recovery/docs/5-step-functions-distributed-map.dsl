// Read the README.md on how to visualise the diagrams in vscode

workspace {

    model {
        // People
        // dev = person "Guardian Developer"
        // csr = person "Customer Service Representative"

        // SaaS
        zuora = softwareSystem "Zuora" "" "Database, SaaS"
        s3 = softwareSystem "S3" "" "Database, SaaS"

        group "State machine" {

            map = softwareSystem "Distributed Map"

            lambda2 = softwareSystem "Lambda 1"
            lambda3 = softwareSystem "Lambda N"
           

            map -> lambda2 "Handles batches"
            map -> lambda3 "Handles batches"
            map -> s3 "Gets CSV from"
            map -> s3 "Saves back results to S3"
            lambda2 -> zuora "Updates accounts"
            lambda3 -> zuora "Updates accounts"
        }
    }

    views {
         systemlandscape "SystemLandscape" {
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

            element "Queue" {
                shape Pipe
            }

            element "SaaS" {
                background #7C7C7C
                color #ffffff
            }

        }
    }
}
