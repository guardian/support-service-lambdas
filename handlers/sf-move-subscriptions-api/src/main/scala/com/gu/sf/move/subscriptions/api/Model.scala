package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionData(zuoraSubscriptionId: String, sfAccountId: String, sfFullContactId: String)

trait MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceSuccess(message: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceError(message: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionApiError(message: String)

final case class ConfigError(message: String)

final case class MoveSubscriptionApiConfig(zuoraBaseUrl: String, zuoraClientId: String, zuoraSecret: String)

final case class ExampleReqDoc(method: String, path: String, body: MoveSubscriptionData)

final case class MoveSubscriptionApiRoot(description: String, exampleRequests: List[ExampleReqDoc])

