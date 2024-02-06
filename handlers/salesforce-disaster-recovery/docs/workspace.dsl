workspace {

    model {
        // People
        dev = person "Guardian Developer" "A software developer within the Guardian"

        // SaaS
        zuora = softwareSystem "Zuora" "Subscription management SaaS platform" "Database, SaaS"
        salesforce = softwareSystem "Salesforce" "Customer relationship management PaaS platform" "Database, SaaS"
        ownBackup = softwareSystem "Own Backup" "Third party backup solution for restoring Salesforce data in the event of a disaster" "Database, SaaS"

        // Systems
        maliciousSoftware = softwareSystem "Malicious Software" "Intrusive software developed by cybercriminals to steal data and damage systems"
        salesforceDisasterRecovery = softwareSystem "Salesforce Disaster Recovery" "System in charge of re-syncing Zuora accounts with new Salesforce IDs" {
            stepFunction = container "State Machine" "Orchestrates the re-syncing procedure" "AWS Step Functions"
        }

        // Relationships
        maliciousSoftware -> salesforce "1. Compromises data in" "Ransomware attacks"
        dev -> ownBackup "2. Triggers after a data loss event" "Dashboard"
        ownBackup -> salesforce "3. Restores data with new IDs" "Third party system"
        dev -> stepFunction "4. Triggers after the Own Backup has completed" "AWS Console"
        stepFunction -> salesforce "5. Reads the new IDs" "Salesforce Bulk API"
        stepFunction -> zuora "6. Updates the compromised accounts with the new Salesforce IDs" "Zuora API"
        zuora -> salesforce "7. Synchronizes data from Zuora to" "Zuora 360"
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        systemContext salesforceDisasterRecovery "SystemContext" {
            include *
            autoLayout
        }
        
        container salesforceDisasterRecovery "SystemContainer" {
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
