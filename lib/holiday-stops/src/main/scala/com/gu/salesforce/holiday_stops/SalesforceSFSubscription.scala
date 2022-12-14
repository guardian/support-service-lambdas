package com.gu.salesforce.holiday_stops

import ai.x.play.json.Jsonx
import com.gu.salesforce.SalesforceConstants._
import com.gu.salesforce.SalesforceQueryConstants.contactToWhereClausePart
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import com.gu.salesforce.{Contact, RecordsWrapperCaseClass}
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.zuora.subscription.SubscriptionName
import play.api.libs.json.{JsValue, Json}

object SalesforceSFSubscription extends Logging {

  private val sfSubscriptionsSfObjectRef = "SF_Subscription__c"

  object SubscriptionForSubscriptionNameAndContact {

    case class SFSubscriptionId(value: String) extends AnyVal
    implicit val formatHolidayStopRequestId = Jsonx.formatInline[SFSubscriptionId]

    case class MatchingSubscription(
        Id: SFSubscriptionId,
        Name: SubscriptionName,
        Product_Name__c: ProductName,
    )
    implicit val readsMatchingSubscription = Json.reads[MatchingSubscription]
    implicit val readsResults = Json.reads[RecordsWrapperCaseClass[MatchingSubscription]]

    def apply(
        sfGet: HttpOp[RestRequestMaker.GetRequestWithParams, JsValue],
    ): (SubscriptionName, Contact) => ClientFailableOp[Option[MatchingSubscription]] =
      sfGet
        .setupRequestMultiArg(toRequest _)
        .parse[RecordsWrapperCaseClass[MatchingSubscription]]
        .map(_.records.headOption)
        .runRequestMultiArg

    def toRequest(subscriptionName: SubscriptionName, contact: Contact) = {
      val soqlQuery = s"SELECT Id, Name, Product_Name__c " +
        s"FROM $sfSubscriptionsSfObjectRef " +
        s"WHERE Name = '${subscriptionName.value}' " +
        s"AND ${contactToWhereClausePart(contact)} "
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequestWithParams(RelativePath(soqlQueryBaseUrl), UrlParams(Map("q" -> soqlQuery)))
    }

  }

}
