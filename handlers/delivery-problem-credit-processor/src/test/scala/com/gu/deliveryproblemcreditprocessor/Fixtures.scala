package com.gu.deliveryproblemcreditprocessor

import com.gu.zuora.subscription.Subscription
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.Assertions

import scala.io.Source

object Fixtures extends Assertions {
  def subscriptionFromJson(resource: String): Subscription = {
    val subscriptionRaw = Source.fromResource(resource).mkString
    decode[Subscription](subscriptionRaw).getOrElse(fail(s"Could not decode $subscriptionRaw"))
  }
}
