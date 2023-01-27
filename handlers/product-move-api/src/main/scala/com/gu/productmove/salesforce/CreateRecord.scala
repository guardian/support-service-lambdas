package com.gu.productmove.salesforce

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.salesforce.CreateRecord.{CreateRecordRequest, CreateRecordResponse}
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

object CreateRecordLive:
  val layer: URLayer[SalesforceClient, CreateRecord] = ZLayer.fromFunction(CreateRecordLive(_))

private class CreateRecordLive(salesforceClient: SalesforceClient) extends CreateRecord:
  override def create(requestBody: CreateRecordRequest): IO[String, CreateRecordResponse] =
    salesforceClient.post[CreateRecordRequest, CreateRecordResponse](
      requestBody,
      uri"/services/data/v55.0/sobjects/Subscription_Rate_Plan_Update__c/",
    )

trait CreateRecord:
  def create(requestBody: CreateRecordRequest): IO[String, CreateRecordResponse]

object CreateRecord {
  case class CreateRecordRequest(
      SF_Subscription__c: String,
      Type__c: String = "Product Switch",
      Source__c: String = "MMA",
      Previous_Amount__c: BigDecimal,
      Previous_Product_Name__c: String,
      Previous_Rate_Plan_Name__c: String,
      New_Rate_Plan_Name__c: String,
      Requested_Date__c: LocalDate,
      Effective_Date__c: LocalDate,
      Refund_Amount__c: BigDecimal,
  )
  given JsonEncoder[CreateRecordRequest] = DeriveJsonEncoder.gen[CreateRecordRequest]

  case class CreateRecordResponse(id: String)
  given JsonDecoder[CreateRecordResponse] = DeriveJsonDecoder.gen[CreateRecordResponse]

  def create(requestBody: CreateRecordRequest): ZIO[CreateRecord, String, CreateRecordResponse] =
    ZIO.serviceWithZIO[CreateRecord](_.create(requestBody))
}
