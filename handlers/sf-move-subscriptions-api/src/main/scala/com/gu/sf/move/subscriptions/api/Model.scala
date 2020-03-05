package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionReqBody(sfContactId: String, zuoraSubscriptionId: String)

final case class SubscriptionMoved(message: String)

final case class MoveSubscriptionApiError(message: String)

final case class MoveSubscriptionApiRoot(description: String)
