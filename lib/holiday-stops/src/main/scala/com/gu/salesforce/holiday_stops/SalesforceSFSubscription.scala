package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json}

object SalesforceSFSubscription extends Logging {

  private val sfSubscriptionsSfObjectRef = "SF_Subscription__c"

  case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  object CheckForSubscriptionGivenNameAndIdentityID {

    case class MatchingRecord(Name: SubscriptionName)
    implicit val readsMatchingRecord = Json.reads[MatchingRecord]
    case class LookupResponse(records: List[MatchingRecord])

    def apply(sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue]): (SubscriptionName, String) => ClientFailableOp[Option[MatchingRecord]] =
      sfGet.setupRequestMultiArg(toRequest _).parse[LookupResponse](Json.reads[LookupResponse]).map(_.records.headOption).runRequestMultiArg

    def toRequest(subscriptionName: SubscriptionName, identityID: String) = {
      val soqlQuery = s"SELECT Name " +
        s"FROM $sfSubscriptionsSfObjectRef " +
        s"WHERE Name = '${subscriptionName.value}' " +
        s"AND Buyer__r.IdentityID__c = '$identityID' "
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

}
