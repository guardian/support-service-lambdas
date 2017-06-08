package com.gu.paymentFailure

import java.lang.System.getenv

trait Config {
  def user: String
  def pass: String
}

object EnvConfig extends Config {
  override def user: String = getenv("User")
  override def pass: String = getenv("Pass")
}
