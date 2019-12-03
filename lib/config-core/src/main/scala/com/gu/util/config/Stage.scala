package com.gu.util.config

case class Stage(value: String) extends AnyVal {
  def isProd: Boolean = value == "PROD"
}
