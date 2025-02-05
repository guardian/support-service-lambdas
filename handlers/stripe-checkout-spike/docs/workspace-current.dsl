workspace {

    model {
        reader = person "Guardian Reader" "A reader of theguardian.com"
        supportFrontend = softwareSystem "Support Frontend" "In charge of rendering the payment page"
        paymentApi = softwareSystem "Payment API" "In charge of handling single contributions requests"
        stripe = softwareSystem "Stripe" "Payments platform" "SaaS"
        supporterProductDataStore = softwareSystem "Supporter Product Data Store" "In charge of user benefits"
        acquisitionsEventBus = softwareSystem "Acquisitions Event Bus" "In charge of saving events in BigQuery"
        identityApi = softwareSystem "Identity API" "API for communicating with Guardian Identity domain"
        brazeEmailsQueue = softwareSystem "Braze Emails Queue" "In charge of sending emails"
        contributionsStoreQueue = softwareSystem "Contributions Store Queue" "In charge of saving records in the contributions store"

        reader -> supportFrontend "Makes a single contribution via" "iframe"
        supportFrontend -> paymentApi "Processes payment via" "HTTP"
        paymentApi -> stripe "Processes payment via" "HTTP"
        paymentApi -> identityApi "Gets or creates identity in" "HTTP"
        paymentApi -> brazeEmailsQueue "Sends message to" "HTTP"
        paymentApi -> contributionsStoreQueue "Sends message to" "HTTP"
        paymentApi -> supporterProductDataStore "Saves record in" "HTTP"
        paymentApi -> acquisitionsEventBus "Sends event to" "HTTP"
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
