package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionData(sfAccountId: String, sfFullContactId: String, zuoraSubscriptionId: String)

trait MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceSuccess(message: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionServiceError(message: String) extends MoveSubscriptionServiceResponse

final case class MoveSubscriptionApiError(message: String)

final case class MoveSubscriptionApiRoot(description: String)

final case class ConfigError(message: String)

final case class MoveSubscriptionApiConfig(zuoraBaseUrl: String, zuoraClientId: String, zuoraSecret: String)

