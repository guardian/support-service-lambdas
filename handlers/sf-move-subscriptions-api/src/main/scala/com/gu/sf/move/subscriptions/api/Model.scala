package com.gu.sf.move.subscriptions.api

case class MoveSubscriptionReqBody(sfContactId: String, zuoraSubscriptionId: String)

case class SubscriptionMoved(message: String)
