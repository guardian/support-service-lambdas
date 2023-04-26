package com.gu.productmove

import zio.ZIO

object Util {
  def getFromEnv(prop: String): Either[String, String] =
    sys.env.get(prop).toRight(s"Could not obtain $prop")
}
