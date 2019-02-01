package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.EmailQueueNames.emailQueuesFor
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora._
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, ZuoraEnvironment}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

import scala.concurrent.Future

object Handler extends Logging {
  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, AwsSQSSend.apply, RawEffects.now)
    }
}

object Steps {

  def handleRequest(
    addContribution: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addVoucher: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName]
  )(
    apiGatewayRequest: ApiGatewayRequest
  ): Future[ApiResponse] = (for {
    request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
    subscriptionName <- request.planId match {
      case MonthlyContribution | AnnualContribution => addContribution(request)
      case _ => addVoucher(request)
    }
  } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    currentDatetime: () => LocalDateTime
  ): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      zuoraConfig <- {
        val loadConfig = LoadConfigModule(stage, fetchString)
        loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      }
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      queueNames = emailQueuesFor(stage)
      currentDate = () => currentDatetime().toLocalDate

      validatorFor = DateValidator.validatorFor(currentDate, _: DateRule)
      zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
      zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
      plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraToPlanId).toApiGatewayOp("get prices from zuora catalog")
      catalog = NewProductApi.catalog(plansWithPrice.get)

      isValidStartDateForPlan = Function.uncurried(
        catalog.planForId andThen { plan =>
          StartDateValidator.fromRule(validatorFor, plan.startDateRules)
        }
      )
      createSubscription = CreateSubscription(zuoraClient.post[WireCreateRequest, WireSubscription], currentDate) _

      contributionSteps = AddContribution.wireSteps(
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        createSubscription,
        awsSQSSend,
        queueNames,
        currentDate
      )

      voucherSteps = AddVoucher.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        createSubscription,
        awsSQSSend,
        queueNames,
        currentDate
      )

      addSubSteps = handleRequest(
        addContribution = contributionSteps,
        addVoucher = voucherSteps
      ) _

      configuredOp = Operation.async(
        steps = addSubSteps,
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

}

