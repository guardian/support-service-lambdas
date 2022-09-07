package com.gu.productmove.endpoint.cancel

import SubscriptionCancelEndpointTypes.{ExpectedInput, *}
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.productmove.endpoint.cancel.zuora.{GetSubscription, GetSubscriptionLive}
import com.gu.productmove.zuora.rest.*
import com.gu.productmove.zuora.{ZuoraCancel, ZuoraCancelLive}
import zio.IO
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import sttp.tapir.EndpointIO.Example
import sttp.tapir.*
import sttp.tapir.json.zio.jsonBody
import zio.{Clock, ZIO}

// this is the description for just the one endpoint
object SubscriptionCancelEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run("zuoraAccountId", ExpectedInput("targetProductId"))
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[Unit, Unit, (String, ExpectedInput), Unit, OutputBody, Any, ZIOApiGatewayRequestHandler.TIO] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(description = Some("Name of subscription to cancel."), examples = List(Example("A-S000001", None, None)))
      )
    val endpointDescription: PublicEndpoint[(String, ExpectedInput), Unit, OutputBody, Any] =
      endpoint
        .post
        .in("subscription-cancel").in(subscriptionNameCapture)
        .in(jsonBody[ExpectedInput].copy(info = EndpointIO.Info.empty[ExpectedInput].copy(description = Some("Information to describe the nature of the cancellation"))))
        .out(oneOf(
          oneOfVariant(sttp.model.StatusCode.Ok, jsonBody[Success].copy(info = EndpointIO.Info.empty.copy(description = Some("Successfully cancelled the subscription.")))),
          oneOfVariant(sttp.model.StatusCode.NotFound, stringBody.map(NotFound.apply)(_.textResponse).copy(info = EndpointIO.Info.empty.copy(description = Some("No such subscription.")))),
        ))
        .summary("Cancels the subscription at the soonest possible date based on the subscription type.")
        .description(
          """Cancels the existing subscription at the default/soonest date.
            |Also manages all the service comms associated with the cancellation.""".stripMargin
        )
    endpointDescription.serverLogic[TIO](run)
  }

  private def run(subscriptionName: String, postData: ExpectedInput): TIO[Right[Nothing, OutputBody]] = for {
    _ <- ZIO.log(s"INPUT: $subscriptionName: $postData")
    res <- subscriptionCancel(subscriptionName, postData)
      .provide(
        GetSubscriptionLive.layer,
        ZuoraCancelLive.layer,
        AwsS3Live.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
      )
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res)

  def asSingle[A](list: List[A], message: String): IO[String, A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber => ZIO.fail(s"subscription can't be cancelled as we didn't have a single $message: ${wrongNumber.length}: $wrongNumber")
    }

  private[productmove] def subscriptionCancel(subscriptionName: String, postData: ExpectedInput): ZIO[GetSubscription with ZuoraCancel with Stage, String, OutputBody] =
    for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName)

      // check sub info to make sure it's a supporter plus
      stage <- ZIO.service[Stage]
      zuoraIds <- ZIO.fromEither(ZuoraIds.zuoraIdsForStage(com.gu.util.config.Stage(stage.toString)))
//      _ <- zuoraIds.supporterPlusIds TODO get the supporter plus ids and fail the lambda if the one in `subscription` doesn't match

  //TODO check are we in the first 14 days, if so backdate the cancellation (and do the invoice dance)

      // should look at the relevant charge, members data api looks for the Paid Plan.
      // initially this will only apply to new prop which won't have multiple plans or charges.
      ratePlan <- asSingle(subscription.ratePlans, "ratePlan")
      charge <- asSingle(ratePlan.ratePlanCharges, "ratePlanCharge")
      chargedThroughDate <- ZIO.fromOption(charge.chargedThroughDate).orElseFail(s"chargedThroughDate is null")

      _ <- ZuoraCancel.cancel(subscriptionName, chargedThroughDate) // TODO only if postData.actuallyDoCancellation is true (rather than just a preview)
      _ <- ZIO.log("Sub cancelled as of: " + chargedThroughDate)
    } yield Success()
}
