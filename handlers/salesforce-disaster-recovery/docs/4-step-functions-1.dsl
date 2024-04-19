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
            lambda = softwareSystem "Lambda"

            lambda1 = softwareSystem "Lambda 1"
            lambda2 = softwareSystem "Lambda N"


            lambda -> s3 "Gets CSV from"
            lambda -> map "Pass data to"
            map -> lambda1 "Creates chunk data"
            map -> lambda2 "Creates chunk data"
            lambda1 -> zuora "Updates accounts"
            lambda2 -> zuora "Updates accounts"
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
