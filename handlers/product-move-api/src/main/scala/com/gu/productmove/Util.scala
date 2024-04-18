package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import zio.{Cause, IO, ZIO}

object Util {
  def getFromEnv(prop: String): Either[Throwable, String] =
    sys.env.get(prop).toRight(new Throwable(s"Could not obtain $prop"))
}
