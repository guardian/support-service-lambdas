package com.gu.sf.move.subscriptions.api

final case class MoveSubscriptionReqBody(sfAccountId: String, sfFullContactId: String, zuoraSubscriptionId: String)

final case class MoveSubscriptionRes(message: String)

final case class MoveSubscriptionApiError(message: String)

final case class MoveSubscriptionApiRoot(description: String)
