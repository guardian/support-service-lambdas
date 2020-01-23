package com.gu.creditprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.CreditProduct

case class CreditProductSet(
  prod: CreditProduct,
  code: CreditProduct,
  dev: CreditProduct
)

object CreditProductSet {
  def forStage(stage: Stage): CreditProduct = ???
}
