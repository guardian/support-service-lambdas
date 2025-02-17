workspace {
    model {
        reader = person "Guardian Reader"
        dev = person "Guardian Dev"
        csr = person "Guardian CSR"
        zuora = softwareSystem "Zuora" "" "Database"
        eventBus = softwareSystem "Event Bus" "" "Queue"
        salesforce = softwareSystem "Salesforce" "" "Database"
        mma = softwareSystem "MMA"

        cancelledSubsProcessor = softwareSystem "Cancelled Subs Processor" {
            stepFunction = container "Step Function"
        }

        reader -> csr "Asks for help to"
        reader -> mma "Cancels their sub in"
        csr -> salesforce "Manages users in"
        zuora -> eventBus "Sends auto-cancellation events to" "Lambda Function URL"
        salesforce -> eventBus "Sends CSR cancellation events to"
        mma -> eventBus "Sends self-served cancellation events to"
        eventBus -> stepFunction "Sends events to"
        stepFunction -> zuora "Cleans up"
        stepFunction -> dev "Notifies failures"
    }

    views {
         systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        container cancelledSubsProcessor "SystemContainer" {
            include * reader dev csr mma salesforce
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
