package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionReqBody(
    zuoraSubscriptionId: String,
    sfAccountId: String,
    sfFullContactId: String,
    identityId: String,
)

final case class MoveSubscriptionApiConfig(
    zuoraBaseUrl: String,
    zuoraClientId: String,
    zuoraSecret: String,
)

final case class MoveSubscriptionApiRoot(
    description: String,
    exampleRequests: List[ExampleReqDoc],
)

final case class ExampleReqDoc(
    method: String,
    path: String,
    body: MoveSubscriptionReqBody,
)
