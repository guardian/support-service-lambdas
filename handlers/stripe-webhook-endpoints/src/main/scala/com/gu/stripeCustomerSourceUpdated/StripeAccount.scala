package com.gu.stripeCustomerSourceUpdated

sealed abstract class StripeAccount(val string: String)

object StripeAccount {

  case object GNM_Membership_AUS extends StripeAccount("GNM_Membership_AUS")

  case object GNM_Membership extends StripeAccount("GNM_Membership")

  val all = Seq(GNM_Membership, GNM_Membership_AUS)

  def fromString(string: String): Option[StripeAccount] = {
    all.find(_.string == string)
  }
}
