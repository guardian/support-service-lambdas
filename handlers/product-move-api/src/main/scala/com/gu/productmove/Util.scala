package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import zio.{IO, ZIO}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}

object Util {
  def getFromEnv(prop: String): Either[ErrorResponse, String] =
    sys.env.get(prop).toRight(InternalServerError(s"Could not obtain $prop"))
}
