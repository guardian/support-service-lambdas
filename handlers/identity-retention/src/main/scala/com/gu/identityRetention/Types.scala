package com.gu.identityRetention

import java.time.LocalDate

object Types {

  case class IdentityId(value: String)
  case class AccountId(value: String)
  case class ProductHolding(
      identityId: String,
      product: String,
      status: String,
      effectiveLapsedDate: LocalDate,
      effectiveDeletionDate: LocalDate,
  )

}
