package com.gu.util.config

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
}

object Stage {
  def apply(): Stage = Option(System.getenv("Stage")).fold(Stage("DEV"))(stage => Stage(stage))
}
