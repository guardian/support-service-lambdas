package com.gu.newproduct.api.addsubscription.email.contributions

import com.gu.newproduct.api.addsubscription.email.DataExtensionName
import play.api.libs.json.Json

case class ContributionFields(
  EmailAddress: String,
  created: String,
  amount: String,
  currency: String,
  edition: String,
  name: String,
  product: String,
  `account name`: Option[String] = None,
  `account number`: Option[String] = None,
  `sort code`: Option[String] = None,
  `Mandate ID`: Option[String] = None,
  `first payment date`: Option[String] = None,
  `payment method`: Option[String] = None
)

object ContributionFields {
  implicit val writes = Json.writes[ContributionFields]

  implicit val dexName = new DataExtensionName[ContributionFields]("regular-contribution-thank-you")
}
