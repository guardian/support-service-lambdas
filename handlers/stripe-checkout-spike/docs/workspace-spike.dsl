workspace {

    model {
        reader = person "Guardian Reader" "A reader of theguardian.com"
        stripe = softwareSystem "Stripe" "Payments platform" "SaaS"
        supporterProductDataStore = softwareSystem "Supporter Product Data Store" "In charge of user benefits"
        acquisitionsEventBus = softwareSystem "Acquisitions Event Bus" "In charge of saving events in BigQuery"
        identityApi = softwareSystem "Identity API" "API for communicating with Guardian Identity domain"
        brazeEmailsQueue = softwareSystem "Braze Emails Queue" "In charge of sending emails"
        contributionsStoreQueue = softwareSystem "Contributions Store Queue" "In charge of saving records in the contributions store"
        stripeCheckoutSpike = softwareSystem "Stripe checkout spike" "Serverless system in charge of handling post payment events" {
            eventBus = container "Event bus" "" "Event Bridge" "Queue"
            sqsLambda = container "SQS + lambda" "" "SQS + Lambda" "Queue"
            eventBus -> sqsLambda "Sends filtered events to" "AWS Rules"
        }

        reader -> stripe "Makes a single contribution via" "Stripe hosted page"
        stripe -> eventBus "Sends 'checkout.session.completed' event to" "Partner event bus" "HTTP"
        sqsLambda -> identityApi "Gets or creates identity in" "HTTP"
        sqsLambda -> brazeEmailsQueue "Sends message to" "HTTP"
        sqsLambda -> contributionsStoreQueue "Sends message to" "HTTP"
        sqsLambda -> supporterProductDataStore "Saves record in" "HTTP"
        sqsLambda -> acquisitionsEventBus "Sends event to" "HTTP"
    }

    views {
        systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        
        container stripeCheckoutSpike "SystemContainer" {
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
