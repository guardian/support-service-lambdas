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

            lambda = softwareSystem "Lambdalith"
            lambda -> lambda "Restarts every 15 minutes"
            // lambda2 = softwareSystem "Lambda 2"
            lambda -> s3 "Gets CSV from"
            lambda -> zuora "Updates as many accounts as possible"
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
