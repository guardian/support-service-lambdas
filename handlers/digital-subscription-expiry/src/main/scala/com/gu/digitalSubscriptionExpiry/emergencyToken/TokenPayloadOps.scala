package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.{Guardian, SevenDay, SubscriptionCode, TokenPayload}
import org.joda.time.LocalDate

object TokenPayloadImplicits {

  implicit class TokenPayloadOps(payload: TokenPayload) {
    def expiryDate: LocalDate = payload.creationDate.plus(payload.period).plusDays(1).toLocalDate
  }

  implicit class SubscriptionCodeOps(subCode: SubscriptionCode) {
    def asString = subCode match {
      case SevenDay => "SevenDay"
      case Guardian => "Guardian"
    }
  }
}
