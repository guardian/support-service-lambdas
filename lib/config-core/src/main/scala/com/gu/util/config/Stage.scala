package com.gu.util.config

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
}

object Stage {

  val Dev: Stage = Stage("DEV")
  val Code: Stage = Stage("CODE")
  val Prod: Stage = Stage("PROD")

  def apply(): Stage = sys.env.get("Stage").fold(Dev)(Stage(_))
}
