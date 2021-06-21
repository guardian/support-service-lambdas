package com.gu.payment_failure_comms.models

sealed trait Failure {
  def kind: String
  def details: String
}

case class ConfigFailure(details: String) extends Failure {
  val kind: String = "Config"
}
