package com.gu.payment_failure_comms.models

sealed trait Failure {
  def kind: String
  def details: String
}

case class ConfigFailure(details: String) extends Failure {
  val kind: String = "Config"
}

case class BrazeRequestFailure(details: String) extends Failure {
  val kind: String = "Braze Request"
}

case class BrazeResponseFailure(details: String) extends Failure {
  val kind: String = "Braze Response"
}
