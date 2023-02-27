package com.gu.productmove

object Util {
  def getFromEnv(prop: String): Either[String, String] =
    sys.env.get(prop).toRight(s"Could not obtain $prop")
}
