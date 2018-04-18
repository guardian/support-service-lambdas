package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.{Guardian, SevenDay, SubscriptionCode, TokenPayload}
import java.time.LocalDate

object TokenPayloadImplicits {

  implicit class TokenPayloadOps(payload: TokenPayload) {
    def expiryDate: LocalDate = {
      val jodaExpiryDate = payload.creationDate.plus(payload.period).plusDays(1)
      LocalDate.of(jodaExpiryDate.getYear, jodaExpiryDate.getMonthOfYear, jodaExpiryDate.getDayOfMonth)
    }
  }

  implicit class SubscriptionCodeOps(subCode: SubscriptionCode) {
    def asString = subCode match {
      case SevenDay => "SevenDay"
      case Guardian => "Guardian"
    }
  }
}
