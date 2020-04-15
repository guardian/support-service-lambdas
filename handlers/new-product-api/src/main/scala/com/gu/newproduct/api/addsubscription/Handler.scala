package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.EmailQueueNames.emailQueuesFor
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.digipack.DigipackAddressValidator
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.{GuardianWeeklyDomesticAddressValidator, GuardianWeeklyROWAddressValidator}
import com.gu.newproduct.api.addsubscription.validation.paper.PaperAddressValidator
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora._
import com.gu.newproduct.api.productcatalog.{ContributionPlanId, _}
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
    addPaperSub: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addDigipackSub: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addGuardianWeeklyDomesticSub: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addGuardianWeeklyROWSub: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
  )(
    apiGatewayRequest: ApiGatewayRequest
  ): Future[ApiResponse] = (for {
    request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
    subscriptionName <- request.planId match {
      case _: ContributionPlanId => addContribution(request)
      case _: VoucherPlanId => addPaperSub(request)
      case _: HomeDeliveryPlanId => addPaperSub(request)
      case _: DigipackPlanId => addDigipackSub(request)
      case _: GuardianWeeklyDomestic => addGuardianWeeklyDomesticSub(request)
      case _: GuardianWeeklyRow => addGuardianWeeklyROWSub(request)
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
      zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
      plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraIds.rateplanIdToApiId.get).toApiGatewayOp("get prices from zuora catalog")
      getPricesForPlan = (planId: PlanId) => plansWithPrice.getOrElse(planId, Map.empty)
      catalog = NewProductApi.catalog(getPricesForPlan)

      isValidStartDateForPlan = Function.uncurried(
        catalog.planForId andThen { plan =>
          StartDateValidator.fromRule(validatorFor, plan.startDateRules)
        }
      )
      createSubscription = CreateSubscription(zuoraClient.post[WireCreateRequest, WireSubscription], currentDate) _

      contributionSteps = AddContribution.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        createSubscription,
        awsSQSSend,
        queueNames,
        currentDate
      )

      paperSteps = AddPaperSub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        PaperAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        queueNames
      )

      digipackSteps = AddDigipackSub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        DigipackAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        queueNames,
        currentDate
      )

      guardianWeeklyDomesticStep = AddGuardianWeeklySub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        GuardianWeeklyDomesticAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        queueNames
      )

      guardianWeeklyROWStep = AddGuardianWeeklySub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        GuardianWeeklyROWAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        queueNames
      )

      addSubSteps = handleRequest(
        addContribution = contributionSteps,
        addPaperSub = paperSteps,
        addDigipackSub = digipackSteps,
        addGuardianWeeklyDomesticSub = guardianWeeklyDomesticStep,
        addGuardianWeeklyROWSub = guardianWeeklyROWStep
      ) _

      configuredOp = Operation.async(
        steps = addSubSteps,
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

}

