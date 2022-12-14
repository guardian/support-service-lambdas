package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.functional.syntax._
import play.api.libs.json._

object GetAccountSummary {

  case class AccountId(value: String) extends AnyVal

  case class AccountSummaryResult(
      accountId: AccountId,
      billToLastName: String,
      billToPostcode: Option[String],
      soldToLastName: String,
      soldToPostcode: Option[String],
      identityId: Option[String],
  )

  implicit val reads: Reads[AccountSummaryResult] =
    (
      (__ \ "basicInfo" \ "id").read[String].map(AccountId.apply) and
        (__ \ "billToContact" \ "lastName").read[String] and
        (__ \ "billToContact" \ "zipCode").readNullable[String] and
        (__ \ "soldToContact" \ "lastName").read[String] and
        (__ \ "soldToContact" \ "zipCode").readNullable[String] and
        (__ \ "basicInfo" \ "IdentityId__c").readNullable[String]
    )(AccountSummaryResult.apply _)

  def apply(requests: Requests)(accountId: AccountId): ClientFailableOp[AccountSummaryResult] =
    requests.get[AccountSummaryResult](s"accounts/${accountId.value}/summary")

}
