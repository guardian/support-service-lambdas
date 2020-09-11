package com.gu.util.config

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
}

object Stage {

  val Dev: Stage = Stage("DEV")
  val Code: Stage = Stage("CODE")
  val Prod: Stage = Stage("PROD")

  def apply(): Stage = Option(System.getenv("Stage")).fold(Dev)(stage => Stage(stage))
}
