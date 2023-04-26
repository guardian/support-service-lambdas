package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import zio.{IO, ZIO}

object Util {
  def getFromEnv(prop: String): Either[String, String] = {
    sys.env.get(prop).toRight(s"Could not obtain $prop")
  }
}
