package com.gu.productmove.salesforce

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.salesforce.GetSfSubscription.GetSfSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object GetSfSubscriptionLive:
  val layer: URLayer[SalesforceClient, GetSfSubscription] = ZLayer.fromFunction(GetSfSubscriptionLive(_))

private class GetSfSubscriptionLive(salesforceClient: SalesforceClient) extends GetSfSubscription :
  override def get(subscriptionNumber: String): IO[String, GetSfSubscriptionResponse] =
    salesforceClient.get[GetSfSubscriptionResponse](uri"/services/data/v55.0/sobjects/SF_Subscription__c/Name/$subscriptionNumber")

trait GetSfSubscription:
  def get(subscriptionNumber: String): IO[String, GetSfSubscriptionResponse]

object GetSfSubscription {

  case class GetSfSubscriptionResponse(Id: String)
  given JsonDecoder[GetSfSubscriptionResponse] = DeriveJsonDecoder.gen[GetSfSubscriptionResponse]

  def get(subscriptionNumber: String): ZIO[GetSfSubscription, String, GetSfSubscriptionResponse] =
    ZIO.serviceWithZIO[GetSfSubscription](_.get(subscriptionNumber))
}
