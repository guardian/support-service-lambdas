package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionReqBody(zuoraSubscriptionId: String, sfAccountId: String, sfFullContactId: String)

trait MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceSuccess(message: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceError(error: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionApiError(error: String)

final case class MoveSubscriptionApiSuccess(message: String)

final case class MoveSubscriptionApiConfig(zuoraBaseUrl: String, zuoraClientId: String, zuoraSecret: String)

final case class ExampleReqDoc(method: String, path: String, body: MoveSubscriptionReqBody)

final case class MoveSubscriptionApiRoot(description: String, exampleRequests: List[ExampleReqDoc])

