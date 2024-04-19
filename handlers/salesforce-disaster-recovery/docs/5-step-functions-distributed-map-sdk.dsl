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

            dsk1 = softwareSystem "SDK HTTP invoke 1"
            dsk2 = softwareSystem "SDK HTTP invoke N"
           

            map -> dsk1 "Handles batches"
            map -> dsk2 "Handles batches"
            map -> s3 "Gets CSV from"
            map -> s3 "Saves back results to S3"
            dsk1 -> zuora "Updates accounts"
            dsk2 -> zuora "Updates accounts"
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
