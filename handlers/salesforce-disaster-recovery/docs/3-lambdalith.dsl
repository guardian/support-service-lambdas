// Read the README.md on how to visualise the diagrams in vscode

workspace {

    model {
        // People
        // dev = person "Guardian Developer"
        // csr = person "Customer Service Representative"

        // SaaS
        zuora = softwareSystem "Zuora" "" "Database, SaaS"
        s3 = softwareSystem "S3" "" "Database, SaaS"

        lambda1 = softwareSystem "Lambda 1"
        lambda2 = softwareSystem "Lambda 2"
        queue = softwareSystem "SQS Queue" "" "Queue"
        queue -> lambda2 "Polls"
        lambda1 -> s3 "Gets CSV from"
        lambda1 -> queue "Sends messages"
        lambda2 -> zuora "Updates accounts"
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
