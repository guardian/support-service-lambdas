// Read the README.md on how to visualise the diagrams in vscode

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
            stateMachine = container "State Machine" "Orchestrates the re-syncing procedure" "AWS Step Functions"

            group "S3 Bucket" {
                queryResultCsv = container "query-result.csv" "Example for CODE: s3://salesforce-disaster-recovery-code/ 2024-03-25T20:49:58.918Z/ query-result.csv" "S3" "File"
                failedRowsCsv = container "failed-rows.csv" "Example for CODE: s3://salesforce-disaster-recovery-code/ 2024-03-25T20:49:58.918Z/ failed-rows.csv" "S3" "File"
            }

        }

        // Relationships
        maliciousSoftware -> salesforce "1. Compromises data in" "Attacks"
        dev -> ownBackup "2. Triggers after a data loss event" "Dashboard"
        ownBackup -> salesforce "3. Restores data with new IDs" "Third party system"
        zuora -> salesforce "7. Synchronizes data from Zuora to" "Zuora 360"
        dev -> stateMachine "4. Triggers after the Own Backup has completed" "AWS Console"
        stateMachine -> salesforce "5. Reads the new IDs from" "Salesforce Bulk API"
        stateMachine -> queryResultCsv "5A. Saves CSV to process in" "SDK"
        stateMachine -> zuora "6. Updates the compromised accounts with the new Salesforce IDs in" "Zuora API"
        stateMachine -> failedRowsCsv "6A. Saves accounts that failed to update in" "SDK"
        dev -> failedRowsCsv "7. Debugs accounts that failed to update" "AWS Console"
    }

    views {
         systemlandscape "SystemLandscape" {
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
