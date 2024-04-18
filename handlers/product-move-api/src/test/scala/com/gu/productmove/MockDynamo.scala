package com.gu.productmove.zuora

import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.Dynamo
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.*

class MockDynamo(responses: Map[SupporterRatePlanItem, Unit]) extends Dynamo {

  private var mutableStore: List[SupporterRatePlanItem] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def writeItem(item: SupporterRatePlanItem): Task[Unit] = {
    mutableStore = item :: mutableStore

    responses.get(item) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"wrong input, item was $item"))
    }
  }
}

object MockDynamo {
  def requests: ZIO[MockDynamo, Nothing, List[SupporterRatePlanItem]] =
    ZIO.serviceWith[MockDynamo](_.requests)
}
