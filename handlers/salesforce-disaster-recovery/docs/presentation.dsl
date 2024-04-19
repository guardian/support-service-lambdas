// Read the README.md on how to visualise the diagrams in vscode

workspace {

    model {
        // People
        // dev = person "Guardian Developer" "A software developer within the Guardian"
        csr = person "Customer Service Representative"

        // SaaS
        zuora = softwareSystem "Zuora" "Subscription management SaaS platform" "Database, SaaS"
        salesforce = softwareSystem "Salesforce" "Customer relationship management PaaS platform" "Database, SaaS, Salesforce"

        // Systems
        ourSoftware = softwareSystem "Supporter Revenue Software Systems"

        ourSoftware -> zuora "Updates"
        csr -> salesforce "Uses"
        zuora -> salesforce "Syncs to via Zuora 360"
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

            element "SaaS" {
                background #7C7C7C
                color #ffffff
            }

        }
    }
}
