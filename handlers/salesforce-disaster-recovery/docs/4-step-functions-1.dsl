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

            map = softwareSystem "Inline Map"
            lambda = softwareSystem "Custom Lambda"

            lambda1 = softwareSystem "Lambda 1"
            lambda2 = softwareSystem "Lambda N"


            lambda -> s3 "Gets CSV from"
            lambda -> map "Creates chunks array"
            map -> lambda1 "Handles execution"
            map -> lambda2 "Handles execution"
            lambda1 -> zuora "Updates batch of 50 accounts"
            lambda2 -> zuora "Updates batch of 50 accounts"
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
