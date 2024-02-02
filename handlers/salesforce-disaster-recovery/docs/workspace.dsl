workspace {

    model {
        // People
        dev = person "Guardian Developer" "A software developer within the Guardian"
        csr = person "Guardian CSR" "A Customer Service Representative within the Guardian"

        // SaaS
        zuora = softwareSystem "Zuora" "Subscription management SaaS platform" "Database, SaaS"
        salesforce = softwareSystem "Salesforce" "Customer relationship management (CRM)" "Database, SaaS"
        ownBackup = softwareSystem "Own Backup" "Backup solution for restoring data in the event of a disaster" "Database, SaaS"

        // Systems
        maliciousSoftware = softwareSystem "Malicious Software" "Intrusive software developed by cybercriminals to steal data and damage computer systems"
        salesforceDisasterRecovery = softwareSystem "Salesforce Disaster Recovery" "Serverless system in charge of syncing the new Salesforce IDs with the Zuora accounts"

        // Relationships
        csr -> salesforce "Supports customers via"
        dev -> salesforceDisasterRecovery "Triggers after the Own Backup has completed"
        dev -> ownBackup "Triggers after a data loss event"
        zuora -> salesforce "Synchronizes data from Zuora through Zuora 360"
        ownBackup -> salesforce "Restores data with new IDs"
        maliciousSoftware -> salesforce "Compromises data via ransomware attacks"
        salesforceDisasterRecovery -> salesforce "Reads the new IDs"
        salesforceDisasterRecovery -> zuora "Updates the compromised accounts with the new Salesforce IDs"
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
