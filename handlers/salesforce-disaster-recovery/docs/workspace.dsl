// Read the README.md on how to visualise the diagrams in vscode

workspace {

    model {
        // People
        dev = person "Guardian Developer"
        csr = person "Customer Service Representative"

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
        maliciousSoftware -> salesforce "Compromises data in" 
        dev -> ownBackup "Triggers after a data loss event" 
        ownBackup -> salesforce "Restores data with new IDs" 
        zuora -> salesforce "Synchronizes data from Zuora to" 
        dev -> stateMachine "Triggers after the Own Backup has completed"
        stateMachine -> salesforce "Reads the new IDs from" 
        stateMachine -> queryResultCsv "Saves CSV to process in" "SDK"
        stateMachine -> zuora "Updates the compromised accounts with the new IDs in" 
        stateMachine -> failedRowsCsv "Saves accounts that failed to update in" 
        dev -> failedRowsCsv "Debugs accounts that failed to update" 
        csr -> salesforce "Supports customers via"

        iteration1 = softwareSystem "Iteration 1" {
            container1 = container "Containerised solution"
            container1 -> zuora "Updates accounts"
            container1 -> salesforce "Gets CSV from"
        }
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            exclude ->ownBackup
            exclude ->maliciousSoftware
            exclude ->salesforceDisasterRecovery
            autoLayout
        }
        
        container salesforceDisasterRecovery "SystemContainer" {
            include *
            autoLayout
        }

        container iteration1 "Iteration1" {
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
